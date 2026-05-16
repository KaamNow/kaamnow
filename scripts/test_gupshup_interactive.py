#!/usr/bin/env python3
"""Send a live Gupshup quick-reply button message using KaamNow settings.

Usage:
  python scripts/test_gupshup_interactive.py --to 919654945155 --type buttons
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.routers.whatsapp import _send_gupshup_buttons  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Live-test Gupshup reply buttons.")
    parser.add_argument("--to", required=True, help="Destination WhatsApp phone, e.g. 919654945155")
    parser.add_argument("--type", choices=["buttons"], default="buttons")
    args = parser.parse_args()

    missing = [name for name in ("GUPSHUP_API_URL", "GUPSHUP_API_KEY", "GUPSHUP_SOURCE") if not os.getenv(name)]
    if missing:
        print(f"Missing env vars: {', '.join(missing)}")
        return 1

    result = _send_gupshup_buttons(
        args.to,
        "KaamNow button test. Kya dekhna hai?",
        [
            {"id": "CHANGE_PINCODE", "title": "Change Pincode"},
            {"id": "MORE", "title": "More"},
            {"id": "HELP", "title": "Help"},
        ],
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
