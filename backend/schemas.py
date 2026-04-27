from typing import List, Optional, Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Literal["worker", "customer"] = "customer"
    village: Optional[str] = None
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    village: Optional[str] = None
    phone: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class WorkerProfileIn(BaseModel):
    skills: List[str]
    daily_rate: int
    bio: Optional[str] = ""
    village: str
    district: Optional[str] = ""
    state: Optional[str] = ""
    lat: float
    lng: float
    available: bool = True


class WorkerOut(BaseModel):
    id: str
    user_id: str
    name: str
    skills: List[str]
    daily_rate: int
    bio: str
    village: str
    district: str
    state: str
    lat: float
    lng: float
    available: bool
    trust_tier: int
    avg_rating: float
    total_jobs: int
    photo_url: Optional[str] = None


class JobIn(BaseModel):
    title: str
    category: str
    description: str
    workers_needed: int = 1
    daily_rate: int
    job_date: str
    village: str
    lat: float
    lng: float


class JobOut(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    title: str
    category: str
    description: str
    workers_needed: int
    daily_rate: int
    job_date: str
    village: str
    lat: float
    lng: float
    status: str
    created_at: str


class BookingIn(BaseModel):
    job_id: str
    worker_id: str


class RatingIn(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = ""


class WaitlistIn(BaseModel):
    email: EmailStr
    name: Optional[str] = ""
    role: Optional[str] = "customer"


class WhatsAppMessageIn(BaseModel):
    session_id: str
    message: str
