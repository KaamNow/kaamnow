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
    {"name": "Pratapgarh", "lat": 25.8920, "lng": 81.9440, "district": "Pratapgarh", "state": "UP"},
    {"name": "Wardha", "lat": 20.7453, "lng": 78.6022, "district": "Wardha", "state": "Maharashtra"},
    {"name": "Muzaffarpur", "lat": 26.1209, "lng": 85.3647, "district": "Muzaffarpur", "state": "Bihar"},
    {"name": "Hoshangabad", "lat": 22.7440, "lng": 77.7242, "district": "Hoshangabad", "state": "MP"},
    {"name": "Jodhpur", "lat": 26.2389, "lng": 73.0242, "district": "Jodhpur", "state": "Rajasthan"},
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


async def ensure_indexes() -> None:
    try:
        await db.users.create_index("email", unique=True)
        await db.workers.create_index("user_id")
        await db.workers.create_index("skills")
        await db.jobs.create_index("customer_id")
        await db.bookings.create_index("worker_id")
        await db.bookings.create_index("customer_id")
    except Exception:
        pass


async def seed_data() -> None:
    await ensure_indexes()

    admin_email = settings.admin_email.lower()
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "password_hash": hash_password(settings.admin_password),
                "name": "Admin",
                "role": "admin",
                "village": None,
                "phone": None,
                "created_at": utc_now_iso(),
            }
        )

    customer = await db.users.find_one({"role": "customer"})
    if not customer:
        customer_id = str(uuid.uuid4())
        await db.users.insert_one(
            {
                "id": customer_id,
                "email": f"demo-customer-{customer_id[:8]}@kaamnow.local",
                "password_hash": hash_password(str(uuid.uuid4())),
                "name": "Demo customer",
                "role": "customer",
                "village": "Hoshangabad",
                "phone": None,
                "created_at": utc_now_iso(),
            }
        )
    else:
        customer_id = customer["id"]

    if await db.workers.count_documents({}) == 0:
        photos = [
            "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/12921278/pexels-photo-12921278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/29858623/pexels-photo-29858623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
            "https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
        ]
        for i, worker in enumerate(SEED_WORKERS):
            village = SEED_VILLAGES[i % len(SEED_VILLAGES)]
            await db.workers.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": str(uuid.uuid4()),
                    "name": worker["name"],
                    "skills": worker["skills"],
                    "daily_rate": worker["rate"],
                    "bio": worker["bio"],
                    "village": village["name"],
                    "district": village["district"],
                    "state": village["state"],
                    "lat": village["lat"] + random.uniform(-0.05, 0.05),
                    "lng": village["lng"] + random.uniform(-0.05, 0.05),
                    "available": True,
                    "trust_tier": worker["tier"],
                    "avg_rating": worker["rating"],
                    "total_jobs": worker["jobs"],
                    "photo_url": photos[i % len(photos)],
                    "created_at": utc_now_iso(),
                }
            )

    if await db.jobs.count_documents({}) == 0:
        for job in SEED_JOBS:
            village = SEED_VILLAGES[job["village_idx"]]
            await db.jobs.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer_id,
                    "customer_name": "Mahesh Patel",
                    "title": job["title"],
                    "category": job["category"],
                    "description": job["description"],
                    "workers_needed": job["workers_needed"],
                    "daily_rate": job["rate"],
                    "job_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 7))).date().isoformat(),
                    "village": village["name"],
                    "lat": village["lat"],
                    "lng": village["lng"],
                    "status": "open",
                    "created_at": utc_now_iso(),
                }
            )
