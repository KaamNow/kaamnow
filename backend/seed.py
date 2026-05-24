import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

from .auth import hash_password
from .config import settings
from .db import db
from .utils import utc_now_iso

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SEED_VILLAGES = [
    {
        "name": "Pratapgarh",
        "lat": 25.8920,
        "lng": 81.9440,
        "district": "Pratapgarh",
        "state": "UP",
        "post": "Pratapgarh",
        "block": "Sadar",
        "pincode": "230001",
    },
    {
        "name": "Wardha",
        "lat": 20.7453,
        "lng": 78.6022,
        "district": "Wardha",
        "state": "Maharashtra",
        "post": "Wardha",
        "block": "Wardha",
        "pincode": "442001",
    },
    {
        "name": "Muzaffarpur",
        "lat": 26.1209,
        "lng": 85.3647,
        "district": "Muzaffarpur",
        "state": "Bihar",
        "post": "Muzaffarpur",
        "block": "Mushahari",
        "pincode": "842001",
    },
    {
        "name": "Hoshangabad",
        "lat": 22.7440,
        "lng": 77.7242,
        "district": "Hoshangabad",
        "state": "MP",
        "post": "Hoshangabad",
        "block": "Hoshangabad",
        "pincode": "461001",
    },
    {
        "name": "Jodhpur",
        "lat": 26.2389,
        "lng": 73.0242,
        "district": "Jodhpur",
        "state": "Rajasthan",
        "post": "Jodhpur",
        "block": "Jodhpur",
        "pincode": "342001",
    },
]

SEED_WORKERS = [
    {
        "name": "Ramesh Kumar",
        "skills": ["mason", "construction"],
        "rate": 500,
        "tier": 3,
        "rating": 4.8,
        "jobs": 47,
        "bio": "20 years experience as raj mistri. Specialized in brick work and plastering.",
    },
    {
        "name": "Sunita Devi",
        "skills": ["farm work", "harvesting"],
        "rate": 320,
        "tier": 2,
        "rating": 4.6,
        "jobs": 32,
        "bio": "Experienced agricultural worker. SHG verified. Cotton picking, weeding, transplanting.",
    },
    {
        "name": "Chhotu Yadav",
        "skills": ["painting", "shifting", "helper"],
        "rate": 400,
        "tier": 2,
        "rating": 4.7,
        "jobs": 28,
        "bio": "Multi-skill helper. Painting, light electrical, furniture shifting.",
    },
    {
        "name": "Mohan Lal",
        "skills": ["mason", "tile work"],
        "rate": 480,
        "tier": 3,
        "rating": 4.5,
        "jobs": 51,
        "bio": "Mason with tiling specialty. Worked on 30+ houses.",
    },
    {
        "name": "Geeta Bai",
        "skills": ["farm work", "weeding"],
        "rate": 280,
        "tier": 2,
        "rating": 4.4,
        "jobs": 19,
        "bio": "Wardha-based farm labourer, available all seasons.",
    },
    {
        "name": "Suresh Sharma",
        "skills": ["plumbing", "electrical"],
        "rate": 550,
        "tier": 3,
        "rating": 4.9,
        "jobs": 63,
        "bio": "Licensed plumber + basic electrical. Quick response.",
    },
    {
        "name": "Rakesh Singh",
        "skills": ["driver", "helper"],
        "rate": 450,
        "tier": 2,
        "rating": 4.3,
        "jobs": 22,
        "bio": "Tractor and small commercial vehicle driver.",
    },
    {
        "name": "Lakshmi Devi",
        "skills": ["cleaning", "cooking"],
        "rate": 300,
        "tier": 2,
        "rating": 4.6,
        "jobs": 38,
        "bio": "Domestic help, cooking and cleaning. SHG vouched.",
    },
    {
        "name": "Anil Mahto",
        "skills": ["digging", "helper"],
        "rate": 380,
        "tier": 1,
        "rating": 4.2,
        "jobs": 14,
        "bio": "Strong helper for digging, loading, unloading.",
    },
    {
        "name": "Pooja Kumari",
        "skills": ["farm work", "harvesting", "transplanting"],
        "rate": 290,
        "tier": 2,
        "rating": 4.5,
        "jobs": 25,
        "bio": "Skilled harvest worker, fast and reliable.",
    },
    {
        "name": "Vinod Yadav",
        "skills": ["mason", "construction", "concrete"],
        "rate": 520,
        "tier": 3,
        "rating": 4.7,
        "jobs": 44,
        "bio": "Concrete and RCC specialist mason.",
    },
    {
        "name": "Hari Prasad",
        "skills": ["painting", "whitewashing"],
        "rate": 420,
        "tier": 2,
        "rating": 4.4,
        "jobs": 31,
        "bio": "House painter, distemper and emulsion.",
    },
    {
        "name": "Kamla Devi",
        "skills": ["farm work", "cleaning"],
        "rate": 270,
        "tier": 2,
        "rating": 4.3,
        "jobs": 17,
        "bio": "Available for farm and household work.",
    },
    {
        "name": "Deepak Kumar",
        "skills": ["electrical", "fan repair"],
        "rate": 500,
        "tier": 3,
        "rating": 4.8,
        "jobs": 56,
        "bio": "Village electrician, all wiring and repair work.",
    },
    {
        "name": "Munni Bai",
        "skills": ["sweeping", "helper"],
        "rate": 250,
        "tier": 1,
        "rating": 4.0,
        "jobs": 11,
        "bio": "New on KaamNow. Looking for daily work.",
    },
    {
        "name": "Rajesh Bhai",
        "skills": ["welding", "iron work"],
        "rate": 600,
        "tier": 3,
        "rating": 4.9,
        "jobs": 72,
        "bio": "Welder. Gates, grills, agricultural implements.",
    },
    {
        "name": "Babita Devi",
        "skills": ["farm work"],
        "rate": 260,
        "tier": 2,
        "rating": 4.2,
        "jobs": 13,
        "bio": "Reliable farm worker, small landholders preferred.",
    },
    {
        "name": "Shyam Lal",
        "skills": ["carpentry", "helper"],
        "rate": 470,
        "tier": 2,
        "rating": 4.5,
        "jobs": 26,
        "bio": "Carpenter for windows, doors, basic furniture.",
    },
]

