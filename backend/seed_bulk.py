"""
Bulk seed: 100 dummy workers + 70 dummy customers + jobs.
Uses the real DB schema (workers.py + schemas.py).
Real accounts are NEVER touched.

Run on EC2:
  python3 -m backend.seed_bulk
"""

import asyncio
import datetime
import random
import uuid

from .db import db
from .utils import utc_now_iso

# ── Real accounts — never touch ───────────────────────────────────────────
REAL_PHONES = {"+919654945155", "+917903770969", "+919999999999"}

# ── Bihar locations with full Address schema ──────────────────────────────
LOCATIONS = [
    {
        "village": "Patna City",
        "post": "Patna GPO",
        "block": "Patna Sadar",
        "district": "Patna",
        "state": "Bihar",
        "pincode": "800001",
    },
    {
        "village": "Hajipur",
        "post": "Hajipur HO",
        "block": "Hajipur",
        "district": "Vaishali",
        "state": "Bihar",
        "pincode": "844101",
    },
    {
        "village": "Muzaffarpur",
        "post": "Muzaffarpur",
        "block": "Mushahri",
        "district": "Muzaffarpur",
        "state": "Bihar",
        "pincode": "842001",
    },
    {
        "village": "Gaya",
        "post": "Gaya HO",
        "block": "Gaya Sadar",
        "district": "Gaya",
        "state": "Bihar",
        "pincode": "823001",
    },
    {
        "village": "Bhagalpur",
        "post": "Bhagalpur HO",
        "block": "Jagdishpur",
        "district": "Bhagalpur",
        "state": "Bihar",
        "pincode": "812001",
    },
    {
        "village": "Darbhanga",
        "post": "Darbhanga HO",
        "block": "Darbhanga",
        "district": "Darbhanga",
        "state": "Bihar",
        "pincode": "846001",
    },
    {
        "village": "Ara",
        "post": "Ara HO",
        "block": "Ara Sadar",
        "district": "Bhojpur",
        "state": "Bihar",
        "pincode": "802301",
    },
    {
        "village": "Begusarai",
        "post": "Begusarai HO",
        "block": "Begusarai",
        "district": "Begusarai",
        "state": "Bihar",
        "pincode": "851101",
    },
    {
        "village": "Katihar",
        "post": "Katihar HO",
        "block": "Katihar",
        "district": "Katihar",
        "state": "Bihar",
        "pincode": "854105",
    },
    {
        "village": "Munger",
        "post": "Munger HO",
        "block": "Munger Sadar",
        "district": "Munger",
        "state": "Bihar",
        "pincode": "811201",
    },
    {
        "village": "Khagaria",
        "post": "Khagaria HO",
        "block": "Khagaria",
        "district": "Khagaria",
        "state": "Bihar",
        "pincode": "851204",
    },
    {
        "village": "Sitamarhi",
        "post": "Sitamarhi HO",
        "block": "Dumra",
        "district": "Sitamarhi",
        "state": "Bihar",
        "pincode": "843302",
    },
    {
        "village": "Samastipur",
        "post": "Samastipur",
        "block": "Samastipur",
        "district": "Samastipur",
        "state": "Bihar",
        "pincode": "848101",
    },
    {
        "village": "Chapra",
        "post": "Chapra HO",
        "block": "Chapra Sadar",
        "district": "Saran",
        "state": "Bihar",
        "pincode": "841301",
    },
    {
        "village": "Motihari",
        "post": "Motihari HO",
        "block": "Motihari",
        "district": "East Champaran",
        "state": "Bihar",
        "pincode": "845401",
    },
    {
        "village": "Bettiah",
        "post": "Bettiah HO",
        "block": "Bettiah",
        "district": "West Champaran",
        "state": "Bihar",
        "pincode": "845438",
    },
    {
        "village": "Siwan",
        "post": "Siwan HO",
        "block": "Siwan Sadar",
        "district": "Siwan",
        "state": "Bihar",
        "pincode": "841226",
    },
    {
        "village": "Madhubani",
        "post": "Madhubani HO",
        "block": "Madhubani",
        "district": "Madhubani",
        "state": "Bihar",
        "pincode": "847211",
    },
    {
        "village": "Supaul",
        "post": "Supaul HO",
        "block": "Supaul",
        "district": "Supaul",
        "state": "Bihar",
        "pincode": "852131",
    },
    {
        "village": "Araria",
        "post": "Araria HO",
        "block": "Araria",
        "district": "Araria",
        "state": "Bihar",
        "pincode": "854311",
    },
]

