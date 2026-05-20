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
    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$")


class Certification(BaseModel):
    id: str
    skill: str = Field(..., max_length=80)
    cert_name: str = Field(..., max_length=120)
    cert_url: str
    issued_by: Optional[str] = Field(None, max_length=120)
    year: Optional[int] = None
    verified: bool = False
    verified_at: Optional[str] = None


class PortfolioItem(BaseModel):
    id: str
    image_url: str
    caption: Optional[str] = Field(None, max_length=100)
    created_at: str


class SkillBadge(BaseModel):
    id: str
    label: str = Field(..., max_length=80)
    label_hi: str = Field(..., max_length=80)
    icon: str = Field(..., max_length=40)
    earned_at: str


class ProgressUpdate(BaseModel):
    id: str
    status: Literal["on_the_way", "arrived", "in_progress", "done"]
    note: Optional[str] = Field(None, max_length=200)
    photo_url: Optional[str] = None
    created_at: str


class UserOut(BaseModel):
    id: str
    phone_primary: Optional[str] = None
    phone_verified: Optional[bool] = False
    name: str
    role: Optional[str] = None
    is_worker: bool = False
    is_customer: bool = True
    has_worker_profile: Optional[bool] = False
    gender: Optional[Literal["male", "female", "other"]] = None
    pincode: Optional[str] = None
    village: Optional[str] = None
    address: Optional[Address] = None
    photo_url: Optional[str] = None
    preferred_language: Optional[str] = "en"
    avatar_color: Optional[str] = None
    created_at: Optional[str] = None
    is_active: Optional[bool] = True
    deleted_at: Optional[str] = None
    migration_status: Optional[str] = None
    push_token: Optional[str] = None
    saved_workers: List[str] = Field(default_factory=list)
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    referral_count: int = 0
    wallet_balance: int = 0
    saved_addresses: List[SavedAddress] = Field(default_factory=list)
    emergency_contact: Optional[EmergencyContact] = None
    tc_accepted_at: Optional[str] = None
    tc_version: str = "1.0"
    selfie_verified: bool = False
    posthog_id: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: Optional[str] = None


# ============ PHONE-FIRST OTP SCHEMAS ============


class SendOTPRequest(BaseModel):
    """Step 1: User provides phone number"""

    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$", description="Phone with +91 prefix")


class SendOTPResponse(BaseModel):
    """Response: OTP sent, token for verification"""

    otp_token: str
    expires_in: int = 900
    message: str = "OTP sent successfully"
    otp_code: Optional[str] = None  # Only when SHOW_OTP_IN_RESPONSE=true
    requires_optin: bool = False  # True in sandbox — user must message the bot first


class VerifyOTPRequest(BaseModel):
    """Step 2: User provides OTP received"""

    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$")
    otp: str = Field(..., pattern=r"^[0-9]{6}$", description="6-digit OTP")


class VerifyOTPResponse(BaseModel):
    """Response: OTP verified, ready for profile completion"""

    otp_token: str
    created_user: bool


class SignupCompleteRequest(BaseModel):
    """Step 3: Complete signup with name."""

    name: str = Field(..., min_length=2, max_length=100)
    gender: Optional[Literal["male", "female", "other"]] = None
    password: Optional[str] = Field(None, min_length=8, description="Optional - OTP auth supported")
    preferred_language: Optional[str] = "en"


class WorkerProfileIn(BaseModel):
    skills: Optional[List[str]] = Field(default_factory=list)
    daily_rate: Optional[int] = None
    bio: Optional[str] = Field("", max_length=500)
    village: Optional[str] = None
    district: Optional[str] = ""
    state: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    available: bool = True
    structured_skills: Optional[List[StructuredSkill]] = Field(default_factory=list)
    address: Optional[Address] = None
    availability_status: Optional[
        Literal["available", "not_available", "flagged", "restricted"]
    ] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    certifications: List[Certification] = Field(default_factory=list)
    portfolio: List[PortfolioItem] = Field(default_factory=list, max_length=6)
    response_time_minutes: Optional[int] = None
    available_from: Optional[str] = None
    team_size: int = 1
    is_kyc_verified: bool = False
    kyc_doc_type: Optional[Literal["aadhaar", "driving_licence", "voter_id"]] = None
    kyc_verified_at: Optional[str] = None
    monthly_cancellations: int = 0
    cancellation_warned_at: Optional[str] = None
    video_url: Optional[str] = None
    is_available_now: bool = False
    available_now_expires_at: Optional[str] = None
    skill_badges: List[SkillBadge] = Field(default_factory=list)


class WorkerOut(BaseModel):
    id: str
    user_id: str
    name: str
    skills: Optional[List[str]] = Field(default_factory=list)
    daily_rate: Optional[int] = None
    bio: Optional[str] = Field("", max_length=500)
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
    gender: Optional[str] = None
    certifications: List[Certification] = Field(default_factory=list)
    portfolio: List[PortfolioItem] = Field(default_factory=list)
    response_time_minutes: Optional[int] = None
    available_from: Optional[str] = None
    team_size: int = 1
    is_kyc_verified: bool = False
    kyc_doc_type: Optional[str] = None
    kyc_verified_at: Optional[str] = None
    monthly_cancellations: int = 0
    cancellation_warned_at: Optional[str] = None
    video_url: Optional[str] = None
    is_available_now: bool = False
    available_now_expires_at: Optional[str] = None
    skill_badges: List[SkillBadge] = Field(default_factory=list)


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
    recurrence: str = "once"
    is_template: bool = False
    template_name: Optional[str] = None
    photo_url: Optional[str] = None
    ai_generated: bool = False
    is_anonymous: bool = False


class BookingIn(BaseModel):
    job_id: str
    worker_id: str


class EngagementIn(BaseModel):
    job_id: str
    worker_id: Optional[str] = None


class RatingIn(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field("", max_length=500)
    image_urls: List[str] = Field(default_factory=list)


class MessageIn(BaseModel):
    engagement_id: str
    text: Optional[str] = Field(None, max_length=2000)
    image_url: Optional[str] = None
    voice_url: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    engagement_id: str
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
    engagement_id: Optional[str] = None
    reason: Literal["fraud", "no_show", "abuse", "fake_profile", "other"]
    details: Optional[str] = Field(None, max_length=500)


class ReportOut(BaseModel):
    id: str
    reporter_id: str
    reported_user_id: str
    engagement_id: Optional[str] = None
    reason: str
    details: Optional[str] = None
    status: str = "pending"
    created_at: str
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    admin_note: Optional[str] = None


class PaymentOrderOut(BaseModel):
    id: str
    engagement_id: str
    amount: int
    razorpay_order_id: str
    status: str = "created"


class PaymentVerifyIn(BaseModel):
    engagement_id: str
    razorpay_order_id: str = Field(..., max_length=120)
    razorpay_payment_id: str = Field(..., max_length=120)
    razorpay_signature: str = Field(..., max_length=256)


class BecomeWorkerIn(BaseModel):
    skills: List[str] = Field(default_factory=list)
    structured_skills: List[StructuredSkill] = Field(default_factory=list)
    daily_rate: int
    pincode: str = Field(..., pattern=r"^[0-9]{6}$")
    lat: Optional[float] = None
    lng: Optional[float] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    bio: Optional[str] = Field("", max_length=500)


class WaitlistIn(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[0-9]{10}$")
    name: Optional[str] = ""
    role: Optional[str] = "user"


class WhatsAppMessageIn(BaseModel):
    session_id: str
    message: str
