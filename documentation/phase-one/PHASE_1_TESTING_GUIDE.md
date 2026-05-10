# Phase 1 Testing Guide

## Quick Start: Test the 3 Endpoints

### Option 1: Run Backend Server + Manual Tests

**Terminal 1 - Start Backend:**
```bash
cd /Users/amirsubhani/Documents/KaamNow/kaamnow
python3 -m uvicorn backend.app:app --reload --port 8000
```

**Terminal 2 - Test Phone Signup (3 steps):**

**Step 1: Send OTP**
```bash
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918765432109"}'
```
Expected response:
```json
{
  "otp_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expires_in": 900,
  "message": "OTP sent successfully"
}
```

**Step 2: Verify OTP (use "123456")**
```bash
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918765432109", "otp": "123456"}'
```
Expected response:
```json
{
  "otp_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "created_user": false
}
```

**Step 3: Complete Signup (replace otp_token with value from Step 2)**
```bash
curl -X POST http://localhost:8000/api/auth/signup-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -d '{
    "name": "Raj Kumar",
    "role": "worker",
    "preferred_language": "en"
  }'
```
Expected response:
```json
{
  "user": {
    "id": "uuid-here",
    "phone_primary": "+918765432109",
    "phone_verified": true,
    "name": "Raj Kumar",
    "role": "worker",
    "email": null,
    "avatar_color": "#FF6B6B",
    "created_at": "2026-05-10T14:30:00Z"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": null
}
```

✓ **Success!** User created with phone as primary ID.

---

### Option 2: Run Pytest

**Terminal 1 - Start Backend:**
```bash
cd /Users/amirsubhani/Documents/KaamNow/kaamnow
python3 -m uvicorn backend.app:app --port 8000
```

**Terminal 2 - Run Tests:**
```bash
cd /Users/amirsubhani/Documents/KaamNow/kaamnow
pytest tests/test_auth_phone_first.py -v
```

Expected output:
```
tests/test_auth_phone_first.py::test_send_otp_success PASSED
tests/test_auth_phone_first.py::test_send_otp_invalid_phone PASSED
tests/test_auth_phone_first.py::test_verify_otp_success PASSED
tests/test_auth_phone_first.py::test_verify_otp_wrong_code PASSED
tests/test_auth_phone_first.py::test_signup_complete_creates_user PASSED
tests/test_auth_phone_first.py::test_signup_complete_missing_auth PASSED
tests/test_auth_phone_first.py::test_signup_complete_invalid_name PASSED
tests/test_auth_phone_first.py::test_duplicate_signup PASSED

====== 8 passed in 2.34s ======
```

---

## What to Watch For

### Console Output (Backend)
When Step 1 (send-otp) is called, you should see in the backend logs:
```
INFO:     127.0.0.1:54321 - "POST /api/auth/send-otp HTTP/1.1" 200
INFO:__main__:MOCK OTP for +918765432109: 123456
```

The mock OTP is **always "123456"** for testing.

### Database (MongoDB)
After Step 3, check that user was created:
```bash
# In MongoDB shell or mongosh
db.users.findOne({ phone_primary: "+918765432109" })
```

Expected fields:
```javascript
{
  id: "uuid-here",
  phone_primary: "+918765432109",
  phone_verified: true,
  email: null,
  name: "Raj Kumar",
  role: "worker",
  avatar_color: "#FF6B6B",
  created_at: "2026-05-10T14:30:00Z",
  migration_status: "phone_primary"
}
```

---

## Troubleshooting

### Error: "Phone and OTP are required" (verify-otp)
**Cause:** Phone or OTP field missing or empty  
**Fix:** Make sure both `phone` (format: +91XXXXXXXXXX) and `otp` (6 digits) are provided

### Error: "Invalid OTP"
**Cause:** OTP code doesn't match  
**Fix:** Use exactly "123456" (the mock OTP) or check backend logs for the generated OTP

### Error: "Token expired"
**Cause:** OTP token is older than 15 minutes (send-otp) or 24 hours (verify-otp)  
**Fix:** Start fresh with a new send-otp request

### Error: "Already registered"
**Cause:** Same phone number already has an account  
**Fix:** Use a different phone number for testing (e.g., +918765432110)

### Error: "Port 8000 already in use"
**Cause:** Backend is already running  
**Fix:** Kill the process or use a different port
```bash
lsof -i :8000  # Find process
kill -9 <PID>  # Kill it
```

---

## Test Scenario: Full User Journey

```bash
# 1. Customer signup (different phone)
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'

# Complete signup as CUSTOMER
curl -X POST http://localhost:8000/api/auth/signup-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <otp_token>" \
  -d '{"name": "Priya Patel", "role": "customer"}'

# 2. Worker signup (different phone)
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918765432111"}'

# Verify OTP
curl -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918765432111", "otp": "123456"}'

# Complete signup as WORKER
curl -X POST http://localhost:8000/api/auth/signup-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <otp_token>" \
  -d '{"name": "Raj Kumar", "role": "worker", "preferred_language": "hi"}'
```

✓ Now you have 1 customer + 1 worker account, both with phone-primary auth!

---

## Success Criteria ✓

- [ ] Backend starts without errors
- [ ] POST /api/auth/send-otp returns otp_token
- [ ] POST /api/auth/verify-otp with "123456" returns new otp_token
- [ ] POST /api/auth/signup-complete creates user with phone_primary
- [ ] Mock OTP "123456" appears in backend logs
- [ ] All 8 pytest tests pass
- [ ] User document in MongoDB has phone_primary as identifier

---

## Next Steps (After Testing)

Once tests pass:

1. **Database Indexes** - Run the MongoDB index creation commands (in PHASE_1_IMPLEMENTATION_SUMMARY.md)
2. **Frontend** - Begin implementing the 3-screen signup flow
3. **Integration** - Test the full flow from frontend → backend → database

---