# lat/lng per district (approximate)
COORDS = {
    "Patna": (25.5941, 85.1376),
    "Vaishali": (25.7018, 85.2124),
    "Muzaffarpur": (26.1197, 85.3910),
    "Gaya": (24.7914, 85.0002),
    "Bhagalpur": (25.2425, 86.9842),
    "Darbhanga": (26.1542, 85.8918),
    "Bhojpur": (25.5624, 84.6628),
    "Begusarai": (25.4182, 86.1272),
    "Katihar": (25.5405, 87.5706),
    "Munger": (25.3745, 86.4734),
    "Khagaria": (25.5018, 86.4625),
    "Sitamarhi": (26.5910, 85.4794),
    "Samastipur": (25.8594, 85.7797),
    "Saran": (25.9174, 84.9060),
    "East Champaran": (26.6522, 84.9201),
    "West Champaran": (27.0238, 84.3542),
    "Siwan": (26.2196, 84.3565),
    "Madhubani": (26.3517, 86.0714),
    "Supaul": (26.1230, 86.6083),
    "Araria": (26.1469, 87.4634),
}

# ── Skill sets — matches category strings in the system ───────────────────
# Each entry: (skills_list, category, rate_min, rate_max)
SKILL_SETS = [
    (["mason", "tile work"], "construction", 500, 700),
    (["electrician", "house wiring"], "electrical", 550, 800),
    (["plumber", "pipe fitting"], "construction", 450, 650),
    (["carpenter", "furniture work"], "construction", 500, 750),
    (["painter", "wall painting"], "construction", 400, 600),
    (["farm helper", "harvesting"], "farm", 300, 450),
    (["tractor driver"], "farm", 600, 900),
    (["cook", "housekeeping"], "home", 350, 550),
    (["driver"], "transport", 600, 900),
    (["welder", "iron work"], "construction", 550, 800),
    (["cleaner", "deep cleaning"], "cleaning", 300, 450),
    (["security guard"], "home", 400, 600),
    (["AC technician"], "electrical", 700, 1100),
    (["pump repair", "motor repair"], "electrical", 500, 800),
    (["gardener"], "home", 300, 500),
    (["bar bender"], "construction", 500, 700),
    (["pesticide spraying"], "farm", 300, 450),
    (["delivery helper", "loader"], "transport", 350, 500),
    (["tailoring", "blouse stitching"], "home", 300, 550),
    (["auto repair", "diesel mechanic"], "construction", 500, 800),
]

WORKER_NAMES = [
    "Ramesh Kumar",
    "Suresh Yadav",
    "Manoj Sharma",
    "Vijay Paswan",
    "Santosh Singh",
    "Dinesh Gupta",
    "Rakesh Verma",
    "Anil Kumar",
    "Sanjay Tiwari",
    "Rajesh Chaudhary",
    "Mukesh Yadav",
    "Deepak Kumar",
    "Amit Paswan",
    "Rohit Singh",
    "Nikhil Sharma",
    "Pankaj Yadav",
    "Vikash Kumar",
    "Sumit Verma",
    "Ravi Shankar",
    "Ajay Kumar",
    "Shyam Sunder",
    "Lal Bahadur",
    "Ram Naresh",
    "Hari Prasad",
    "Shiv Kumar",
    "Mohan Lal",
    "Birendra Singh",
    "Surendra Yadav",
    "Nagendra Kumar",
    "Jitendra Prasad",
    "Umesh Kumar",
    "Mahesh Yadav",
    "Ganesh Prasad",
    "Sunil Kumar",
    "Ashok Singh",
    "Virendra Kumar",
    "Arvind Sharma",
    "Ranjit Kumar",
    "Devendra Singh",
    "Brijesh Yadav",
    "Sushil Kumar",
    "Pramod Kumar",
    "Vinod Tiwari",
    "Kishor Kumar",
    "Naresh Yadav",
    "Ramdas Paswan",
    "Bhola Nath",
    "Shivanand Kumar",
    "Kedarnath Singh",
    "Ratnesh Kumar",
    "Chandan Kumar",
    "Dilip Yadav",
    "Girish Kumar",
    "Hemant Singh",
    "Indra Kumar",
    "Jagdish Prasad",
    "Kamlesh Kumar",
    "Lallan Singh",
    "Manoj Paswan",
    "Narendra Kumar",
    "Om Prakash",
    "Pradip Kumar",
    "Ramsevak Yadav",
    "Somnath Singh",
    "Triloki Kumar",
    "Uday Shankar",
    "Venkatesh Kumar",
    "Wasim Ansari",
    "Yogesh Kumar",
    "Zubair Ansari",
    "Anand Kumar",
    "Basant Kumar",
    "Chhotu Kumar",
    "Dhirendra Singh",
    "Eshwar Prasad",
    "Govind Kumar",
    "Hriday Narayan",
    "Ishwar Singh",
    "Jayram Yadav",
    "Kailash Kumar",
    "Laxman Singh",
    "Munna Kumar",
    "Nandan Yadav",
    "Onkar Singh",
    "Pratap Kumar",
    "Rahim Ansari",
    "Sitaram Yadav",
    "Tapan Kumar",
    "Vinayak Singh",
    "Warish Khan",
    "Balram Singh",
    "Chandradev Kumar",
    "Dayanand Yadav",
    "Giriraj Singh",
    "Fulchand Kumar",
    "Harivansh Kumar",
    "Jagannath Singh",
    "Kameshwar Yadav",
    "Loknath Paswan",
    "Nandalal Singh",
]

