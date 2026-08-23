import csv
import os
import re
import smtplib
import uuid
import logging
import threading
import time
import io
from collections import defaultdict, deque
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import quote, urlparse

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import StreamingResponse
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


def resolve_frontend_url(
    configured_url: Optional[str], allow_loopback: bool = False
) -> str:
    frontend_url = (configured_url or DEFAULT_FRONTEND_URL).strip().rstrip("/")
    parsed_url = urlparse(frontend_url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise RuntimeError("FRONTEND_URL must be an absolute http or https URL")
    if not allow_loopback and parsed_url.hostname in {"localhost", "127.0.0.1", "::1"}:
        return DEFAULT_FRONTEND_URL
    return frontend_url


ALLOW_LOCAL_RECOVERY_REDIRECT = os.getenv(
    "ALLOW_LOCAL_RECOVERY_REDIRECT", ""
).strip().lower() in {"1", "true", "yes"}
FRONTEND_URL = resolve_frontend_url(
    os.getenv("FRONTEND_URL"), ALLOW_LOCAL_RECOVERY_REDIRECT
)
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
    "whatsapp": "whatsapp_phone",
    "whatsapp number": "whatsapp_phone",
    "whatsapp phone": "whatsapp_phone",
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
    whatsapp_phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    status: str = "Active"
    notes: Optional[str] = None
    sms_opt_in: bool = False
    whatsapp_opt_in: bool = False
    email_opt_in: bool = False


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    sms_opt_in: Optional[bool] = None
    whatsapp_opt_in: Optional[bool] = None
    email_opt_in: Optional[bool] = None


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


class ProfileUpdateRequest(BaseModel):
    name: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "user"


class RoleUpdate(BaseModel):
    role: str


class FollowUpCreate(BaseModel):
    customer_id: int
    subject: str
    notes: Optional[str] = None
    due_at: datetime
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    channel: Literal["call", "meeting", "whatsapp", "email", "other"] = "call"


class FollowUpUpdate(BaseModel):
    subject: Optional[str] = None
    notes: Optional[str] = None
    due_at: Optional[datetime] = None
    priority: Optional[Literal["low", "normal", "high", "urgent"]] = None
    channel: Optional[Literal["call", "meeting", "whatsapp", "email", "other"]] = None


class FollowUpStatusUpdate(BaseModel):
    status: Literal["open", "completed"]


class CampaignCreate(BaseModel):
    name: str
    channel: Literal["sms", "whatsapp", "email"]
    audience: str
    message: str
    scheduled_at: Optional[datetime] = None


CUSTOMER_SEARCH_COLUMNS = (
    "id,customer_code,name,phone,address,email,company,status,created_at,updated_at"
)
FOLLOW_UP_SELECT = (
    "id,user_id,customer_id,subject,notes,due_at,priority,channel,status,"
    "completed_at,created_at,updated_at,customer:customers(id,name,phone,email,address)"
)
CAMPAIGN_SELECT = "id,user_id,name,channel,audience,message,status,scheduled_at,created_at,updated_at"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER).strip()
SIGNUP_RATE_LIMIT = int(os.getenv("SIGNUP_RATE_LIMIT_PER_MINUTE", "500"))
SIGNUP_EMAIL_LIMIT = int(os.getenv("SIGNUP_RATE_LIMIT_PER_EMAIL", "3"))
SIGNUP_RATE_WINDOW_SECONDS = 60


