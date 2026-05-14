from typing import List, Optional, Literal

from pydantic import BaseModel, Field


class Address(BaseModel):
    village: Optional[str] = None
    post: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class StructuredSkill(BaseModel):
    category: str
    skill: str


class UserOut(BaseModel):
    id: str
    phone_primary: Optional[str] = None
    phone_verified: Optional[bool] = False
    name: str
    role: str
    pincode: Optional[str] = None
    village: Optional[str] = None
    address: Optional[Address] = None
    photo_url: Optional[str] = None
    preferred_language: Optional[str] = "en"
    avatar_color: Optional[str] = None
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: Optional[str] = None


# ============ PHONE-FIRST OTP SCHEMAS ============

class SendOTPRequest(BaseModel):
    """Step 1: User provides phone number"""
    phone: str = Field(..., pattern=r'^\+91[0-9]{10}$', description="Phone with +91 prefix")


class SendOTPResponse(BaseModel):
    """Response: OTP sent, token for verification"""
    otp_token: str
    expires_in: int = 900
    message: str = "OTP sent successfully"
    otp_code: Optional[str] = None       # Only when SHOW_OTP_IN_RESPONSE=true
    requires_optin: bool = False          # True in sandbox — user must message the bot first


class VerifyOTPRequest(BaseModel):
    """Step 2: User provides OTP received"""
    phone: str = Field(..., pattern=r'^\+91[0-9]{10}$')
    otp: str = Field(..., pattern=r'^[0-9]{6}$', description="6-digit OTP")


class VerifyOTPResponse(BaseModel):
    """Response: OTP verified, ready for profile completion"""
    otp_token: str
    created_user: bool


class SignupCompleteRequest(BaseModel):
    """Step 3: Complete signup with name + role"""
    name: str = Field(..., min_length=2, max_length=100)
    role: Literal["worker", "customer"]
    password: Optional[str] = Field(None, min_length=8, description="Optional - OTP auth supported")
    preferred_language: Optional[str] = "en"


class WorkerProfileIn(BaseModel):
    skills: Optional[List[str]] = Field(default_factory=list)
    daily_rate: Optional[int] = None
    bio: Optional[str] = ""
    village: Optional[str] = None
    district: Optional[str] = ""
    state: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    available: bool = True
    structured_skills: Optional[List[StructuredSkill]] = Field(default_factory=list)
    address: Optional[Address] = None
    availability_status: Optional[Literal["available", "not_available"]] = None


class WorkerOut(BaseModel):
    id: str
    user_id: str
    name: str
    skills: Optional[List[str]] = Field(default_factory=list)
    daily_rate: Optional[int] = None
    bio: Optional[str] = ""
    village: Optional[str] = None
    district: Optional[str] = ""
    state: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    available: bool = True
    trust_tier: int
    avg_rating: float
    total_jobs: int
    photo_url: Optional[str] = None
    structured_skills: List[StructuredSkill] = Field(default_factory=list)
    address: Optional[Address] = None
    last_active_at: Optional[str] = None
    availability_status: Optional[str] = None


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
    required_skills: List[StructuredSkill] = Field(default_factory=list)
    address: Optional[Address] = None
    urgency: Literal["urgent", "normal"] = "normal"


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
    required_skills: List[StructuredSkill] = Field(default_factory=list)
    address: Optional[Address] = None
    urgency: Optional[str] = "normal"
    filled_count: Optional[int] = 0
    accepted_worker_ids: List[str] = Field(default_factory=list)




class BookingIn(BaseModel):
    job_id: str
    worker_id: str


class EngagementIn(BaseModel):
    job_id: str
    worker_id: Optional[str] = None


class RatingIn(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = ""


class WaitlistIn(BaseModel):
    phone: str = Field(..., pattern=r'^\+91[0-9]{10}$')
    name: Optional[str] = ""
    role: Optional[str] = "customer"


class WhatsAppMessageIn(BaseModel):
    session_id: str
    message: str