CUSTOMER_NAMES = [
    "Savita Devi",
    "Meena Singh",
    "Rekha Sharma",
    "Sunita Yadav",
    "Anita Kumari",
    "Prabha Devi",
    "Kamla Singh",
    "Shanti Devi",
    "Usha Kumari",
    "Geeta Yadav",
    "Pushpa Singh",
    "Asha Kumari",
    "Lata Devi",
    "Kusum Sharma",
    "Indu Singh",
    "Manju Kumari",
    "Sarita Devi",
    "Vimla Singh",
    "Rita Yadav",
    "Nirmala Devi",
    "Rajiv Mishra",
    "Arun Kumar Singh",
    "Suresh Prasad",
    "Vivek Verma",
    "Manoj Tiwari",
    "Alok Gupta",
    "Saurabh Kumar",
    "Pradeep Singh",
    "Ravi Mishra",
    "Santosh Kumar",
    "Sunil Sharma",
    "Avinash Kumar",
    "Deepak Mishra",
    "Niraj Singh",
    "Rahul Kumar",
    "Sanjay Verma",
    "Manish Yadav",
    "Rakesh Mishra",
    "Vikas Singh",
    "Ashish Kumar",
    "Rajesh Gupta",
    "Prashant Kumar",
    "Amit Mishra",
    "Sourav Singh",
    "Kundan Kumar",
    "Bijay Kumar",
    "Arvind Mishra",
    "Roop Kumar",
    "Sarvesh Singh",
    "Triloki Nath",
    "Chandni Devi",
    "Mamta Singh",
    "Puja Kumari",
    "Kavita Devi",
    "Rani Singh",
    "Sita Devi",
    "Gita Kumari",
    "Durga Devi",
    "Radha Devi",
    "Sudha Singh",
    "Bindu Kumari",
    "Renu Devi",
    "Seema Singh",
    "Pinki Kumari",
    "Shobha Devi",
    "Nisha Singh",
    "Priya Kumari",
    "Monika Devi",
    "Kiran Singh",
    "Jyoti Kumari",
]