class SignupRateLimiter:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "").strip()
        self.redis_client = None
        self.local_events = defaultdict(deque)
        self.lock = threading.Lock()
        if self.redis_url:
            try:
                import redis

                self.redis_client = redis.Redis.from_url(
                    self.redis_url, decode_responses=True
                )
            except ImportError:
                logger.warning("Redis client is unavailable; using local signup limits.")

    def _allow_local(self, key: str, limit: int, now: float) -> tuple[bool, int]:
        with self.lock:
            events = self.local_events[key]
            cutoff = now - SIGNUP_RATE_WINDOW_SECONDS
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(events[0] + SIGNUP_RATE_WINDOW_SECONDS - now))
                return False, retry_after
            events.append(now)
            return True, 0

    def allow(self, ip_address: str, email: str) -> tuple[bool, int]:
        now = time.time()
        if not self.redis_url:
            ip_allowed, retry_after = self._allow_local(
                f"ip:{ip_address}", SIGNUP_RATE_LIMIT, now
            )
            if not ip_allowed:
                return False, retry_after
            return self._allow_local(
                f"email:{email}", SIGNUP_EMAIL_LIMIT, now
            )

        try:
            if self.redis_client is None:
                return self._allow_local(f"ip:{ip_address}", SIGNUP_RATE_LIMIT, now)

            pipe = self.redis_client.pipeline()
            keys = [f"onecrore:signup:ip:{ip_address}", f"onecrore:signup:email:{email}"]
            for key, limit in zip(keys, (SIGNUP_RATE_LIMIT, SIGNUP_EMAIL_LIMIT)):
                pipe.incr(key)
                pipe.expire(key, SIGNUP_RATE_WINDOW_SECONDS)
            ip_count, _, email_count, _ = pipe.execute()
            if ip_count > SIGNUP_RATE_LIMIT or email_count > SIGNUP_EMAIL_LIMIT:
                return False, SIGNUP_RATE_WINDOW_SECONDS
            return True, 0
        except Exception:
            logger.exception("Signup rate limiter unavailable; using local fallback.")
            return self._allow_local(f"ip:{ip_address}", SIGNUP_RATE_LIMIT, now)


signup_rate_limiter = SignupRateLimiter()


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


def prepare_follow_up_payload(values: dict) -> dict:
    payload = dict(values)
    if "subject" in payload:
        subject = re.sub(r"\s+", " ", str(payload["subject"] or "")).strip()
        if not subject:
            raise HTTPException(status_code=422, detail="Follow-up subject is required.")
        if len(subject) > 160:
            raise HTTPException(status_code=422, detail="Follow-up subject must be 160 characters or fewer.")
        payload["subject"] = subject

    if "notes" in payload:
        notes = re.sub(r"\s+", " ", str(payload["notes"] or "")).strip()
        if len(notes) > 5000:
            raise HTTPException(status_code=422, detail="Follow-up notes must be 5,000 characters or fewer.")
        payload["notes"] = notes or None

    if "due_at" in payload:
        due_at = payload["due_at"]
        if due_at.tzinfo is None or due_at.utcoffset() is None:
            raise HTTPException(status_code=422, detail="Follow-up due date must include a timezone.")
        payload["due_at"] = due_at.astimezone(timezone.utc).isoformat()

    return payload


def raise_follow_up_api_error(response, fallback: str):
    if response.status_code == 404 and "follow_ups" in response.text:
        raise HTTPException(
            status_code=503,
            detail="Follow-ups are not configured. Apply the follow-up database migration.",
        )
    raise HTTPException(status_code=502, detail=fallback)


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


def get_user_name(user: dict) -> str:
    metadata = user.get("user_metadata") or user.get("raw_user_meta_data") or {}
    return str(metadata.get("name") or "").strip()


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
                "user_name": get_user_name(user) or None,
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


def raise_signup_api_error(response):
    if response.status_code == 429:
        retry_after = response.headers.get("Retry-After")
        headers = {"Retry-After": retry_after} if retry_after else None
        raise HTTPException(
            status_code=429,
            detail="Signup is temporarily rate-limited. Please try again shortly.",
            headers=headers,
        )

    try:
        error_data = response.json()
        detail = error_data.get("msg") or error_data.get("message") or error_data.get("error_description")
    except ValueError:
        detail = None
    raise HTTPException(
        status_code=response.status_code,
        detail=detail or "Unable to create account.",
    )


def login(payload: LoginRequest, background_tasks: Optional[BackgroundTasks] = None):
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
    if user_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to load the signed-in user.")
    user = user_response.json()
    email = (user.get("email") or "").lower()
    role = resolve_user_role(user)
    if background_tasks is None:
        record_login_event(user)
    else:
        background_tasks.add_task(record_login_event, user)
    return {
        "access_token": session["access_token"],
        "user": {
            "id": user.get("id"),
            "name": get_user_name(user),
            "email": email,
            "role": role,
        },
    }


@app.post("/auth/login")
def login_endpoint(payload: LoginRequest, background_tasks: BackgroundTasks):
    return login(payload, background_tasks)


@app.post("/auth/signup", status_code=201)
def signup_endpoint(payload: SignupRequest, request: Request):
    ip_address = request.client.host if request.client else "unknown"
    allowed, retry_after = signup_rate_limiter.allow(
        ip_address, payload.email.strip().casefold()
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many signup attempts. Please try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )
    return signup(payload)


