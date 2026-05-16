#!/usr/bin/env python3
"""Lightweight WhatsApp bot flow simulator for WA-1.

Run against a local backend:
  python scripts/test_whatsapp_bot_flow.py --scenario customer_hi --phone 919654945155
  python scripts/test_whatsapp_bot_flow.py --scenario worker_hi --phone 919654945155
  python scripts/test_whatsapp_bot_flow.py --scenario unregistered_hi --phone 919654945155
"""

import argparse
import json
import urllib.error
import urllib.request


SCENARIO_MESSAGES = {
    "customer_hi": "hi",
    "worker_hi": "hi",
    "unregistered_hi": "hi",
    "unregistered_button_customer": "CUSTOMER",
    "customer_button_change_pincode": "CHANGE_PINCODE",
    "worker_button_more": "MORE",
}

INBOUND_BUTTON_PAYLOAD = {
    "type": "message",
    "payload": {
        "source": "919654945155",
        "type": "quick_reply",
        "payload": {"postbackText": "CHANGE_PINCODE", "text": "Change Pincode"},
    },
}


def normalize_session_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit()).lstrip("0")
    if len(digits) == 10:
        digits = f"91{digits}"
    elif len(digits) >= 12 and digits.startswith("91"):
        digits = digits[-12:]
    return digits


def post_message(api_url: str, phone: str, message: str) -> dict:
    payload = {
        "session_id": f"whatsapp-{normalize_session_phone(phone)}",
        "message": message,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{api_url.rstrip('/')}/api/whatsapp/message",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulate WA-1 WhatsApp bot greetings.")
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--phone", required=True, help="WhatsApp phone, e.g. 919654945155 or +919654945155")
    scenario_choices = sorted([*SCENARIO_MESSAGES, "inbound_button_payload"])
    parser.add_argument("--scenario", choices=scenario_choices, required=True)
    args = parser.parse_args()

    if args.scenario == "inbound_button_payload":
        print(json.dumps(INBOUND_BUTTON_PAYLOAD, indent=2))
        return 0

    try:
        result = post_message(args.api_url, args.phone, SCENARIO_MESSAGES[args.scenario])
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}")
        return 1
    except Exception as exc:
        print(f"Request failed: {exc}")
        return 1

    print("Reply:")
    print(result.get("reply", ""))
    print("\nState:")
    print(json.dumps(result.get("state", {}), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