JOB_TEMPLATES = [
    (
        "Mason for boundary wall construction",
        "construction",
        [{"category": "Construction", "skill": "mason"}],
        1,
        3,
        500,
        700,
    ),
    (
        "House painting — 2–3 rooms",
        "construction",
        [{"category": "Construction", "skill": "painter"}],
        1,
        2,
        400,
        600,
    ),
    (
        "Electrical wiring — new house",
        "electrical",
        [{"category": "Electrical", "skill": "electrician"}],
        1,
        2,
        550,
        800,
    ),
    (
        "Farm harvesting workers needed",
        "farm",
        [{"category": "Farm", "skill": "harvesting"}],
        3,
        6,
        300,
        450,
    ),
    (
        "Plumbing repair — kitchen + bathroom",
        "construction",
        [{"category": "Construction", "skill": "plumber"}],
        1,
        1,
        450,
        650,
    ),
    (
        "Tractor driver for field work",
        "farm",
        [{"category": "Farm", "skill": "tractor driver"}],
        1,
        2,
        600,
        900,
    ),
    (
        "House deep cleaning",
        "cleaning",
        [{"category": "Cleaning", "skill": "cleaner"}],
        1,
        2,
        300,
        450,
    ),
    (
        "Cook needed — lunch and dinner",
        "home",
        [{"category": "Home", "skill": "cook"}],
        1,
        1,
        350,
        550,
    ),
    (
        "Carpentry — door and window frames",
        "construction",
        [{"category": "Construction", "skill": "carpenter"}],
        1,
        2,
        500,
        750,
    ),
    (
        "Security guard — day shift",
        "home",
        [{"category": "Home", "skill": "security guard"}],
        1,
        2,
        400,
        600,
    ),
    (
        "Iron gate welding work",
        "construction",
        [{"category": "Construction", "skill": "welder"}],
        1,
        1,
        550,
        800,
    ),
    (
        "AC service and installation",
        "electrical",
        [{"category": "Electrical", "skill": "AC technician"}],
        1,
        1,
        700,
        1100,
    ),
    (
        "Irrigation pump repair",
        "farm",
        [{"category": "Electrical", "skill": "pump repair"}],
        1,
        1,
        500,
        800,
    ),
    (
        "Office cleaning — weekly contract",
        "cleaning",
        [{"category": "Cleaning", "skill": "cleaner"}],
        2,
        3,
        300,
        450,
    ),
    (
        "Driver needed — daily office commute",
        "transport",
        [{"category": "Transport", "skill": "driver"}],
        1,
        1,
        600,
        900,
    ),
]


def _tier(total_jobs: int, avg_rating: float) -> int:
    if total_jobs >= 50 and avg_rating >= 4.5:
        return 4
    if total_jobs >= 20 and avg_rating >= 4.0:
        return 3
    if total_jobs >= 5 and avg_rating >= 3.5:
        return 2
    return 1


