#!/usr/bin/env python3
"""Reset dev indexes for the user-to-user marketplace schema."""

import os
from datetime import datetime, timezone

import certifi
from pymongo import ASCENDING, DESCENDING, MongoClient


DB_NAME = os.getenv("DB_NAME", "kaamnow_dev")
MONGO_URL = os.environ["MONGO_URL"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_indexes(db) -> None:
    db.users.create_index("phone_primary", unique=True, sparse=True)
    db.users.create_index("referral_code", unique=True, sparse=True)
    db.users.create_index([("has_service_profile", ASCENDING), ("created_at", DESCENDING)])

    db.service_profiles.create_index("user_id", unique=True)
    db.service_profiles.create_index("skills")
    db.service_profiles.create_index("categories")
    db.service_profiles.create_index("pincode")
    db.service_profiles.create_index([("availability", ASCENDING), ("is_active", ASCENDING)])

    db.jobs.create_index("posted_by_user_id")
    db.jobs.create_index("status")
    db.jobs.create_index("address.pincode")
    db.jobs.create_index("required_skills.skill")
    db.jobs.create_index([("is_template", ASCENDING), ("posted_by_user_id", ASCENDING)])

    db.work_requests.create_index("job_id")
    db.work_requests.create_index("requested_by_user_id")
    db.work_requests.create_index("requested_to_user_id")
    db.work_requests.create_index([("requested_by_user_id", ASCENDING), ("status", ASCENDING)])
    db.work_requests.create_index([("requested_to_user_id", ASCENDING), ("status", ASCENDING)])
    db.work_requests.create_index(
        [
            ("requested_by_user_id", ASCENDING),
            ("requested_to_user_id", ASCENDING),
            ("job_id", ASCENDING),
            ("request_type", ASCENDING),
            ("status", ASCENDING),
        ]
    )

    db.messages.create_index([("work_request_id", ASCENDING), ("created_at", ASCENDING)])
    db.messages.create_index([("receiver_id", ASCENDING), ("read", ASCENDING)])

    db.reports.create_index("reported_user_id")
    db.reports.create_index([("status", ASCENDING), ("created_at", DESCENDING)])

    db.payments.create_index([("payer_id", ASCENDING), ("created_at", DESCENDING)])
    db.payments.create_index([("payee_id", ASCENDING), ("created_at", DESCENDING)])
    db.wallet_transactions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.wallet_transactions.create_index([("expires_at", ASCENDING), ("expired", ASCENDING)])

    db.faqs.create_index([("category", ASCENDING), ("order", ASCENDING)])
    db.faqs.create_index("is_active")
    db.legal_docs.create_index([("doc_type", ASCENDING), ("is_current", ASCENDING)])


def backfill_users(db) -> int:
    profile_user_ids = {
        p["user_id"]
        for p in db.service_profiles.find({"user_id": {"$exists": True}}, {"user_id": 1})
        if p.get("user_id")
    }
    changed = 0
    for user in db.users.find({}, {"_id": 0, "id": 1, "saved_users": 1}):
        user_id = user.get("id")
        if not user_id:
            continue
        db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "has_service_profile": user_id in profile_user_ids,
                    "saved_users": user.get("saved_users") or [],
                    "migration_status": "user_to_user_marketplace",
                    "updated_at": now_iso(),
                },
                "$unset": {
                    "saved_" + "workers": "",
                    "has_" + "worker_profile": "",
                    "is_" + "worker": "",
                    "is_" + "customer": "",
                },
            },
        )
        changed += 1
    return changed


def clean_removed_collections(db) -> None:
    db.drop_collection("bookings")
    db.drop_collection("engagements")
    db.drop_collection("workers")
    db.drop_collection("worker_waitlist")


def main() -> None:
    client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
    db = client[DB_NAME]
    ensure_indexes(db)
    changed = backfill_users(db)
    clean_removed_collections(db)
    print({"users_backfilled": changed, "db": DB_NAME})
    client.close()


if __name__ == "__main__":
    main()
