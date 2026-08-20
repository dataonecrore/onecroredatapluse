import csv
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
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

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


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


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
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


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "user"


class RoleUpdate(BaseModel):
    role: str


def auth_headers(token: str):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
    }


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
    metadata = user.get("app_metadata") or {}
    email = (user.get("email") or "").lower()
    user["role"] = metadata.get("role", "admin" if email in ADMIN_EMAILS else "user")
    return user


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user


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
    metadata = user.get("app_metadata") or {}
    email = (user.get("email") or "").lower()
    role = metadata.get("role", "admin" if email in ADMIN_EMAILS else "user")
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
        json={"email": payload.email},
        timeout=10,
    )
    if response.status_code not in (200, 204):
        raise HTTPException(status_code=400, detail="Unable to start password recovery.")
    return {"message": "If that account exists, password recovery instructions have been sent."}


@app.get("/auth/users")
def list_users(_: dict = Depends(require_admin)):
    response = requests.get(
        f"{AUTH_URL}/admin/users",
        headers=HEADERS,
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return [
        {"id": user["id"], "email": user.get("email"), "role": (user.get("app_metadata") or {}).get("role", "user")}
        for user in response.json().get("users", [])
    ]


@app.post("/auth/users/invite", status_code=201)
def invite_user(payload: InviteRequest, _: dict = Depends(require_admin)):
    if payload.role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be admin or user.")

    response = requests.post(
        f"{AUTH_URL}/admin/invite",
        headers=HEADERS,
        json={"email": payload.email},
        timeout=10,
    )
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=response.status_code, detail=response.text)

    invited_user = response.json().get("user") or response.json()
    user_id = invited_user.get("id")
    if user_id:
        role_response = requests.put(
            f"{AUTH_URL}/admin/users/{user_id}",
            headers=HEADERS,
            json={"app_metadata": {"role": payload.role}},
            timeout=10,
        )
        if role_response.status_code != 200:
            raise HTTPException(status_code=role_response.status_code, detail=role_response.text)

    return {"email": payload.email, "role": payload.role, "message": "Invitation sent."}


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


def normalize_import_row(row):
    return {
        str(key).strip().lower(): str(value).strip()
        for key, value in row.items()
        if value is not None
    }


def read_import_rows(file_path: Path, extension: str):
    if extension == ".csv":
        with file_path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            if not reader.fieldnames:
                raise ValueError("The file must include a header row.")
            return [normalize_import_row(row) for row in reader]

    if extension == ".xls":
        import xlrd

        workbook = xlrd.open_workbook(file_path, on_demand=True)
        sheet = workbook.sheet_by_index(0)
        headers = [str(value).strip().lower() for value in sheet.row_values(0)]
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
    headers = [str(value).strip().lower() if value is not None else "" for value in values[0]]
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
        if not rows or not {"name", "email"}.issubset(rows[0]):
            raise ValueError("The file must include name and email columns.")

        selected_keys = [key.strip() for key in duplicate_keys.split(",") if key.strip()]
        allowed_fields = {"name", "email", "phone", "address", "company", "status", "notes"}

        for row in rows:
            processed += 1
            customer = {key: row[key] for key in allowed_fields if row.get(key)}
            if not customer.get("name") or not customer.get("email"):
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
def get_customers(_: dict = Depends(get_current_user)):
    response = requests.get(
        f"{REST_URL}/customers?select=*&order=created_at.desc",
        headers=HEADERS,
        timeout=10,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    return response.json()


@app.get("/customers/{customer_id}")
def get_customer(customer_id: str, _: dict = Depends(get_current_user)):
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
    customer_id: str,
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
def delete_customer(customer_id: str, _: dict = Depends(require_admin)):
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