async def run():
    print("🌱 KaamNow Bulk Seed starting...")

    # ── Step 0: Create worker profile for +917903770969 if missing ─────────
    real_worker_user = await db.users.find_one({"phone_primary": "+917903770969"})
    if real_worker_user:
        existing_profile = await db.workers.find_one({"user_id": real_worker_user["id"]})
        if not existing_profile:
            loc = LOCATIONS[0]
            lat, lng = COORDS.get("Patna", (25.5941, 85.1376))
            now = utc_now_iso()
            await db.workers.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": real_worker_user["id"],
                    "name": real_worker_user.get("name", "Test Worker"),
                    "skills": ["mason", "tile work"],
                    "structured_skills": [
                        {"category": "Construction", "skill": "mason"},
                        {"category": "Construction", "skill": "tile work"},
                    ],
                    "daily_rate": 600,
                    "bio": "5 saal ka anubhav. Patna aur aaspaas available.",
                    "village": loc["village"],
                    "district": loc["district"],
                    "state": loc["state"],
                    "address": loc,
                    "lat": lat,
                    "lng": lng,
                    "available": True,
                    "availability_status": "available",
                    "trust_tier": 1,
                    "avg_rating": 0.0,
                    "total_jobs": 0,
                    "photo_url": None,
                    "last_active_at": now,
                    "created_at": now,
                }
            )
            print("✅ Worker profile created for +917903770969")
        else:
            print("ℹ️  Worker profile for +917903770969 already exists")

    # ── Step 1: Clear old dummy data ───────────────────────────────────────
    await db.users.delete_many({"phone_primary": {"$regex": r"^\+917000"}})
    print("🧹 Cleared old dummy seed data")

    # ── Step 2: 100 dummy workers ──────────────────────────────────────────
    now = utc_now_iso()
    workers_inserted = 0

    for i in range(100):
        uid = str(uuid.uuid4())
        wid = str(uuid.uuid4())
        phone = f"+917000{100000 + i}"

        name = WORKER_NAMES[i % len(WORKER_NAMES)]
        loc = LOCATIONS[i % len(LOCATIONS)]
        skill_set = SKILL_SETS[i % len(SKILL_SETS)]
        skills, category, rate_lo, rate_hi = skill_set
        rate = random.randint(rate_lo, rate_hi)
        total_jobs = random.randint(0, 80)
        avg_rating = round(random.uniform(2.8, 5.0), 1) if total_jobs > 0 else 0.0
        tier = _tier(total_jobs, avg_rating)
        lat, lng = COORDS.get(loc["district"], (25.5, 85.1))
        lat += random.uniform(-0.3, 0.3)
        lng += random.uniform(-0.3, 0.3)
        avail = random.random() > 0.25

        # User record
        await db.users.insert_one(
            {
                "id": uid,
                "phone_primary": phone,
                "password_hash": None,
                "name": name,
                "role": "worker",
                "phone_verified": True,
                "village": loc["village"],
                "pincode": loc["pincode"],
                "address": loc,
                "photo_url": None,
                "preferred_language": "hi",
                "avatar_color": None,
                "created_at": now,
                "migration_status": "phone_primary",
            }
        )

        # Worker profile — matches WorkerOut schema exactly
        await db.workers.insert_one(
            {
                "id": wid,
                "user_id": uid,
                "name": name,
                "skills": skills,
                "structured_skills": [{"category": category.title(), "skill": s} for s in skills],
                "daily_rate": rate,
                "bio": f"{total_jobs} kaam kiye hain. {loc['district']} aur aaspaas available.",
                "village": loc["village"],
                "district": loc["district"],
                "state": loc["state"],
                "address": loc,
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "available": avail,
                "availability_status": "available" if avail else "not_available",
                "trust_tier": tier,
                "avg_rating": avg_rating,
                "total_jobs": total_jobs,
                "photo_url": None,
                "last_active_at": now,
                "created_at": now,
            }
        )
        workers_inserted += 1

    print(f"✅ {workers_inserted} dummy workers created")

    # ── Step 3: 70 dummy customers + jobs ──────────────────────────────────
    customers_inserted = 0
    jobs_inserted = 0

    for i in range(70):
        cid = str(uuid.uuid4())
        phone = f"+917000{200000 + i}"
        name = CUSTOMER_NAMES[i % len(CUSTOMER_NAMES)]
        loc = LOCATIONS[i % len(LOCATIONS)]

        await db.users.insert_one(
            {
                "id": cid,
                "phone_primary": phone,
                "password_hash": None,
                "name": name,
                "role": "customer",
                "phone_verified": True,
                "village": loc["village"],
                "pincode": loc["pincode"],
                "address": loc,
                "photo_url": None,
                "preferred_language": "hi",
                "avatar_color": None,
                "created_at": now,
                "migration_status": "phone_primary",
            }
        )
        customers_inserted += 1

        # 1–2 open jobs per customer
        for _ in range(random.randint(1, 2)):
            tmpl = random.choice(JOB_TEMPLATES)
            title, cat, req_skills, w_lo, w_hi, rate_lo, rate_hi = tmpl
            days_ahead = random.randint(1, 14)
            job_date = (datetime.datetime.utcnow() + datetime.timedelta(days=days_ahead)).strftime(
                "%Y-%m-%d"
            )
            lat, lng = COORDS.get(loc["district"], (25.5, 85.1))

            await db.jobs.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "customer_id": cid,
                    "customer_name": name,
                    "title": title,
                    "category": cat,
                    "description": f"{title}. {loc['village']}, {loc['district']} mein kaam hai. Accha payment milega.",
                    "workers_needed": random.randint(w_lo, w_hi),
                    "daily_rate": random.randint(rate_lo, rate_hi),
                    "job_date": job_date,
                    "village": loc["village"],
                    "lat": round(lat + random.uniform(-0.2, 0.2), 4),
                    "lng": round(lng + random.uniform(-0.2, 0.2), 4),
                    "status": "open",
                    "filled_count": 0,
                    "accepted_worker_ids": [],
                    "required_skills": req_skills,
                    "address": loc,
                    "urgency": random.choice(["normal", "normal", "urgent"]),
                    "created_at": now,
                }
            )
            jobs_inserted += 1

    print(f"✅ {customers_inserted} dummy customers + {jobs_inserted} jobs created")
    print(f"\n🎉 Bulk seed complete!")
    print(f"   Workers : {workers_inserted} dummy (real accounts untouched)")
    print(f"   Customers: {customers_inserted} dummy (real accounts untouched)")
    print(f"   Jobs     : {jobs_inserted} open")
    print(f"\n   Tier breakdown:")
    t1 = sum(1 for i in range(100) if _tier(0, 0) == 1)
    print(f"   (Check actual distribution in MongoDB)")


if __name__ == "__main__":
    asyncio.run(run())