SEED_JOBS = [
    {
        "title": "Need 4 workers for cotton harvesting",
        "category": "farm",
        "description": "4 workers needed for 2 days of cotton harvesting in 3 acre farm.",
        "workers_needed": 4,
        "rate": 350,
        "village_idx": 1,
    },
    {
        "title": "Mason for boundary wall",
        "category": "construction",
        "description": "Looking for an experienced mason to build a 60ft boundary wall over the next week.",
        "workers_needed": 1,
        "rate": 500,
        "village_idx": 0,
    },
    {
        "title": "House painting (3 rooms)",
        "category": "construction",
        "description": "Painting 3 rooms - white plus accent wall. Materials provided.",
        "workers_needed": 2,
        "rate": 420,
        "village_idx": 2,
    },
    {
        "title": "Wheat harvest helpers",
        "category": "farm",
        "description": "5 workers needed for 1 day of wheat harvesting.",
        "workers_needed": 5,
        "rate": 320,
        "village_idx": 3,
    },
    {
        "title": "Plumbing repair",
        "category": "home",
        "description": "Bathroom tap and pipe repair, half-day work.",
        "workers_needed": 1,
        "rate": 550,
        "village_idx": 4,
    },
]


def _make_user(phone: str, name: str, **kwargs) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "phone_primary": phone,
        "phone_verified": True,
        "name": name,
        "gender": kwargs.get("gender"),
        "password_hash": hash_password(kwargs["password"]) if kwargs.get("password") else None,
        "pincode": kwargs.get("pincode"),
        "village": kwargs.get("village"),
        "address": kwargs.get("address"),
        "photo_url": kwargs.get("photo_url"),
        "preferred_language": kwargs.get("preferred_language", "hi"),
        "avatar_color": "#FF6B6B",
        "created_at": utc_now_iso(),
        "is_active": True,
        "has_service_profile": False,
        "saved_users": [],
        "referral_count": 0,
        "wallet_balance": 0,
        "saved_addresses": [],
        "tc_version": "1.0",
        "selfie_verified": False,
        **{
            k: v
            for k, v in kwargs.items()
            if k
            not in {
                "password",
                "gender",
                "pincode",
                "village",
                "address",
                "photo_url",
                "preferred_language",
            }
        },
    }


