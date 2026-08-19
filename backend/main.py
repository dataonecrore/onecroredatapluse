import os
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
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