def signup(payload: SignupRequest):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")

    response = requests.post(
        f"{AUTH_URL}/admin/users",
        headers=HEADERS,
        json={
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": name},
            "app_metadata": {"role": "user"},
        },
        timeout=10,
    )
    if response.status_code not in (200, 201):
        raise_signup_api_error(response)

    created_user = response.json().get("user") or response.json()
    user_id = created_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=502,
            detail="Account was created, but Supabase did not return a user ID.",
        )

    # Some Auth deployments accept the metadata in the create request but do
    # not persist it. Apply and verify it explicitly before reporting success.
    user_metadata = {**(created_user.get("user_metadata") or {}), "name": name}
    metadata_response = requests.put(
        f"{AUTH_URL}/admin/users/{user_id}",
        headers=HEADERS,
        json={"user_metadata": user_metadata},
        timeout=10,
    )
    updated_user = (
        metadata_response.json().get("user") or metadata_response.json()
        if metadata_response.status_code == 200
        else {}
    )
    if metadata_response.status_code != 200 or get_user_name(updated_user) != name:
        if metadata_response.status_code == 429:
            raise_signup_api_error(metadata_response)
        raise HTTPException(
            status_code=502,
            detail="Account was created, but the name could not be saved. Contact an administrator.",
        )

    return {"message": "Account created. You can sign in now."}


@app.post("/auth/password-reset")
def password_reset(payload: PasswordResetRequest):
    response = requests.post(
        f"{AUTH_URL}/recover",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": payload.email, "redirect_to": FRONTEND_URL},
        timeout=10,
    )
    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Too many recovery emails were requested. Please wait before trying again.",
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


def serialize_auth_user(user: dict, admin: dict):
    return {
        "id": user["id"],
        "name": get_user_name(user),
        "email": user.get("email"),
        "role": resolve_user_role(user),
        "created_at": user.get("created_at"),
        "last_sign_in_at": user.get("last_sign_in_at"),
        "is_current": user["id"] == admin.get("id"),
    }


def auth_user_matches(user: dict, query: str):
    searchable_values = (get_user_name(user), user.get("email") or "")
    return any(query in value.casefold() for value in searchable_values)


