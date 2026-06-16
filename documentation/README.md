# KaamNow Documentation

Organized by phase and topic. Start with the phase you're working on.

## 📚 Table of Contents

### [Phase 1: Phone-First Redesign](./phase-one/)
Complete phone-first authentication redesign replacing email with OTP-based signup.

**Status:** ✅ COMPLETE & TESTED

**Key Files:**
- [PHASE_1_COMPLETION.md](./phase-one/PHASE_1_COMPLETION.md) - **START HERE** - Folder-wise implementation summary
- [PHONE_FIRST_REDESIGN_PLAN.md](./phase-one/PHONE_FIRST_REDESIGN_PLAN.md) - Strategic roadmap for all 5 phases
- [PHASE_1_ENDPOINT_SPEC.md](./phase-one/PHASE_1_ENDPOINT_SPEC.md) - API contract details
- [PHASE_1_TESTING_GUIDE.md](./phase-one/PHASE_1_TESTING_GUIDE.md) - Manual testing walkthrough
- [PHASE_1_IMPLEMENTATION_SUMMARY.md](./phase-one/PHASE_1_IMPLEMENTATION_SUMMARY.md) - Technical implementation details

**What's Included:**
- ✅ Phone signup with OTP (WhatsApp/SMS/Voice fallback)
- ✅ OTP verification with rate limiting
- ✅ Profile completion (name + role)
- ✅ Customer onboarding (pincode → address)
- ✅ Database schema redesign (phone_primary as identifier)
- ✅ End-to-end testing

**Next:** Phase 2 (Worker Onboarding)

---

## 🗂️ Folder Structure

```
documentation/
├── README.md (this file)
└── phase-one/
    ├── README.md (Phase 1 index)
    ├── PHASE_1_COMPLETION.md ⭐ START HERE
    ├── PHONE_FIRST_REDESIGN_PLAN.md
    ├── PHASE_1_ENDPOINT_SPEC.md
    ├── PHASE_1_TESTING_GUIDE.md
    └── PHASE_1_IMPLEMENTATION_SUMMARY.md
```

---

## 📖 How to Use This Documentation

### New to the project?
1. Read [PHASE_1_COMPLETION.md](./phase-one/PHASE_1_COMPLETION.md) for folder-wise overview
2. Skim [PHONE_FIRST_REDESIGN_PLAN.md](./phase-one/PHONE_FIRST_REDESIGN_PLAN.md) for strategic context
3. Check [PHASE_1_ENDPOINT_SPEC.md](./phase-one/PHASE_1_ENDPOINT_SPEC.md) for API details

### Testing Phase 1?
- Follow [PHASE_1_TESTING_GUIDE.md](./phase-one/PHASE_1_TESTING_GUIDE.md)

### Building on Phase 1?
- Reference [PHASE_1_ENDPOINT_SPEC.md](./phase-one/PHASE_1_ENDPOINT_SPEC.md) for auth flow
- Check [PHASE_1_COMPLETION.md](./phase-one/PHASE_1_COMPLETION.md) for what's implemented

### Understanding the bigger picture?
- Read [PHONE_FIRST_REDESIGN_PLAN.md](./phase-one/PHONE_FIRST_REDESIGN_PLAN.md) for all 5 phases

---

## 🔍 Quick Reference

### Phase 1 Endpoints
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/signup-complete` - Create account with name + role

### Phase 1 Pages
- `frontend/src/pages/PhoneSignup.jsx` - 3-screen signup flow
- `frontend/src/pages/CustomerOnboarding.jsx` - Pincode entry

### Phase 1 Backend
- `backend/otp_service.py` - OTP delivery (WhatsApp/SMS/Voice)
- `backend/routers/auth.py` - Auth endpoints
- `backend/app.py` - OTP service initialization

### Phase 1 Database
- `users` collection - phone_primary as unique ID
- `otps` collection - Temporary OTP records with TTL

---

## 📅 Phase Timeline

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Phone-First Signup | ✅ COMPLETE |
| 2 | Worker Onboarding | ⏳ Next |
| 3 | Marketplace & Jobs | 📋 Planned |
| 4 | Booking & Matching | 📋 Planned |
| 5 | Ratings & Payments | 📋 Planned |

---

## 🤝 Contributing

When adding documentation:
1. Organize by phase (phase-one, phase-two, etc.)
2. Use clear folder structure
3. Link to code files where relevant
4. Update this README with new sections

---

**Last Updated:** 2026-05-10  
**Maintained By:** KaamNow Team
