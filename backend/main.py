import csv
import os
import re
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import quote, urlparse

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY is missing")


REST_URL = f"{SUPABASE_URL}/rest/v1"
AUTH_URL = f"{SUPABASE_URL}/auth/v1"
DEFAULT_FRONTEND_URL = "https://onecroredatapluse.vercel.app"


def resolve_frontend_url(configured_url: Optional[str], hosted: bool = False) -> str:
    frontend_url = (configured_url or DEFAULT_FRONTEND_URL).strip().rstrip("/")
    parsed_url = urlparse(frontend_url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise RuntimeError("FRONTEND_URL must be an absolute http or https URL")
    if hosted and parsed_url.hostname in {"localhost", "127.0.0.1", "::1"}:
        return DEFAULT_FRONTEND_URL
    return frontend_url


IS_HOSTED_DEPLOYMENT = any(
    os.getenv(variable)
    for variable in (
        "RAILWAY_PROJECT_ID",
        "RAILWAY_ENVIRONMENT_ID",
        "RAILWAY_SERVICE_ID",
    )
)
FRONTEND_URL = resolve_frontend_url(os.getenv("FRONTEND_URL"), IS_HOSTED_DEPLOYMENT)
ADMIN_EMAILS = {
    email.strip().lower()
    for email in (
        os.getenv("ADMIN_EMAILS", "") + "," + os.getenv("ADMIN_EMAIL", "")
    ).split(",")
    if email.strip()
}
IMPORT_DIR = Path(__file__).parent / "imports"
IMPORT_DIR.mkdir(exist_ok=True)
MAX_IMPORT_SIZE = 100 * 1024 * 1024
ALLOWED_IMPORT_EXTENSIONS = {".csv", ".xls", ".xlsx"}
import_jobs = {}

IMPORT_HEADER_ALIASES = {
    "name": "name",
    "customer name": "name",
    "phone": "phone",
    "phone number": "phone",
    "customer phone": "phone",
    "address": "address",
    "customer address": "address",
    "email": "email",
    "email address": "email",
    "company": "company",
    "status": "status",
    "notes": "notes",
    "city": "city",
    "state": "state",
    "pin code": "pin_code",
    "pincode": "pin_code",
}

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
if not SUPABASE_KEY.startswith(("sb_secret_", "sb_publishable_")):
    HEADERS["Authorization"] = f"Bearer {SUPABASE_KEY}"


app = FastAPI(
    title="OneCrore Customer Management API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://onecroredatapluse.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    status: str = "Active"
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordUpdateRequest(BaseModel):
    access_token: str
    password: str


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "user"


class RoleUpdate(BaseModel):
    role: str


CUSTOMER_SEARCH_COLUMNS = (
    "id,customer_code,name,phone,address,email,company,status,created_at,updated_at"
)


def normalize_name_query(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value.strip().casefold())
    normalized = normalized.replace("*", "").replace("%", "")
    if len(normalized) < 2 or not any(character.isalnum() for character in normalized):
        raise ValueError("Enter at least 2 letters or numbers for a name search.")
    return normalized


def normalize_phone_query(value: str) -> str:
    normalized = re.sub(r"\D+", "", value)
    if len(normalized) < 3:
        raise ValueError("Enter at least 3 digits for a phone search.")
    return normalized


def resolve_search_field(value: str, requested_field: str) -> Literal["name", "phone"]:
    if requested_field in {"name", "phone"}:
        return requested_field
    return "name" if any(character.isalpha() for character in value) else "phone"


def auth_headers(token: str):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
    }


def resolve_user_role(user: dict) -> str:
    email = (user.get("email") or "").strip().lower()
    if email in ADMIN_EMAILS:
        return "admin"
    role = (user.get("app_metadata") or {}).get("role", "user")
    return role if role in {"admin", "user"} else "user"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required.")

    response = requests.get(
        f"{AUTH_URL}/user",
        headers=auth_headers(credentials.credentials),
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    user = response.json()
    user["role"] = resolve_user_role(user)
    return user


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user


def record_login_event(user: dict) -> bool:
    user_id = user.get("id")
    email = (user.get("email") or "").strip().lower()
    if not user_id or not email:
        return False

    try:
        response = requests.post(
            f"{REST_URL}/login_events",
            headers=HEADERS,
            json={
                "user_id": user_id,
                "user_email": email,
                "user_name": (user.get("user_metadata") or {}).get("name"),
            },
            timeout=5,
        )
        if response.status_code not in (200, 201):
            logger.warning("Unable to record login event (status %s).", response.status_code)
            return False
    except requests.RequestException:
        logger.warning("Unable to record login event due to a Supabase request error.")
        return False
    return True


@app.post("/auth/login")
def login(payload: LoginRequest):
    response = requests.post(
        f"{AUTH_URL}/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": payload.email, "password": payload.password},
        timeout=10,
    )
    if response.status_code != 200:
        try:
            error_data = response.json()
            detail = error_data.get("error_description") or error_data.get("msg") or error_data.get("message")
        except ValueError:
            detail = None
        raise HTTPException(status_code=401, detail=detail or "Invalid email or password.")

    session = response.json()
    user_response = requests.get(
        f"{AUTH_URL}/user",
        headers=auth_headers(session["access_token"]),
        timeout=10,
    )
    user = user_response.json()
    email = (user.get("email") or "").lower()
    role = resolve_user_role(user)
    record_login_event(user)
    return {"access_token": session["access_token"], "user": {"email": email, "role": role}}


@app.post("/auth/signup", status_code=201)
def signup(payload: SignupRequest):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    response = requests.post(
        f"{AUTH_URL}/admin/users",
        headers=HEADERS,
        json={
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": payload.name},
            "app_metadata": {"role": "user"},
        },
        timeout=10,
    )
    if response.status_code not in (200, 201):
        try:
            error_data = response.json()
            detail = error_data.get("msg") or error_data.get("message") or error_data.get("error_description")
        except ValueError:
            detail = None
        detail = detail or "Unable to create account."
        raise HTTPException(status_code=response.status_code, detail=detail)

    return {"message": "Account created. You can sign in now."}


@app.post("/auth/password-reset")
def password_reset(payload: PasswordResetRequest):
    response = requests.post(
        f"{AUTH_URL}/recover",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": payload.email, "redirect_to": FRONTEND_URL},
        timeout=10,
    )
    if response.status_code not in (200, 204):
        raise HTTPException(status_code=400, detail="Unable to start password recovery.")
    return {"message": "If that account exists, password recovery instructions have been sent."}


@app.post("/auth/password-update")
def password_update(payload: PasswordUpdateRequest):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    response = requests.put(
        f"{AUTH_URL}/user",
        headers=auth_headers(payload.access_token) | {"Content-Type": "application/json"},
        json={"password": payload.password},
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Unable to update password. The recovery link may have expired.")
    return {"message": "Password updated. You can sign in now."}


@app.get("/auth/users")
def list_users(_: dict = Depends(require_admin)):
    response = requests.get(
        f"{AUTH_URL}/admin/users",
        headers=HEADERS,
        params={"page": 1, "per_page": 1000},
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return [
        {
            "id": user["id"],
            "name": (user.get("user_metadata") or {}).get("name", ""),
            "email": user.get("email"),
            "role": resolve_user_role(user),
            "created_at": user.get("created_at"),
            "last_sign_in_at": user.get("last_sign_in_at"),
        }
        for user in response.json().get("users", [])
    ]


@app.get("/auth/me")
def get_auth_user(user: dict = Depends(get_current_user)):
    return {
        "id": user.get("id"),
        "name": (user.get("user_metadata") or {}).get("name", ""),
        "email": user.get("email"),
        "role": user.get("role", "user"),
    }


@app.get("/reports/login-activity")
def get_login_activity_report(
    period: Literal["daily", "weekly", "monthly", "all"] = "daily",
    recent_limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(require_admin),
):
    summary_response = requests.post(
        f"{REST_URL}/rpc/login_activity_summary",
        headers=HEADERS,
        json={"p_period": period},
        timeout=10,
    )
    if summary_response.status_code != 200:
        raise HTTPException(
            status_code=503,
            detail="Login reporting is unavailable. Apply the login-events database migration.",
        )

    recent_response = requests.get(
        f"{REST_URL}/login_events",
        headers=HEADERS,
        params={
            "select": "id,user_id,user_email,user_name,occurred_at",
            "order": "occurred_at.desc",
            "limit": str(recent_limit),
        },
        timeout=10,
    )
    if recent_response.status_code != 200:
        raise HTTPException(status_code=503, detail="Unable to load recent login activity.")

    report = summary_response.json()
    report["recent_logins"] = recent_response.json()
    return report


def find_auth_user_by_email(email: str):
    normalized_email = email.strip().casefold()
    per_page = 1000

    for page in range(1, 101):
        response = requests.get(
            f"{AUTH_URL}/admin/users",
            headers=HEADERS,
            params={"page": page, "per_page": per_page},
            timeout=10,
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Unable to check whether the user already exists.",
            )

        users = response.json().get("users", [])
        for user in users:
            if (user.get("email") or "").strip().casefold() == normalized_email:
                return user
        if len(users) < per_page:
            return None

    raise HTTPException(status_code=502, detail="Unable to complete the user lookup.")


def set_auth_user_role(user: dict, role: str):
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=502, detail="Supabase returned a user without an ID.")

    app_metadata = {**(user.get("app_metadata") or {}), "role": role}
    response = requests.put(
        f"{AUTH_URL}/admin/users/{user_id}",
        headers=HEADERS,
        json={"app_metadata": app_metadata},
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to update the user's role.")
    return user_id


@app.post("/auth/users/invite")
def invite_user(payload: InviteRequest, _: dict = Depends(require_admin)):
    if payload.role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be admin or user.")

    existing_user = find_auth_user_by_email(str(payload.email))
    if existing_user:
        user_id = set_auth_user_role(existing_user, payload.role)
        return {
            "id": user_id,
            "email": payload.email,
            "role": payload.role,
            "status": "existing",
            "message": "User already registered. Their role was updated; no new invitation was sent.",
        }

    response = requests.post(
        f"{AUTH_URL}/admin/invite",
        headers=HEADERS,
        json={"email": payload.email},
        timeout=10,
    )
    if response.status_code not in (200, 201):
        # A registration may race the initial lookup. Re-check before returning
        # an invitation error so existing accounts remain idempotent.
        existing_user = find_auth_user_by_email(str(payload.email))
        if existing_user:
            user_id = set_auth_user_role(existing_user, payload.role)
            return {
                "id": user_id,
                "email": payload.email,
                "role": payload.role,
                "status": "existing",
                "message": "User already registered. Their role was updated; no new invitation was sent.",
            }
        raise HTTPException(status_code=400, detail="Unable to send the invitation.")

    invited_user = response.json().get("user") or response.json()
    user_id = set_auth_user_role(invited_user, payload.role)

    return {
        "id": user_id,
        "email": payload.email,
        "role": payload.role,
        "status": "invited",
        "message": "Invitation sent.",
    }


@app.patch("/auth/users/{user_id}/role")
def update_user_role(user_id: str, payload: RoleUpdate, _: dict = Depends(require_admin)):
    if payload.role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be admin or user.")

    response = requests.put(
        f"{AUTH_URL}/admin/users/{user_id}",
        headers=HEADERS,
        json={"app_metadata": {"role": payload.role}},
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return {"id": user_id, "role": payload.role}


def update_import_job(job_id, **updates):
    import_jobs[job_id] = {
        **import_jobs[job_id],
        **updates,
    }


def normalize_import_header(value):
    header = re.sub(r"\s+", " ", str(value or "").replace("_", " ")).strip().lower()
    return IMPORT_HEADER_ALIASES.get(header, header.replace(" ", "_"))


def normalize_import_value(value):
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return re.sub(r"\s+", " ", str(value)).strip()


def validate_import_headers(headers):
    normalized = {normalize_import_header(header) for header in headers if header is not None}
    if not {"name", "phone"}.issubset(normalized):
        raise ValueError(
            "The file must include Customer Name and Customer Phone columns "
            "(or name and phone)."
        )


def normalize_import_row(row):
    normalized = {
        normalize_import_header(key): normalize_import_value(value)
        for key, value in row.items()
        if value is not None
    }
    address_parts = [
        normalized.pop(key, "")
        for key in ("address", "city", "state", "pin_code")
    ]
    address = ", ".join(part for part in address_parts if part)
    if address:
        normalized["address"] = address
    return normalized


def read_import_rows(file_path: Path, extension: str):
    if extension == ".csv":
        with file_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            if not reader.fieldnames:
                raise ValueError("The file must include a header row.")
            validate_import_headers(reader.fieldnames)
            return [normalize_import_row(row) for row in reader]

    if extension == ".xls":
        import xlrd

        workbook = xlrd.open_workbook(file_path, on_demand=True)
        sheet = workbook.sheet_by_index(0)
        headers = sheet.row_values(0)
        validate_import_headers(headers)
        rows = [
            normalize_import_row(dict(zip(headers, sheet.row_values(row_index))))
            for row_index in range(1, sheet.nrows)
        ]
        workbook.release_resources()
        return rows

    from openpyxl import load_workbook

    workbook = load_workbook(file_path, read_only=True, data_only=True)
    sheet = workbook.active
    values = list(sheet.values)
    workbook.close()
    if not values:
        raise ValueError("The file must include a header row.")
    headers = values[0]
    validate_import_headers(headers)
    return [
        normalize_import_row(dict(zip(headers, row)))
        for row in values[1:]
    ]


def find_duplicate(customer, duplicate_keys):
    for key in duplicate_keys:
        value = customer.get(key)
        if not value:
            continue
        response = requests.get(
            f"{REST_URL}/customers?{key}=eq.{quote(value, safe='')}&select=id",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code != 200:
            raise ValueError(f"Unable to check duplicate {key}: {response.text}")
        data = response.json()
        if data:
            return data[0]["id"]
    return None


def import_customers(job_id: str, file_path: Path, extension: str, import_mode: str, duplicate_keys: str):
    processed = 0
    invalid = 0
    created = 0
    updated = 0
    skipped = 0

    try:
        rows = read_import_rows(file_path, extension)
        if not rows:
            raise ValueError("The file must include at least one customer row.")

        selected_keys = [key.strip() for key in duplicate_keys.split(",") if key.strip()]
        allowed_fields = {"name", "email", "phone", "address", "company", "status", "notes"}

        for row in rows:
            processed += 1
            customer = {key: row[key] for key in allowed_fields if row.get(key)}
            if not customer.get("name") or not customer.get("phone"):
                invalid += 1
                continue

            customer_id = find_duplicate(customer, selected_keys)
            if customer_id and import_mode == "new":
                skipped += 1
                continue

            if customer_id:
                response = requests.patch(
                    f"{REST_URL}/customers?id=eq.{quote(str(customer_id), safe='')}",
                    headers=HEADERS,
                    json=customer,
                    timeout=10,
                )
                updated += 1
            else:
                response = requests.post(
                    f"{REST_URL}/customers",
                    headers=HEADERS,
                    json=customer,
                    timeout=10,
                )
                created += 1

            if response.status_code not in (200, 201, 204):
                raise ValueError(response.text)

            update_import_job(
                job_id,
                processed=processed,
                invalid=invalid,
                progress=round(processed / len(rows) * 100),
            )

        update_import_job(
            job_id,
            status="ready",
            processed=processed,
            invalid=invalid,
            created=created,
            updated=updated,
            skipped=skipped,
            progress=100,
            message=f"Import complete: {created} added, {updated} updated, {skipped} skipped.",
        )
    except Exception as error:
        update_import_job(job_id, status="failed", message=str(error))
    finally:
        file_path.unlink(missing_ok=True)


@app.post("/imports/customers", status_code=202)
async def upload_customers(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    import_mode: str = Form("update"),
    duplicate_keys: str = Form("phone,email"),
    _: dict = Depends(require_admin),
):
    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_IMPORT_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only CSV, XLS, and XLSX files are supported.")

    job_id = str(uuid.uuid4())
    destination = IMPORT_DIR / f"{job_id}{extension}"
    total_bytes = 0

    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_IMPORT_SIZE:
                    raise HTTPException(status_code=413, detail="The upload must be smaller than 100 MB.")
                output.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    import_jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "size": total_bytes,
        "import_mode": import_mode,
        "duplicate_keys": duplicate_keys,
        "status": "processing",
        "processed": 0,
        "invalid": 0,
        "progress": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "message": "File uploaded. Validating rows...",
    }
    background_tasks.add_task(
        import_customers,
        job_id,
        destination,
        extension,
        import_mode,
        duplicate_keys,
    )

    return import_jobs[job_id]


@app.get("/imports/{job_id}")
def get_import_job(job_id: str, _: dict = Depends(get_current_user)):
    job = import_jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")

    return job


@app.get("/")
def root():
    return {
        "message": "OneCrore Customer Management API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/customers")
def get_customers(
    limit: int = Query(25, ge=1, le=50),
    _: dict = Depends(get_current_user),
):
    response = requests.get(
        f"{REST_URL}/customers",
        headers=HEADERS,
        params={
            "select": CUSTOMER_SEARCH_COLUMNS,
            "order": "id.asc",
            "limit": str(limit),
        },
        timeout=10,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    return response.json()


@app.get("/customers/search")
def search_customers(
    q: str = Query(..., max_length=100),
    field: Literal["auto", "name", "phone"] = "auto",
    limit: int = Query(25, ge=1, le=50),
    cursor: Optional[int] = Query(None, ge=0),
    _: dict = Depends(get_current_user),
):
    resolved_field = resolve_search_field(q, field)
    try:
        normalized_query = (
            normalize_phone_query(q)
            if resolved_field == "phone"
            else normalize_name_query(q)
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    params = {
        "select": CUSTOMER_SEARCH_COLUMNS,
        "order": "id.asc",
        "limit": str(limit + 1),
    }
    if cursor is not None:
        params["id"] = f"gt.{cursor}"
    if resolved_field == "phone":
        params["normalized_phone"] = f"like.{normalized_query}*"
    else:
        params["normalized_name"] = f"ilike.*{normalized_query}*"

    response = requests.get(
        f"{REST_URL}/customers",
        headers=HEADERS,
        params=params,
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    rows = response.json()
    has_more = len(rows) > limit
    items = rows[:limit]
    return {
        "items": items,
        "next_cursor": items[-1]["id"] if has_more and items else None,
        "field": resolved_field,
        "query": normalized_query,
        "limit": limit,
    }


@app.get("/customers/{customer_id}")
def get_customer(customer_id: int, _: dict = Depends(get_current_user)):
    response = requests.get(
        f"{REST_URL}/customers?id=eq.{customer_id}&select=*",
        headers=HEADERS,
        timeout=10,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return data[0]


@app.post("/customers", status_code=201)
def create_customer(customer: CustomerCreate, _: dict = Depends(require_admin)):
    response = requests.post(
        f"{REST_URL}/customers",
        headers=HEADERS,
        json=customer.model_dump(),
        timeout=10,
    )

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()

    return data[0] if data else {
        "message": "Customer created"
    }


@app.put("/customers/{customer_id}")
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    _: dict = Depends(require_admin),
):
    payload = customer.model_dump(
        exclude_none=True
    )

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No fields supplied",
        )

    response = requests.patch(
        f"{REST_URL}/customers?id=eq.{customer_id}",
        headers=HEADERS,
        json=payload,
        timeout=10,
    )

    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return data[0]


@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, _: dict = Depends(require_admin)):
    response = requests.delete(
        f"{REST_URL}/customers?id=eq.{customer_id}",
        headers=HEADERS,
        timeout=10,
    )

    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    return {
        "message": "Customer deleted successfully"
    }