@app.get("/auth/users")
def list_users(q: str = "", _: dict = Depends(require_admin)):
    query = q.strip().casefold()
    if query and len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="Enter at least 2 characters to search registered customers.",
        )
    if len(query) > 200:
        raise HTTPException(status_code=400, detail="Search is too long.")

    per_page = 1000
    search_limit = 100
    matched_users = []

    for page in range(1, 101):
        response = requests.get(
            f"{AUTH_URL}/admin/users",
            headers=HEADERS,
            params={"page": page, "per_page": per_page},
            timeout=10,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        users = response.json().get("users", [])
        if not query:
            return [serialize_auth_user(user, _) for user in users]

        matched_users.extend(user for user in users if auth_user_matches(user, query))
        if len(matched_users) >= search_limit or len(users) < per_page:
            break

    return [serialize_auth_user(user, _) for user in matched_users[:search_limit]]


@app.get("/auth/me")
def get_auth_user(user: dict = Depends(get_current_user)):
    return {
        "id": user.get("id"),
        "name": get_user_name(user),
        "email": user.get("email"),
        "role": user.get("role", "user"),
    }


@app.patch("/auth/me")
def update_auth_user_profile(
    payload: ProfileUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: dict = Depends(get_current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    if len(name) > 100:
        raise HTTPException(status_code=400, detail="Name must be 100 characters or fewer.")

    metadata = {**(user.get("user_metadata") or {}), "name": name}
    response = requests.put(
        f"{AUTH_URL}/user",
        headers=auth_headers(credentials.credentials) | {"Content-Type": "application/json"},
        json={"data": metadata},
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to update your profile.")

    updated_user = response.json().get("user") or response.json()
    if get_user_name(updated_user) != name:
        raise HTTPException(status_code=502, detail="Profile updated, but the saved name could not be verified.")

    return {
        "id": updated_user.get("id") or user.get("id"),
        "name": name,
        "email": updated_user.get("email") or user.get("email"),
        "role": user.get("role", "user"),
        "message": "Profile updated.",
    }


@app.post("/auth/password-change")
def change_auth_user_password(
    payload: PasswordChangeRequest,
    user: dict = Depends(get_current_user),
):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="Choose a new password that is different from your current password.")

    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Your account does not have an email address.")

    login_response = requests.post(
        f"{AUTH_URL}/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": payload.current_password},
        timeout=10,
    )
    if login_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    fresh_access_token = login_response.json().get("access_token")
    if not fresh_access_token:
        raise HTTPException(status_code=502, detail="Unable to verify your current password.")

    update_response = requests.put(
        f"{AUTH_URL}/user",
        headers=auth_headers(fresh_access_token) | {"Content-Type": "application/json"},
        json={"password": payload.new_password},
        timeout=10,
    )
    if update_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to update your password.")

    return {"message": "Password updated successfully."}


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


def csv_download(filename: str, headers: list[str], rows: list[list[object]]):
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/reports/login-activity/export")
def export_login_activity(
    period: Literal["daily", "weekly", "monthly", "all"] = "daily",
    _: dict = Depends(require_admin),
):
    params = {
        "select": "id,user_name,user_email,occurred_at",
        "order": "occurred_at.desc",
        "limit": "10000",
    }
    if period != "all":
        days = {"daily": 1, "weekly": 7, "monthly": 31}[period]
        since = datetime.now(timezone.utc).timestamp() - days * 86400
        params["occurred_at"] = f"gte.{datetime.fromtimestamp(since, timezone.utc).isoformat()}"

    response = requests.get(
        f"{REST_URL}/login_events", headers=HEADERS, params=params, timeout=20
    )
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Unable to export login activity.")
    rows = response.json()
    return csv_download(
        f"onecrore-login-activity-{period}.csv",
        ["User", "Email", "Login time", "Event ID"],
        [[row.get("user_name") or "", row.get("user_email") or "", row.get("occurred_at") or "", row.get("id") or ""] for row in rows],
    )


@app.get("/auth/users/export")
def export_registered_users(_: dict = Depends(require_admin)):
    exported_users = []
    for page in range(1, 101):
        response = requests.get(
            f"{AUTH_URL}/admin/users",
            headers=HEADERS,
            params={"page": page, "per_page": 1000},
            timeout=20,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=503, detail="Unable to export registered users.")
        users = response.json().get("users", [])
        exported_users.extend(users)
        if len(users) < 1000:
            break

    return csv_download(
        "onecrore-registered-users.csv",
        ["Name", "Email", "Created at", "Last sign-in", "Role", "User ID"],
        [[get_user_name(user), user.get("email") or "", user.get("created_at") or "", user.get("last_sign_in_at") or "", resolve_user_role(user), user.get("id") or ""] for user in exported_users],
    )


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


@app.delete("/auth/users/{user_id}")
def delete_auth_user(user_id: uuid.UUID, admin: dict = Depends(require_admin)):
    user_id_string = str(user_id)
    if user_id_string == admin.get("id"):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own administrator account.",
        )

    response = requests.delete(
        f"{AUTH_URL}/admin/users/{user_id_string}",
        headers=HEADERS,
        timeout=10,
    )
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="User not found.")
    if response.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail="Unable to delete the user account.")

    return {"id": user_id_string, "message": "User account deleted."}


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
        allowed_fields = {"name", "email", "phone", "whatsapp_phone", "address", "company", "status", "notes"}

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


@app.get("/campaigns")
def list_campaigns(user: dict = Depends(require_admin)):
    user_id = user.get("id")
    response = requests.get(
        f"{REST_URL}/campaigns",
        headers=HEADERS,
        params={
            "select": CAMPAIGN_SELECT,
            "user_id": f"eq.{quote(str(user_id or ''), safe='')}",
            "order": "created_at.desc,id.desc",
            "limit": "100",
        },
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return {"items": response.json()}


@app.get("/campaigns/audience-count")
def campaign_audience_count(
    channel: Literal["sms", "whatsapp", "email"],
    audience: str = Query("All opted-in customers", max_length=120),
    _: dict = Depends(require_admin),
):
    consent_field = {"sms": "sms_opt_in", "whatsapp": "whatsapp_opt_in", "email": "email_opt_in"}[channel]
    params = {consent_field: "eq.true", "select": "id", "limit": "1"}
    response = requests.get(
        f"{REST_URL}/customers",
        headers={**HEADERS, "Prefer": "count=exact"},
        params=params,
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    content_range = response.headers.get("Content-Range", "*/0")
    count = int(content_range.split("/")[-1]) if content_range.split("/")[-1].isdigit() else 0
    return {"channel": channel, "audience": audience, "count": count}


@app.post("/campaigns", status_code=201)
def create_campaign(payload: CampaignCreate, user: dict = Depends(require_admin)):
    name = payload.name.strip()
    audience = payload.audience.strip()
    message = payload.message.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Campaign name is required.")
    if not audience:
        raise HTTPException(status_code=422, detail="Choose an audience.")
    if not message:
        raise HTTPException(status_code=422, detail="Campaign message is required.")
    values = {
        "user_id": user.get("id"),
        "name": name,
        "channel": payload.channel,
        "audience": audience,
        "message": message,
        "scheduled_at": payload.scheduled_at.isoformat() if payload.scheduled_at else None,
        "status": "draft",
    }
    response = requests.post(
        f"{REST_URL}/campaigns",
        headers=HEADERS,
        params={"select": CAMPAIGN_SELECT},
        json=values,
        timeout=10,
    )
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=response.status_code, detail=response.text)
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=502, detail="Campaign was created without a response record.")
    return rows[0]


