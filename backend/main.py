import csv
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY is missing")


REST_URL = f"{SUPABASE_URL}/rest/v1"
IMPORT_DIR = Path(__file__).parent / "imports"
IMPORT_DIR.mkdir(exist_ok=True)
MAX_IMPORT_SIZE = 100 * 1024 * 1024
ALLOWED_IMPORT_EXTENSIONS = {".csv", ".xlsx"}
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


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str = "Active"
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def update_import_job(job_id, **updates):
    import_jobs[job_id] = {
        **import_jobs[job_id],
        **updates,
    }


def inspect_import_file(job_id: str, file_path: Path, extension: str):
    processed = 0
    invalid = 0

    try:
        if extension == ".csv":
            with file_path.open("r", encoding="utf-8-sig", newline="") as file:
                rows = csv.DictReader(file)
                headers = {header.strip().lower() for header in (rows.fieldnames or [])}

                if not {"name", "email"}.issubset(headers):
                    raise ValueError("The file must include name and email columns.")

                for row in rows:
                    processed += 1
                    normalized_row = {
                        str(key).strip().lower(): value for key, value in row.items()
                    }
                    if not normalized_row.get("name") or not normalized_row.get("email"):
                        invalid += 1
        else:
            from openpyxl import load_workbook

            workbook = load_workbook(file_path, read_only=True, data_only=True)
            sheet = workbook.active
            rows = sheet.iter_rows(values_only=True)
            header_row = next(rows, [])
            headers = [str(value).strip().lower() if value is not None else "" for value in header_row]

            if not {"name", "email"}.issubset(headers):
                raise ValueError("The file must include name and email columns.")

            name_index = headers.index("name")
            email_index = headers.index("email")
            for row in rows:
                processed += 1
                if len(row) <= max(name_index, email_index) or not row[name_index] or not row[email_index]:
                    invalid += 1
            workbook.close()

        update_import_job(
            job_id,
            status="ready",
            processed=processed,
            invalid=invalid,
            progress=100,
            message="File validated and staged. Database import is ready for the next step.",
        )
    except Exception as error:
        update_import_job(job_id, status="failed", message=str(error))


@app.post("/imports/customers", status_code=202)
async def upload_customers(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    import_mode: str = Form("update"),
    duplicate_keys: str = Form("phone,email"),
):
    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_IMPORT_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported.")

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
    background_tasks.add_task(inspect_import_file, job_id, destination, extension)

    return import_jobs[job_id]


@app.get("/imports/{job_id}")
def get_import_job(job_id: str):
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
def get_customers():
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
def get_customer(customer_id: str):
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
def create_customer(customer: CustomerCreate):
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
def delete_customer(customer_id: str):
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