async def seed_data() -> None:
    admin_phone = settings.admin_phone.strip()
    if admin_phone and not await db.users.find_one({"phone_primary": admin_phone}):
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "phone_primary": admin_phone,
                "password_hash": hash_password(settings.admin_password),
                "name": "Admin",
                "role": "admin",
                "phone_verified": True,
                "preferred_language": "en",
                "created_at": utc_now_iso(),
                "is_active": True,
            }
        )

    if await db.service_profiles.count_documents({}) == 0:
        photos = [
            "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/12921278/pexels-photo-12921278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/29858623/pexels-photo-29858623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
        ]
        for i, worker in enumerate(SEED_WORKERS):
            village = SEED_VILLAGES[i % len(SEED_VILLAGES)]
            user_id = str(uuid.uuid4())
            phone = f"+71700000{i + 10:04d}"
            if not await db.users.find_one({"phone_primary": phone}):
                user_doc = _make_user(
                    phone=phone,
                    name=worker["name"],
                    village=village["name"],
                    pincode=village["pincode"],
                    photo_url=photos[i % len(photos)],
                    has_service_profile=True,
                )
                user_doc["id"] = user_id
                await db.users.insert_one(user_doc)
            else:
                existing = await db.users.find_one({"phone_primary": phone})
                user_id = existing["id"]

            sp_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "display_name": worker["name"],
                "bio": worker["bio"],
                "categories": [worker["skills"][0]] if worker["skills"] else [],
                "skills": worker["skills"],
                "pincode": village["pincode"],
                "location_text": village["name"],
                "availability": True,
                "is_active": True,
                "daily_rate": worker["rate"],
                "rating_avg": worker["rating"],
                "rating_count": worker["jobs"],
                "completed_jobs": worker["jobs"],
                "photos": [],
                "certifications": [],
                "verification_status": "unverified",
                "photo_url": photos[i % len(photos)],
                "lat": village["lat"] + random.uniform(-0.05, 0.05),
                "lng": village["lng"] + random.uniform(-0.05, 0.05),
                "created_at": utc_now_iso(),
                "updated_at": utc_now_iso(),
            }
            await db.service_profiles.insert_one(sp_doc)

    demo_user = await db.users.find_one({"phone_primary": "+919000000001"})
    if not demo_user:
        demo_user_doc = _make_user(
            phone="+919000000001",
            name="Mahesh Patel",
            village="Hoshangabad",
            pincode="461001",
            address={
                "village": "Hoshangabad",
                "district": "Hoshangabad",
                "state": "MP",
                "pincode": "461001",
            },
        )
        await db.users.insert_one(demo_user_doc)
        demo_user = demo_user_doc

    if await db.jobs.count_documents({}) == 0:
        for job in SEED_JOBS:
            village = SEED_VILLAGES[job["village_idx"]]
            await db.jobs.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "posted_by_user_id": demo_user["id"],
                    "posted_by_name": demo_user["name"],
                    "title": job["title"],
                    "category": job["category"],
                    "description": job["description"],
                    "workers_needed": job["workers_needed"],
                    "daily_rate": job["rate"],
                    "job_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 7)))
                    .date()
                    .isoformat(),
                    "village": village["name"],
                    "address": {
                        "village": village["name"],
                        "district": village["district"],
                        "state": village["state"],
                        "pincode": village["pincode"],
                    },
                    "lat": village["lat"],
                    "lng": village["lng"],
                    "required_skills": [{"category": job["category"], "skill": job["category"]}],
                    "urgency": "normal",
                    "filled_count": 0,
                    "status": "open",
                    "created_at": utc_now_iso(),
                }
            )
