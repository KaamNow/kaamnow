from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# --- Mongo ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- App ---
app = FastAPI(title="KaamNow API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


# --- Helpers ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=JWT_EXPIRY_DAYS * 24 * 3600,
        path="/",
    )


# --- Models ---
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
    email: str
    name: str
    role: str
    village: Optional[str] = None
    phone: Optional[str] = None


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
    category: str  # farm, construction, home, other
    description: str
    workers_needed: int = 1
    daily_rate: int
    job_date: str  # ISO date
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


# --- Auth Endpoints ---
@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "village": body.village,
        "phone": body.phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, email)
    set_auth_cookie(response, token)
    return {
        "user": {k: doc[k] for k in ["id", "email", "name", "role", "village", "phone"]},
        "token": token,
    }


@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], email)
    set_auth_cookie(response, token)
    return {
        "user": {k: user.get(k) for k in ["id", "email", "name", "role", "village", "phone"]},
        "token": token,
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {k: user.get(k) for k in ["id", "email", "name", "role", "village", "phone"]}


# --- Workers ---
@api_router.post("/workers/profile", response_model=WorkerOut)
async def upsert_worker_profile(body: WorkerProfileIn, user: dict = Depends(get_current_user)):
    if user["role"] != "worker":
        raise HTTPException(403, "Only workers can create worker profiles")
    existing = await db.workers.find_one({"user_id": user["id"]})
    base = body.model_dump()
    base["user_id"] = user["id"]
    base["name"] = user["name"]
    if existing:
        await db.workers.update_one({"id": existing["id"]}, {"$set": base})
        worker = await db.workers.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        worker_id = str(uuid.uuid4())
        new_doc = {
            "id": worker_id,
            **base,
            "trust_tier": 1,
            "avg_rating": 0.0,
            "total_jobs": 0,
            "photo_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.workers.insert_one(new_doc)
        worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    return worker


@api_router.get("/workers", response_model=List[WorkerOut])
async def list_workers(skill: Optional[str] = None, q: Optional[str] = None, available_only: bool = False):
    query = {}
    if skill:
        query["skills"] = {"$in": [skill]}
    if available_only:
        query["available"] = True
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"village": {"$regex": q, "$options": "i"}},
            {"skills": {"$regex": q, "$options": "i"}},
        ]
    workers = await db.workers.find(query, {"_id": 0}).limit(200).to_list(200)
    workers.sort(key=lambda w: (-w.get("avg_rating", 0), -w.get("trust_tier", 0)))
    return workers


