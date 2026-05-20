#!/usr/bin/env python3
"""Apply Phase 1 MongoDB schema/index/backfill changes to a dev database."""

import os
import secrets
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient


DB_NAME = os.getenv("DB_NAME", "kaamnow")
MONGO_URL = os.environ["MONGO_URL"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_referral_code(existing: set[str]) -> str:
    for _ in range(20):
        code = secrets.token_urlsafe(6).replace("-", "").replace("_", "").upper()[:8]
        if len(code) < 8:
            code = f"{code}{secrets.token_hex(4).upper()}"[:8]
        if code not in existing:
            existing.add(code)
            return code
    code = secrets.token_hex(4).upper()
    existing.add(code)
    return code


def ensure_indexes(db) -> None:
    db.users.create_index("phone_primary", unique=True, sparse=True)
    db.users.create_index("referral_code", unique=True, sparse=True)
    db.users.create_index([("is_worker", ASCENDING), ("is_customer", ASCENDING)])

    db.workers.create_index("user_id")
    db.workers.create_index("skills")
    db.workers.create_index("structured_skills.skill")
    db.workers.create_index("address.pincode")
    db.workers.create_index([("availability_status", ASCENDING), ("available", ASCENDING)])
    db.workers.create_index([("is_available_now", ASCENDING), ("available_now_expires_at", ASCENDING)])

    db.jobs.create_index("customer_id")
    db.jobs.create_index("status")
    db.jobs.create_index("address.pincode")
    db.jobs.create_index("required_skills.skill")
    db.jobs.create_index([("is_template", ASCENDING), ("customer_id", ASCENDING)])

    db.engagements.create_index("worker_id")
    db.engagements.create_index("customer_id")
    db.engagements.create_index("job_id")
    db.engagements.create_index([("worker_id", ASCENDING), ("status", ASCENDING)])
    db.engagements.create_index([("customer_id", ASCENDING), ("status", ASCENDING)])

    db.messages.create_index([("engagement_id", ASCENDING), ("created_at", ASCENDING)])
    db.messages.create_index([("receiver_id", ASCENDING), ("read", ASCENDING)])

    db.reports.create_index("reported_user_id")
    db.reports.create_index([("status", ASCENDING), ("created_at", DESCENDING)])

    db.payments.create_index([("payer_id", ASCENDING), ("created_at", DESCENDING)])
    db.payments.create_index([("payee_id", ASCENDING), ("created_at", DESCENDING)])
    db.wallet_transactions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.wallet_transactions.create_index([("expires_at", ASCENDING), ("expired", ASCENDING)])

    db.worker_waitlist.create_index([("worker_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    db.faqs.create_index([("category", ASCENDING), ("order", ASCENDING)])
    db.faqs.create_index("is_active")
    db.legal_docs.create_index([("doc_type", ASCENDING), ("is_current", ASCENDING)])


def backfill_users(db) -> int:
    worker_user_ids = {w["user_id"] for w in db.workers.find({"user_id": {"$exists": True}}, {"user_id": 1})}
    existing_codes = {
        u["referral_code"]
        for u in db.users.find({"referral_code": {"$exists": True, "$ne": ""}}, {"referral_code": 1})
        if u.get("referral_code")
    }

    changed = 0
    for user in db.users.find({}, {"_id": 0}):
        user_id = user.get("id")
        if not user_id:
            continue
        is_admin = user.get("role") == "admin"
        has_worker = bool(
            user_id in worker_user_ids
            or user.get("is_worker")
            or user.get("has_worker_profile")
            or user.get("role") == "worker"
        )
        update = {
            "is_worker": has_worker,
            "has_worker_profile": has_worker,
            "is_customer": user.get("is_customer", True) is not False,
            "role": "admin" if is_admin else "user",
            "gender": user.get("gender"),
            "saved_workers": user.get("saved_workers") or [],
            "referral_count": int(user.get("referral_count") or 0),
            "wallet_balance": int(user.get("wallet_balance") or 0),
            "saved_addresses": user.get("saved_addresses") or [],
            "emergency_contact": user.get("emergency_contact"),
            "tc_version": user.get("tc_version") or "1.0",
            "selfie_verified": bool(user.get("selfie_verified", False)),
            "posthog_id": user.get("posthog_id"),
            "migration_status": user.get("migration_status") or "phase1_unified",
        }
        if not user.get("referral_code") and not is_admin:
            update["referral_code"] = new_referral_code(existing_codes)
        db.users.update_one({"id": user_id}, {"$set": update})
        changed += 1
    return changed


def backfill_workers(db) -> int:
    changed = 0
    for worker in db.workers.find({}, {"_id": 0}):
        skills = worker.get("skills") or worker.get("structured_skills") or []
        pincode = (worker.get("address") or {}).get("pincode") or worker.get("pincode")
        profile_complete = bool(skills and pincode and worker.get("daily_rate"))
        update = {
            "gender": worker.get("gender"),
            "certifications": worker.get("certifications") or [],
            "portfolio": worker.get("portfolio") or [],
            "response_time_minutes": worker.get("response_time_minutes"),
            "response_time_count": int(worker.get("response_time_count") or 0),
            "available_from": worker.get("available_from"),
            "team_size": int(worker.get("team_size") or 1),
            "kyc_status": worker.get("kyc_status") or "not_started",
            "video_url": worker.get("video_url"),
            "is_available_now": bool(worker.get("is_available_now", False)),
            "available_now_expires_at": worker.get("available_now_expires_at"),
            "skill_badges": worker.get("skill_badges") or [],
            "profile_complete": profile_complete,
        }
        if not worker.get("availability_status"):
            update["availability_status"] = "available" if worker.get("available", True) else "incomplete"
        db.workers.update_one({"id": worker["id"]}, {"$set": update})
        changed += 1
    return changed


def backfill_jobs(db) -> int:
    result = db.jobs.update_many(
        {},
        {
            "$set": {
                "urgency": "normal",
                "recurrence": None,
                "is_template": False,
                "template_name": None,
                "photo_url": None,
                "ai_generated": False,
                "is_anonymous": False,
            }
        },
    )
    return result.modified_count


def backfill_engagements(db) -> int:
    result = db.engagements.update_many(
        {},
        {
            "$set": {
                "chat_enabled": False,
                "payment_status": "unpaid",
                "payment_id": None,
                "payment_amount": None,
                "before_photos": [],
                "after_photos": [],
                "start_otp": None,
                "otp_verified_at": None,
                "checkin_lat": None,
                "checkin_lng": None,
                "progress_updates": [],
            }
        },
    )
    return result.modified_count


FAQS = [
    ("faq_general_1", "general", 1, "What is KaamNow?", "KaamNow connects nearby customers and Local Experts.", "KaamNow kya hai?", "KaamNow paas ke customers aur Local Experts ko jodta hai."),
    ("faq_expert_1", "for_local_experts", 2, "How do I become a Local Expert?", "Complete your worker profile with skills, address, and rate.", "Local Expert kaise banein?", "Skills, address aur rate ke saath worker profile poori karein."),
    ("faq_customer_1", "for_customers", 3, "How do I book work?", "Post a job or choose a Local Expert and send a request.", "Kaam kaise book karein?", "Job post karein ya Local Expert chun kar request bhejein."),
    ("faq_payment_1", "payments", 4, "How does wallet credit work?", "Referral credits can be used in KaamNow and expire after 90 days.", "Wallet credit kaise kaam karta hai?", "Referral credits KaamNow mein use hote hain aur 90 din baad expire hote hain."),
    ("faq_safety_1", "safety", 5, "How do I report a problem?", "Open the report option on a profile or booking and share details.", "Problem report kaise karein?", "Profile ya booking par report option khol kar details bhejein."),
]


def seed_faqs(db) -> int:
    count = 0
    ts = now_iso()
    for faq_id, category, order, qen, aen, qhi, ahi in FAQS:
        result = db.faqs.update_one(
            {"id": faq_id},
            {
                "$set": {
                    "question_en": qen,
                    "answer_en": aen,
                    "question_hi": qhi,
                    "answer_hi": ahi,
                    "category": category,
                    "order": order,
                    "is_active": True,
                    "updated_at": ts,
                },
                "$setOnInsert": {"id": faq_id, "created_at": ts},
            },
            upsert=True,
        )
        count += result.modified_count + int(bool(result.upserted_id))
    return count


def seed_legal(db) -> int:
    count = 0
    ts = now_iso()
    docs = [
        ("terms_v1", "terms", "1.0", "KaamNow connects customers and Local Experts. Use the service lawfully, pay agreed charges, and treat others with respect.", "KaamNow customers aur Local Experts ko jodta hai. Seva ka kanooni tareeke se upyog karein, tai ki gayi rashi ka bhugtan karein, aur sabka samman karein."),
        ("privacy_v1", "privacy", "1.0", "KaamNow collects account, location, booking, and safety information to run the service and protect users.", "KaamNow seva chalane aur users ki suraksha ke liye account, location, booking, aur safety jaankari collect karta hai."),
    ]
    for doc_id, doc_type, version, en, hi in docs:
        db.legal_docs.update_many({"doc_type": doc_type}, {"$set": {"is_current": False}})
        result = db.legal_docs.update_one(
            {"id": doc_id},
            {
                "$set": {
                    "doc_type": doc_type,
                    "version": version,
                    "content_en": en,
                    "content_hi": hi,
                    "effective_date": "2026-01-01",
                    "is_current": True,
                    "updated_at": ts,
                },
                "$setOnInsert": {"id": doc_id, "created_at": ts},
            },
            upsert=True,
        )
        count += result.modified_count + int(bool(result.upserted_id))
    return count


def main() -> None:
    client_kwargs = {"serverSelectionTimeoutMS": 15000}
    try:
        import certifi

        client_kwargs["tlsCAFile"] = certifi.where()
    except ImportError:
        pass

    client = MongoClient(MONGO_URL, **client_kwargs)
    db = client[DB_NAME]
    client.admin.command("ping")

    existing = sorted(db.list_collection_names())
    for name in [
        "messages",
        "reports",
        "payments",
        "wallet_transactions",
        "worker_waitlist",
        "faqs",
        "legal_docs",
    ]:
        if name not in existing:
            db.create_collection(name)

    ensure_indexes(db)
    summary = {
        "database": DB_NAME,
        "users_backfilled": backfill_users(db),
        "workers_backfilled": backfill_workers(db),
        "jobs_modified": backfill_jobs(db),
        "engagements_modified": backfill_engagements(db),
        "faqs_seeded_or_updated": seed_faqs(db),
        "legal_seeded_or_updated": seed_legal(db),
        "collections": sorted(db.list_collection_names()),
    }
    print(summary)
    client.close()


if __name__ == "__main__":
    main()
