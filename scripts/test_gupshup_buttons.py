#!/usr/bin/env python3
"""
Test Gupshup interactive button payloads directly.
Usage:
  cd /home/ubuntu/kaamnow && python3 scripts/test_gupshup_buttons.py --to 919XXXXXXXXXX

Tries both Gupshup payload formats and shows exact API response.
"""
import argparse
import json
import os
import sys
import requests

API_URL   = os.environ.get("GUPSHUP_API_URL", "https://api.gupshup.io/wa/api/v1/msg")
API_KEY   = os.environ.get("GUPSHUP_API_KEY", "")
SOURCE    = os.environ.get("GUPSHUP_SOURCE", "")
APP_ID    = os.environ.get("GUPSHUP_APP_ID", "KaamNow")

BODY_TEXT = (
    "Namaste! KaamNow mein swagat hai 🙏\n\n"
    "Aap kya karna chahte hain?"
)

BUTTONS_WA = [
    {"type": "reply", "reply": {"id": "JOBS",   "title": "Find Jobs"}},
    {"type": "reply", "reply": {"id": "STATUS", "title": "My Status"}},
    {"type": "reply", "reply": {"id": "HELP",   "title": "Help"}},
]

BUTTONS_QR = [
    {"type": "text", "title": "Find Jobs",  "postbackText": "JOBS"},
    {"type": "text", "title": "My Status",  "postbackText": "STATUS"},
    {"type": "text", "title": "Help",       "postbackText": "HELP"},
]

PAYLOADS = {
    "quick_reply (Gupshup native)": {
        "type": "quick_reply",
        "content": {"type": "text", "text": BODY_TEXT},
        "options": BUTTONS_QR,
    },
    "interactive/button (WhatsApp native via Gupshup)": {
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": BODY_TEXT},
            "action": {"buttons": BUTTONS_WA},
        },
    },
    "interactive/button wrapped in type field": None,  # built below
}


def send(to_phone: str, label: str, message_payload: dict) -> None:
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": API_KEY,
    }
    form = {
        "channel": "whatsapp",
        "source": SOURCE,
        "destination": to_phone,
        "message": json.dumps(message_payload),
    }
    if APP_ID:
        form["src.name"] = APP_ID

    masked_key = API_KEY[:6] + "***" if API_KEY else "NOT SET"
    print(f"\n{'='*60}")
    print(f"PAYLOAD: {label}")
    print(f"URL: {API_URL}")
    print(f"apikey: {masked_key}")
    print(f"source: {SOURCE}")
    print(f"destination: {to_phone[:4]}***{to_phone[-4:]}")
    print(f"message JSON:\n{json.dumps(message_payload, indent=2, ensure_ascii=False)}")
    print("---")

    try:
        resp = requests.post(API_URL, data=form, headers=headers, timeout=15)
        print(f"HTTP status: {resp.status_code}")
        print(f"Response body: {resp.text[:500]}")
        try:
            rj = resp.json()
            status = rj.get("status", "?")
            print(f"Gupshup status field: {status}")
            if status == "submitted":
                print("✅ SUBMITTED — check WhatsApp for rendering")
            else:
                print("❌ NOT submitted")
        except Exception:
            print(f"Raw response: {resp.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--to", required=True, help="Destination phone e.g. 919654945155")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: GUPSHUP_API_KEY not set"); sys.exit(1)
    if not SOURCE:
        print("ERROR: GUPSHUP_SOURCE not set"); sys.exit(1)

    # Also send a plain text first to confirm basic connectivity
    print("\n--- SANITY CHECK: plain text ---")
    send(args.to, "plain text", {"type": "text", "text": "KaamNow button test - plain text ✅"})

    # Now try both interactive formats
    for label, payload in PAYLOADS.items():
        if payload is None:
            continue
        send(args.to, label, payload)

    print(f"\n{'='*60}")
    print("Done. Check WhatsApp on the destination device.")
    print("If 'quick_reply' shows buttons → use that format.")
    print("If 'interactive/button' shows buttons → use that format.")
    print("If neither shows buttons → contact Gupshup support to enable interactive messages.")


if __name__ == "__main__":
    main()
