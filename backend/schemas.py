from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class Address(BaseModel):
    village: Optional[str] = Field(None, max_length=80)
    post: Optional[str] = Field(None, max_length=80)
    block: Optional[str] = Field(None, max_length=80)
    district: Optional[str] = Field(None, max_length=80)
    state: Optional[str] = Field(None, max_length=80)
    pincode: Optional[str] = Field(None, pattern=r"^[0-9]{6}$")


class StructuredSkill(BaseModel):
    category: str = Field(..., max_length=80)
    skill: str = Field(..., max_length=80)


class SavedAddress(BaseModel):
    id: str
    label: str = Field(..., max_length=40)
    address: Address
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default: bool = False


class EmergencyContact(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=14)


class UserOut(BaseModel):
    id: str
    phone_primary: Optional[str] = None
    phone_verified: Optional[bool] = False
    name: str
    gender: Optional[Literal["male", "female", "other"]] = None
    pincode: Optional[str] = None
    village: Optional[str] = None
    address: Optional[Address] = None
    photo_url: Optional[str] = None
    preferred_language: Optional[str] = "en"
    avatar_color: Optional[str] = None
    created_at: Optional[str] = None
    is_active: Optional[bool] = True
    push_token: Optional[str] = None
    saved_users: List[str] = Field(default_factory=list)
    saved_jobs: List[str] = Field(default_factory=list)
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    referral_count: int = 0
    wallet_balance: int = 0
    saved_addresses: List[SavedAddress] = Field(default_factory=list)
    emergency_contact: Optional[EmergencyContact] = None
    tc_accepted_at: Optional[str] = None
    tc_version: str = "1.0"
    selfie_verified: bool = False
    has_service_profile: bool = False
    bio: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: Optional[str] = None


class SendOTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$")


class SendOTPResponse(BaseModel):
    otp_token: str
    expires_in: int = 900
    message: str = "OTP sent successfully"
    otp_code: Optional[str] = None
    requires_optin: bool = False


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$")
    otp: str = Field(..., pattern=r"^[0-9]{6}$")


class VerifyOTPResponse(BaseModel):
    otp_token: str
    created_user: bool


class SignupCompleteRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    gender: Optional[Literal["male", "female", "other"]] = None
    password: Optional[str] = Field(None, min_length=8)
    preferred_language: Optional[str] = "en"


class JobIn(BaseModel):
    title: str = Field(..., max_length=120)
    category: str = Field(..., max_length=80)
    description: str = Field(..., max_length=1000)
    workers_needed: int = 1
    daily_rate: int
    job_date: str
    village: str = Field(..., max_length=80)
    lat: float
    lng: float
    required_skills: List[StructuredSkill] = Field(default_factory=list)
    address: Optional[Address] = None
    urgency: Literal["normal", "urgent", "asap"] = "normal"
    recurrence: Literal["once", "weekly", "monthly"] = "once"
    is_template: bool = False
    template_name: Optional[str] = Field(None, max_length=60)
    photo_url: Optional[str] = None
    ai_generated: bool = False
    is_anonymous: bool = False

    @field_validator("job_date")
    @classmethod
    def validate_job_date(cls, value: str) -> str:
        if date.fromisoformat(value) < date.today():
            raise ValueError("Job date cannot be in the past")
        return value


class JobOut(BaseModel):
    id: str
    posted_by_user_id: Optional[str] = None
    posted_by_name: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    daily_rate: Optional[int] = None
    workers_needed: Optional[int] = 1
    job_date: Optional[str] = None
    village: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = "open"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    required_skills: List[StructuredSkill] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    address: Optional[Address] = None
    urgency: Optional[str] = "normal"
    selected_request_id: Optional[str] = None
    selected_user_id: Optional[str] = None
    photo_url: Optional[str] = None


class PaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class MessageIn(BaseModel):
    work_request_id: Optional[str] = None
    text: Optional[str] = Field(None, max_length=2000)
    image_url: Optional[str] = None
    voice_url: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    work_request_id: str
    sender_id: str
    receiver_id: str
    text: Optional[str] = None
    image_url: Optional[str] = None
    voice_url: Optional[str] = None
    read: bool = False
    read_at: Optional[str] = None
    created_at: str


class ReportIn(BaseModel):
    reported_user_id: str
    work_request_id: Optional[str] = None
    reason: Literal["fraud", "no_show", "abuse", "fake_profile", "other"]
    details: Optional[str] = Field(None, max_length=500)


class ReportOut(BaseModel):
    id: str
    reporter_id: str
    reported_user_id: str
    work_request_id: Optional[str] = None
    reason: str
    details: Optional[str] = None
    status: str = "pending"
    created_at: str
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    admin_note: Optional[str] = None


class WaitlistIn(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$")
    name: Optional[str] = ""
    role: Optional[str] = "user"


class WhatsAppMessageIn(BaseModel):
    session_id: str
    message: str