def _send_twilio_message(destination: str, message: str):
    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
        auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
        data={"From": TWILIO_FROM_NUMBER, "To": destination, "Body": message},
        timeout=15,
    )
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="The messaging provider rejected a recipient.")


def _send_email(destination: str, subject: str, message: str):
    email = EmailMessage()
    email["From"] = EMAIL_FROM
    email["To"] = destination
    email["Subject"] = subject
    email.set_content(message)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(email)


@app.post("/campaigns/{campaign_id}/send")
def send_campaign(campaign_id: int, user: dict = Depends(require_admin)):
    campaign_response = requests.get(
        f"{REST_URL}/campaigns",
        headers=HEADERS,
        params={"id": f"eq.{campaign_id}", "user_id": f"eq.{quote(str(user.get('id') or ''), safe='')}", "select": CAMPAIGN_SELECT, "limit": "1"},
        timeout=10,
    )
    if campaign_response.status_code != 200:
        raise HTTPException(status_code=campaign_response.status_code, detail=campaign_response.text)
    campaigns = campaign_response.json()
    if not campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    campaign = campaigns[0]
    provider_ready = (
        bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER)
        if campaign["channel"] in {"sms", "whatsapp"}
        else bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD and EMAIL_FROM)
    )
    if not provider_ready:
        raise HTTPException(status_code=503, detail=f"{campaign['channel'].title()} provider is not configured on the backend.")

    consent_field = {"sms": "sms_opt_in", "whatsapp": "whatsapp_opt_in", "email": "email_opt_in"}[campaign["channel"]]
    contact_field = {"sms": "phone", "whatsapp": "whatsapp_phone", "email": "email"}[campaign["channel"]]
    recipients_response = requests.get(
        f"{REST_URL}/customers",
        headers=HEADERS,
        params={consent_field: "eq.true", f"{contact_field}": "not.is.null", "select": contact_field, "limit": "1000"},
        timeout=10,
    )
    if recipients_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to load opted-in campaign recipients.")
    recipients = [row.get(contact_field) for row in recipients_response.json() if row.get(contact_field)]
    if not recipients:
        raise HTTPException(status_code=422, detail="No opted-in recipients have a contact value for this channel.")

    sent = 0
    for recipient in recipients:
        destination = f"whatsapp:{recipient}" if campaign["channel"] == "whatsapp" else recipient
        if campaign["channel"] in {"sms", "whatsapp"}:
            _send_twilio_message(destination, campaign["message"])
        else:
            _send_email(recipient, campaign["name"], campaign["message"])
        sent += 1

    requests.patch(
        f"{REST_URL}/campaigns",
        headers=HEADERS,
        params={"id": f"eq.{campaign_id}", "user_id": f"eq.{quote(str(user.get('id') or ''), safe='')}"},
        json={"status": "sent", "updated_at": datetime.now(timezone.utc).isoformat()},
        timeout=10,
    )
    return {"id": campaign_id, "status": "sent", "sent": sent}