@api_router.get("/workers/{worker_id}", response_model=WorkerOut)
async def get_worker(worker_id: str):
    worker = await db.workers.find_one({"id": worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(404, "Worker not found")
    return worker


@api_router.get("/workers/me/profile")
async def my_worker_profile(user: dict = Depends(get_current_user)):
    worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
    return worker  # may be None


# --- Jobs ---
@api_router.post("/jobs", response_model=JobOut)
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    job_id = str(uuid.uuid4())
    doc = {
        "id": job_id,
        "customer_id": user["id"],
        "customer_name": user["name"],
        **body.model_dump(),
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.jobs.insert_one(doc)
    return {k: doc[k] for k in JobOut.model_fields.keys()}


@api_router.get("/jobs", response_model=List[JobOut])
async def list_jobs(category: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return jobs


@api_router.get("/jobs/mine", response_model=List[JobOut])
async def my_jobs(user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs


@api_router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# --- Bookings ---
@api_router.post("/bookings")
async def create_booking(body: BookingIn, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": body.job_id})
    worker = await db.workers.find_one({"id": body.worker_id})
    if not job or not worker:
        raise HTTPException(404, "Job or worker not found")
    booking_id = str(uuid.uuid4())
    doc = {
        "id": booking_id,
        "job_id": body.job_id,
        "worker_id": body.worker_id,
        "customer_id": user["id"],
        "worker_name": worker["name"],
        "customer_name": user["name"],
        "job_title": job["title"],
        "job_date": job["job_date"],
        "daily_rate": job["daily_rate"],
        "status": "pending",
        "rating": None,
        "comment": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/bookings/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    if user["role"] == "worker":
        worker = await db.workers.find_one({"user_id": user["id"]}, {"_id": 0})
        if not worker:
            return []
        bookings = await db.bookings.find({"worker_id": worker["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        bookings = await db.bookings.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings


@api_router.post("/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(404, "Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed"}})
    return {"ok": True}


@api_router.post("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, user: dict = Depends(get_current_user)):
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "completed"}})
    return {"ok": True}


@api_router.post("/bookings/rate")
async def rate_booking(body: RatingIn, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": body.booking_id})
    if not booking:
        raise HTTPException(404, "Booking not found")
    await db.bookings.update_one(
        {"id": body.booking_id},
        {"$set": {"rating": body.rating, "comment": body.comment, "status": "completed"}},
    )
    # Recalculate worker average rating
    pipeline = [
        {"$match": {"worker_id": booking["worker_id"], "rating": {"$ne": None}}},
        {"$group": {"_id": "$worker_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.bookings.aggregate(pipeline).to_list(1)
    if agg:
        await db.workers.update_one(
            {"id": booking["worker_id"]},
            {"$set": {"avg_rating": round(agg[0]["avg"], 2), "total_jobs": agg[0]["count"]}},
        )
    return {"ok": True}


# --- Waitlist ---
@api_router.post("/waitlist")
async def join_waitlist(body: WaitlistIn):
    doc = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "name": body.name or "",
        "role": body.role or "customer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.waitlist.insert_one(doc)
    except Exception:
        pass
    return {"ok": True}


# --- Stats (public) ---
@api_router.get("/stats")
async def stats():
    workers_count = await db.workers.count_documents({})
    jobs_count = await db.jobs.count_documents({})
    bookings_count = await db.bookings.count_documents({"status": "completed"})
    villages = await db.workers.distinct("village")
    return {
        "workers": workers_count,
        "jobs": jobs_count,
        "completed_bookings": bookings_count,
        "villages": len(villages),
    }


# --- Simulated WhatsApp Bot ---
class WhatsAppMsg(BaseModel):
    session_id: str
    message: str


def bot_reply(state: dict, message: str) -> tuple[str, dict]:
    """Returns (reply_text, new_state)"""
    msg = message.strip().lower()
    step = state.get("step", "start")

    if msg in ("reset", "restart", "menu"):
        return ("Namaste! Welcome to KaamNow.\n\n1️⃣ I need workers (kaam karwana hai)\n2️⃣ I am a worker (kaam chahiye)\n\nReply 1 or 2.", {"step": "intent"})

    if step == "start":
        return ("Namaste! Welcome to KaamNow 🙏\n\n1️⃣ I need workers\n2️⃣ I am a worker looking for jobs\n\nReply 1 or 2.", {"step": "intent"})

    if step == "intent":
        if msg == "1":
            return ("Great! What type of work?\n\n1. Farm work (खेत)\n2. Construction (निर्माण)\n3. Home services (सफाई/शिफ्टिंग)\n4. Other", {"step": "category"})
        if msg == "2":
            return ("Welcome worker! Please register on KaamNow at /signup to start receiving job alerts. Reply 'menu' to restart.", {"step": "start"})
        return ("Please reply 1 or 2.", state)

    if step == "category":
        cats = {"1": "Farm work", "2": "Construction", "3": "Home services", "4": "Other"}
        if msg in cats:
            state["category"] = cats[msg]
            return (f"Got it: {cats[msg]}.\n\nHow many workers do you need? (1-20)", {**state, "step": "count"})
        return ("Please reply 1, 2, 3, or 4.", state)

    if step == "count":
        try:
            n = int(msg)
            if 1 <= n <= 20:
                state["count"] = n
                return (f"{n} workers noted.\n\nWhen do you need them?\n1. Today\n2. Tomorrow\n3. Day after", {**state, "step": "date"})
        except ValueError:
            pass
        return ("Please send a number between 1 and 20.", state)

    if step == "date":
        labels = {"1": "Today", "2": "Tomorrow", "3": "Day after"}
        if msg in labels:
            state["when"] = labels[msg]
            return ("Which village or area? (Type village name)", {**state, "step": "village"})
        return ("Reply 1, 2 or 3.", state)

    if step == "village":
        state["village"] = message.strip()
        sample = [
            ("Ramesh Kumar", 4.8, 450, 2),
            ("Mohan Lal", 4.5, 400, 3),
            ("Suresh Yadav", 4.6, 420, 4),
        ]
        lines = [f"✅ Found 3 workers near {state['village']}:\n"]
        for i, (n, r, p, d) in enumerate(sample, 1):
            lines.append(f"{i}. {n} • ⭐ {r} • ₹{p}/day • {d}km away")
        lines.append("\nReply with numbers (e.g. '1,2') to book.")
        return ("\n".join(lines), {**state, "step": "select"})

    if step == "select":
        return (f"🎉 Booking request sent! Workers will confirm within 15 minutes for your {state.get('category','job')} on {state.get('when','your selected day')} in {state.get('village','your village')}.\n\nReply 'menu' to start a new request.", {"step": "start"})

    return ("Reply 'menu' to start over.", {"step": "start"})


@api_router.post("/whatsapp/message")
async def whatsapp_message(body: WhatsAppMsg):
    state_doc = await db.bot_sessions.find_one({"session_id": body.session_id})
    state = state_doc["state"] if state_doc else {"step": "start"}
    reply, new_state = bot_reply(state, body.message)
    await db.bot_sessions.update_one(
        {"session_id": body.session_id},
        {"$set": {"session_id": body.session_id, "state": new_state, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"reply": reply, "state": new_state}


# --- Seed Data ---
SEED_VILLAGES = [
    {"name": "Pratapgarh", "lat": 25.8920, "lng": 81.9440, "district": "Pratapgarh", "state": "UP"},
    {"name": "Wardha", "lat": 20.7453, "lng": 78.6022, "district": "Wardha", "state": "Maharashtra"},
    {"name": "Muzaffarpur", "lat": 26.1209, "lng": 85.3647, "district": "Muzaffarpur", "state": "Bihar"},
    {"name": "Hoshangabad", "lat": 22.7440, "lng": 77.7242, "district": "Hoshangabad", "state": "MP"},
    {"name": "Jodhpur", "lat": 26.2389, "lng": 73.0243, "district": "Jodhpur", "state": "Rajasthan"},
]

SEED_WORKERS = [
    {"name": "Ramesh Kumar", "skills": ["mason", "construction"], "rate": 500, "tier": 3, "rating": 4.8, "jobs": 47, "bio": "20 years experience as raj mistri. Specialized in brick work and plastering."},
    {"name": "Sunita Devi", "skills": ["farm work", "harvesting"], "rate": 320, "tier": 2, "rating": 4.6, "jobs": 32, "bio": "Experienced agricultural worker. SHG verified. Cotton picking, weeding, transplanting."},
    {"name": "Chhotu Yadav", "skills": ["painting", "shifting", "helper"], "rate": 400, "tier": 2, "rating": 4.7, "jobs": 28, "bio": "Multi-skill helper. Painting, light electrical, furniture shifting."},
    {"name": "Mohan Lal", "skills": ["mason", "tile work"], "rate": 480, "tier": 3, "rating": 4.5, "jobs": 51, "bio": "Mason with tiling specialty. Worked on 30+ houses."},
    {"name": "Geeta Bai", "skills": ["farm work", "weeding"], "rate": 280, "tier": 2, "rating": 4.4, "jobs": 19, "bio": "Wardha-based farm labourer, available all seasons."},
    {"name": "Suresh Sharma", "skills": ["plumbing", "electrical"], "rate": 550, "tier": 3, "rating": 4.9, "jobs": 63, "bio": "Licensed plumber + basic electrical. Quick response."},
    {"name": "Rakesh Singh", "skills": ["driver", "helper"], "rate": 450, "tier": 2, "rating": 4.3, "jobs": 22, "bio": "Tractor and small commercial vehicle driver."},
    {"name": "Lakshmi Devi", "skills": ["cleaning", "cooking"], "rate": 300, "tier": 2, "rating": 4.6, "jobs": 38, "bio": "Domestic help, cooking and cleaning. SHG vouched."},
    {"name": "Anil Mahto", "skills": ["digging", "helper"], "rate": 380, "tier": 1, "rating": 4.2, "jobs": 14, "bio": "Strong helper for digging, loading, unloading."},
    {"name": "Pooja Kumari", "skills": ["farm work", "harvesting", "transplanting"], "rate": 290, "tier": 2, "rating": 4.5, "jobs": 25, "bio": "Skilled harvest worker, fast and reliable."},
    {"name": "Vinod Yadav", "skills": ["mason", "construction", "concrete"], "rate": 520, "tier": 3, "rating": 4.7, "jobs": 44, "bio": "Concrete and RCC specialist mason."},
    {"name": "Hari Prasad", "skills": ["painting", "whitewashing"], "rate": 420, "tier": 2, "rating": 4.4, "jobs": 31, "bio": "House painter, distemper and emulsion."},
    {"name": "Kamla Devi", "skills": ["farm work", "cleaning"], "rate": 270, "tier": 2, "rating": 4.3, "jobs": 17, "bio": "Available for farm and household work."},
    {"name": "Deepak Kumar", "skills": ["electrical", "fan repair"], "rate": 500, "tier": 3, "rating": 4.8, "jobs": 56, "bio": "Village electrician, all wiring and repair work."},
    {"name": "Munni Bai", "skills": ["sweeping", "helper"], "rate": 250, "tier": 1, "rating": 4.0, "jobs": 11, "bio": "New on KaamNow. Looking for daily work."},
    {"name": "Rajesh Bhai", "skills": ["welding", "iron work"], "rate": 600, "tier": 3, "rating": 4.9, "jobs": 72, "bio": "Welder. Gates, grills, agricultural implements."},
    {"name": "Babita Devi", "skills": ["farm work"], "rate": 260, "tier": 2, "rating": 4.2, "jobs": 13, "bio": "Reliable farm worker, small landholders preferred."},
    {"name": "Shyam Lal", "skills": ["carpentry", "helper"], "rate": 470, "tier": 2, "rating": 4.5, "jobs": 26, "bio": "Carpenter for windows, doors, basic furniture."},
]

SEED_JOBS = [
    {"title": "Need 4 workers for cotton harvesting", "category": "farm", "description": "4 workers needed for 2 days of cotton harvesting in 3 acre farm.", "workers_needed": 4, "rate": 350, "village_idx": 1},
    {"title": "Mason for boundary wall", "category": "construction", "description": "Looking for an experienced mason to build a 60ft boundary wall over the next week.", "workers_needed": 1, "rate": 500, "village_idx": 0},
    {"title": "House painting (3 rooms)", "category": "construction", "description": "Painting 3 rooms - white plus accent wall. Materials provided.", "workers_needed": 2, "rate": 420, "village_idx": 2},
    {"title": "Wheat harvest helpers", "category": "farm", "description": "5 workers needed for 1 day of wheat harvesting.", "workers_needed": 5, "rate": 320, "village_idx": 3},
    {"title": "Plumbing repair", "category": "home", "description": "Bathroom tap and pipe repair, half-day work.", "workers_needed": 1, "rate": 550, "village_idx": 4},
]


async def seed_data():
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.workers.create_index("user_id")
        await db.workers.create_index("skills")
        await db.jobs.create_index("customer_id")
        await db.bookings.create_index("worker_id")
        await db.bookings.create_index("customer_id")
    except Exception as e:
        logger.warning(f"Index creation: {e}")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kaamnow.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "village": None,
            "phone": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Demo customer
    cust_email = "customer@kaamnow.com"
    cust = await db.users.find_one({"email": cust_email})
    if not cust:
        cust_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": cust_id,
            "email": cust_email,
            "password_hash": hash_password("customer123"),
            "name": "Mahesh Patel",
            "role": "customer",
            "village": "Hoshangabad",
            "phone": "9876543210",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        cust_id = cust["id"]

    # Demo worker user
    worker_email = "worker@kaamnow.com"
    w_user = await db.users.find_one({"email": worker_email})
    if not w_user:
        w_user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": w_user_id,
            "email": worker_email,
            "password_hash": hash_password("worker123"),
            "name": "Ramesh Kumar",
            "role": "worker",
            "village": "Pratapgarh",
            "phone": "9876501234",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Seed worker profiles
    if await db.workers.count_documents({}) == 0:
        photos = [
            "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/12921278/pexels-photo-12921278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/29858623/pexels-photo-29858623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
        ]
        for i, w in enumerate(SEED_WORKERS):
            v = SEED_VILLAGES[i % len(SEED_VILLAGES)]
            doc = {
                "id": str(uuid.uuid4()),
                "user_id": str(uuid.uuid4()),  # synthetic
                "name": w["name"],
                "skills": w["skills"],
                "daily_rate": w["rate"],
                "bio": w["bio"],
                "village": v["name"],
                "district": v["district"],
                "state": v["state"],
                "lat": v["lat"] + random.uniform(-0.05, 0.05),
                "lng": v["lng"] + random.uniform(-0.05, 0.05),
                "available": True,
                "trust_tier": w["tier"],
                "avg_rating": w["rating"],
                "total_jobs": w["jobs"],
                "photo_url": photos[i % len(photos)],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.workers.insert_one(doc)

    # Seed jobs
    if await db.jobs.count_documents({}) == 0:
        for j in SEED_JOBS:
            v = SEED_VILLAGES[j["village_idx"]]
            await db.jobs.insert_one({
                "id": str(uuid.uuid4()),
                "customer_id": cust_id,
                "customer_name": "Mahesh Patel",
                "title": j["title"],
                "category": j["category"],
                "description": j["description"],
                "workers_needed": j["workers_needed"],
                "daily_rate": j["rate"],
                "job_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 7))).date().isoformat(),
                "village": v["name"],
                "lat": v["lat"],
                "lng": v["lng"],
                "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })


# --- Mount + CORS ---
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_data()
    logger.info("Seed data ensured.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