@app.get("/follow-ups")
def list_follow_ups(
    state: Literal["upcoming", "overdue", "completed", "all"] = "upcoming",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user ID is unavailable.")

    now = datetime.now(timezone.utc).isoformat()
    params = {
        "select": FOLLOW_UP_SELECT,
        "user_id": f"eq.{quote(str(user_id), safe='')}",
        "limit": str(limit + 1),
        "offset": str(offset),
    }
    if state == "upcoming":
        params.update({"status": "eq.open", "due_at": f"gte.{now}", "order": "due_at.asc,id.asc"})
    elif state == "overdue":
        params.update({"status": "eq.open", "due_at": f"lt.{now}", "order": "due_at.asc,id.asc"})
    elif state == "completed":
        params.update({"status": "eq.completed", "order": "completed_at.desc,id.desc"})
    else:
        params["order"] = "due_at.asc,id.asc"

    response = requests.get(
        f"{REST_URL}/follow_ups",
        headers=HEADERS,
        params=params,
        timeout=10,
    )
    if response.status_code != 200:
        raise_follow_up_api_error(response, "Unable to load follow-ups.")

    rows = response.json()
    has_more = len(rows) > limit
    return {
        "items": rows[:limit],
        "state": state,
        "next_offset": offset + limit if has_more else None,
    }


@app.post("/follow-ups", status_code=201)
def create_follow_up(payload: FollowUpCreate, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user ID is unavailable.")
    if payload.customer_id < 1:
        raise HTTPException(status_code=422, detail="Select a valid customer.")

    customer_response = requests.get(
        f"{REST_URL}/customers",
        headers=HEADERS,
        params={
            "select": "id,name,phone,email,address",
            "id": f"eq.{payload.customer_id}",
            "limit": "1",
        },
        timeout=10,
    )
    if customer_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Unable to verify the selected customer.")
    customers = customer_response.json()
    if not customers:
        raise HTTPException(status_code=404, detail="Selected customer was not found.")

    values = prepare_follow_up_payload(payload.model_dump(exclude={"customer_id"}))
    response = requests.post(
        f"{REST_URL}/follow_ups",
        headers=HEADERS,
        json={
            **values,
            "customer_id": payload.customer_id,
            "user_id": user_id,
        },
        timeout=10,
    )
    if response.status_code not in (200, 201):
        raise_follow_up_api_error(response, "Unable to create the follow-up.")

    rows = response.json()
    if not rows:
        raise HTTPException(status_code=502, detail="Follow-up was created without a response record.")
    return {**rows[0], "customer": customers[0]}


@app.patch("/follow-ups/{follow_up_id}")
def update_follow_up(
    follow_up_id: int,
    payload: FollowUpUpdate,
    user: dict = Depends(get_current_user),
):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(status_code=400, detail="No follow-up fields were supplied.")
    values = prepare_follow_up_payload(values)
    values["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = requests.patch(
        f"{REST_URL}/follow_ups",
        headers=HEADERS,
        params={
            "id": f"eq.{follow_up_id}",
            "user_id": f"eq.{quote(str(user.get('id') or ''), safe='')}",
            "select": FOLLOW_UP_SELECT,
        },
        json=values,
        timeout=10,
    )
    if response.status_code not in (200, 204):
        raise_follow_up_api_error(response, "Unable to update the follow-up.")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Follow-up not found.")
    return rows[0]


@app.patch("/follow-ups/{follow_up_id}/status")
def update_follow_up_status(
    follow_up_id: int,
    payload: FollowUpStatusUpdate,
    user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()
    values = {
        "status": payload.status,
        "completed_at": now if payload.status == "completed" else None,
        "updated_at": now,
    }
    response = requests.patch(
        f"{REST_URL}/follow_ups",
        headers=HEADERS,
        params={
            "id": f"eq.{follow_up_id}",
            "user_id": f"eq.{quote(str(user.get('id') or ''), safe='')}",
            "select": FOLLOW_UP_SELECT,
        },
        json=values,
        timeout=10,
    )
    if response.status_code not in (200, 204):
        raise_follow_up_api_error(response, "Unable to update follow-up status.")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Follow-up not found.")
    return rows[0]


@app.delete("/follow-ups/{follow_up_id}")
def delete_follow_up(follow_up_id: int, user: dict = Depends(get_current_user)):
    response = requests.delete(
        f"{REST_URL}/follow_ups",
        headers=HEADERS,
        params={
            "id": f"eq.{follow_up_id}",
            "user_id": f"eq.{quote(str(user.get('id') or ''), safe='')}",
            "select": "id",
        },
        timeout=10,
    )
    if response.status_code not in (200, 204):
        raise_follow_up_api_error(response, "Unable to delete the follow-up.")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Follow-up not found.")
    return {"id": follow_up_id, "message": "Follow-up deleted."}


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
