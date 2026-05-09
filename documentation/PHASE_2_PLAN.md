# Phase 2: Worker Onboarding Redesign

**Timeline:** Weeks 7-10  
**Goal:** Reduce worker onboarding from 6 steps to 3 steps, targeting >75% completion rate

---

## Current State

**WorkerOnboarding.jsx** has **6 steps** (170 KB):
1. ✅ Name + Daily Rate
2. ✅ Phone + OTP Verification
3. ✅ Address (Pincode → Village → District/State)
4. ⚠️ Location (Map picker) - optional
5. ⚠️ Skills (Required, min 1)
6. ⚠️ Photo (Optional)

**Current Pain Points:**
- Too many screens = high dropout
- Skills forced at signup (not context-aware)
- Photo required logic unclear
- No incentives for deferred fields
- Workers can't see jobs until all steps done

---

## Phase 2 Redesign

### 3-Step Critical Path

#### Step 1: Name + Daily Rate (30 seconds)
```
┌─────────────────────────────────────┐
│  👤 Your Profile                    │
│                                     │
│  Full Name *                        │
│  ┌──────────────────────┐          │
│  │ Ramesh Kumar         │          │
│  └──────────────────────┘          │
│                                     │
│  Daily Rate (₹) *                  │
│  ┌──────────────────────┐          │
│  │ 350                  │ (default)│
│  └──────────────────────┘          │
│                                     │
│  [Next: Verify Phone]               │
└─────────────────────────────────────┘
```
- No changes from current Step 0
- Auto-fill name from signup if available
- Default rate: ₹350/day

#### Step 2: Phone + OTP (45 seconds)
```
┌─────────────────────────────────────┐
│  📱 Verify Your Phone               │
│  We use this to send job alerts.    │
│                                     │
│  Phone Number *                     │
│  ┌──────────────────────┐          │
│  │ +91 9876543210 ✓     │ (verified)
│  └──────────────────────┘          │
│  (Pre-filled from signup)            │
│                                     │
│  Already verified ✓                  │
│  [Next: Where are you?]              │
│                                     │
│  Need to change?                    │
│  [Send OTP] → [Verify]              │
└─────────────────────────────────────┘
```
- Pre-filled from phone signup
- If already verified: skip OTP, show badge, proceed
- If not verified: show OTP flow
- Allow skip but show that jobs need verification

#### Step 3: Address + Pincode (60 seconds)
```
┌─────────────────────────────────────┐
│  📍 Where are you?                  │
│  Customers nearby will find you.    │
│                                     │
│  Pincode *                          │
│  ┌──────────────────────┐          │
│  │ 400001 ✓             │          │
│  └──────────────────────┘          │
│                                     │
│  District (auto)                    │
│  Mumbai                             │
│                                     │
│  State (auto)                       │
│  Maharashtra                        │
│                                     │
│  Village/Area *                     │
│  ┌──────────────────────┐          │
│  │ Ramnagar             │          │
│  └──────────────────────┘          │
│                                     │
│  [Finish Setup]                     │
│                                     │
│  ✓ You can now see job feed!        │
└─────────────────────────────────────┘
```
- Pincode auto-lookup (existing hook)
- Auto-fill district + state (readonly)
- Village/town required
- No location map (defer or optional)

**[✓ CRITICAL PATH COMPLETE - Worker ready for job feed!]**

---

### Deferred Collection (Just-In-Time)

#### Skill Selection Modal
**Trigger:** First visit to `/worker/job-feed`

```
┌─────────────────────────────────────┐
│  🎯 Filter jobs by your skills      │
│                                     │
│  What can you do? (Select at least 1)
│                                     │
│  [x] Mason                          │
│  [ ] Carpenter                      │
│  [ ] Painter                        │
│                                     │
│  [⊗] Agriculture                    │
│  [⊗] Electrical                     │
│  ...                                │
│                                     │
│  [Apply Filter & See Jobs]          │
│  [Skip - show all jobs]             │
└─────────────────────────────────────┘
```

**Implementation:**
- Modal triggered on job feed first visit
- Allow skip ("Show all jobs")
- Store selection for filtering
- Save to worker profile

**Backend:**
- `PATCH /workers/profile` with `structured_skills`
- Make skills optional if not set yet
- Filter job feed even without skills (show all)

#### Photo Upload Modal
**Trigger:** One of:
1. First booking received
2. Customer clicks on worker profile
3. 7-day nudge via WhatsApp

```
┌─────────────────────────────────────┐
│  📸 Add Profile Photo               │
│  (Boosts your booking rate by 35%)  │
│                                     │
│  [Your Avatar/Initials]             │
│                                     │
│  📷 Take Photo                      │
│  🖼️ Choose from Gallery             │
│                                     │
│  [Skip for now]                     │
└─────────────────────────────────────┘
```

**Implementation:**
- Show benefit: "35% more bookings with photo"
- Fall back to initial avatar if skipped
- Store in worker profile
- Can be updated anytime from dashboard

#### Location Map (Optional)
**Trigger:** Custom job alert creation or dashboard settings

- Move from critical path
- Optional, not required
- Show benefit: "Better matches nearby"

---

## Component Changes

### Frontend Files to Modify

#### `/frontend/src/pages/WorkerOnboarding.jsx`
**Changes:**
- Remove Step 3 (Location Map) from critical path
- Remove Step 4 (Skills) from critical path  
- Remove Step 5 (Photo) from critical path
- Keep only: Name → Phone → Address (3 steps total)
- Rename "Complete setup" to "See Job Feed"
- Redirect to `/worker/job-feed` instead of `/worker/dashboard`

**Before:**
```javascript
const STEPS = [
  { id: "name", label: "Your Name", icon: User },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "address", label: "Address", icon: MapPin },
  { id: "location", label: "Location", icon: Navigation },
  { id: "skills", label: "Skills", icon: Briefcase },
  { id: "photo", label: "Profile Photo", icon: Camera },
];
```

**After:**
```javascript
const STEPS = [
  { id: "name", label: "Your Name", icon: User },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "address", label: "Address", icon: MapPin },
];
```

**Key updates:**
- Remove Step 3, 4, 5 (location, skills, photo)
- Update `handleSubmit()` to only save name + phone + address
- Skip creating worker profile until job feed (or immediately with minimal data)
- Change final redirect: `/worker/dashboard` → `/worker/job-feed`

#### Create `/frontend/src/components/SkillSelectorModal.jsx` (NEW)
**Purpose:** Modal for selecting skills on job feed first visit

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `onSave: (skills: Array) => void`
- `initialSkills?: Array`

**Features:**
- Grid of skill categories with multi-select
- Show already selected count
- Allow skip
- Save button disabled until min 1 skill selected

**Logic:**
```javascript
// In WorkerJobFeed.jsx
const [showSkillSelector, setShowSkillSelector] = useState(true);

useEffect(() => {
  if (worker?.structured_skills?.length === 0) {
    setShowSkillSelector(true); // Show modal on first visit
  }
}, [worker]);
```

#### Create `/frontend/src/components/PhotoUploadModal.jsx` (NEW)
**Purpose:** Modal for uploading profile photo

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `onSave: (file: File) => void`
- `currentPhoto?: string`

**Features:**
- Show current avatar or placeholder
- Take photo button (camera input)
- Choose from gallery button (file input)
- Preview before upload
- Show benefit: "+35% bookings with photo"
- Allow skip

**Logic:**
```javascript
// Trigger when:
// 1. User receives first booking
// 2. Profile viewed by customer
// 3. 7-day reminder via WhatsApp
```

#### Modify `/frontend/src/pages/WorkerJobFeed.jsx`
**Add:**
- Check if worker has skills on mount
- Show SkillSelectorModal if no skills
- Pass `onSkillsSelected` handler

**New state:**
```javascript
const [showSkillSelector, setShowSkillSelector] = useState(false);
const [showPhotoUpload, setShowPhotoUpload] = useState(false);

useEffect(() => {
  if (!worker?.structured_skills?.length) {
    setShowSkillSelector(true); // First time
  }
  if (!worker?.photo_url) {
    // Check if should show photo nudge
    // (received booking or profile viewed)
  }
}, [worker]);
```

---

## Backend Changes

### `/backend/routers/workers.py`

#### Modify `POST /workers/profile`
**Current:** Requires many fields (skills, daily_rate, etc.)

**New:** Allow partial creation
```python
@router.post("/workers/profile")
async def create_worker_profile(
    request: Request,
    body: WorkerProfileIn,
    user: dict = Depends(get_current_user)
):
    """Create/update worker profile - all fields optional except user_id"""
    
    # Allow partial update
    profile_doc = {
        "user_id": user["id"],
        "daily_rate": body.daily_rate or 350,  # default
        "structured_skills": body.structured_skills or [],  # empty OK
        "skills": [s.lower() for s in (body.skills or [])],
        "availability_status": "available",
        "updated_at": utc_now_iso(),
    }
    
    # Optional fields
    if body.village:
        profile_doc["village"] = body.village
    if body.district:
        profile_doc["district"] = body.district
    if body.state:
        profile_doc["state"] = body.state
    if body.lat and body.lng:
        profile_doc["lat"] = body.lat
        profile_doc["lng"] = body.lng
    # ... etc
    
    await db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": profile_doc},
        upsert=True
    )
    return {"profile": profile_doc}
```

#### Modify `PATCH /workers/profile`
**Current:** Unknown if exists

**New:** Add partial update endpoint
```python
@router.patch("/workers/profile")
async def update_worker_profile(
    request: Request,
    body: dict,
    user: dict = Depends(get_current_user)
):
    """Partial update of worker profile"""
    
    update_data = {}
    
    # Only update fields that are provided
    if "structured_skills" in body:
        update_data["structured_skills"] = body["structured_skills"]
        update_data["skills"] = [s["skill"].lower() for s in body["structured_skills"]]
    
    if "photo_url" in body:
        update_data["photo_url"] = body["photo_url"]
    
    if "bio" in body:
        update_data["bio"] = body["bio"]
    
    if "daily_rate" in body:
        update_data["daily_rate"] = body["daily_rate"]
    
    # ... other fields
    
    if not update_data:
        return {"error": "No fields to update"}
    
    update_data["updated_at"] = utc_now_iso()
    
    await db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": update_data}
    )
    
    updated = await db.workers.find_one({"user_id": user["id"]})
    return {"profile": updated}
```

#### Add `POST /workers/me/photo` endpoint
**Purpose:** Upload profile photo

```python
@router.post("/workers/me/photo")
async def upload_worker_photo(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload and store worker profile photo"""
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save to static/uploads/{user_id}_{filename}
    filename = f"{user['id']}_{file.filename}"
    filepath = f"static/uploads/{filename}"
    
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Store URL in worker profile
    photo_url = f"/static/uploads/{filename}"
    await db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": {"photo_url": photo_url, "updated_at": utc_now_iso()}}
    )
    
    return {"photo_url": photo_url}
```

#### Modify `GET /workers/me/profile`
**Ensure** it returns partial profiles gracefully
- Don't require skills to exist
- Return empty array if skills not set
- Handle missing optional fields

---

## Database Changes

### `/backend/db.py` - Indexes & Schema

#### Workers Collection - Make Fields Optional
```python
# Existing: some fields required
# New: only user_id + daily_rate (with default)

db.workers.schema = {
    user_id: string (required),
    daily_rate: int (default: 350),
    village: string (optional),
    district: string (optional),
    state: string (optional),
    structured_skills: array (default: []),
    skills: array (default: []),
    photo_url: string (optional),
    bio: string (optional),
    availability_status: enum (default: 'available'),
    created_at: date,
    updated_at: date,
    # ... other fields
}
```

**Migration script** (if needed):
```javascript
db.workers.updateMany(
  { structured_skills: { $exists: false } },
  { $set: { structured_skills: [], skills: [] } }
);
```

---

## Testing Strategy

### Phase 2 Test Suite: `tests/test_worker_onboarding_phase2.py`

```python
# Test scenarios:

def test_worker_onboarding_3_step_flow():
    """Complete 3-step onboarding (name → phone → address)"""
    # 1. Enter name + daily rate → proceed
    # 2. Phone already verified (from signup) → proceed
    # 3. Enter pincode → auto-fill district/state → complete
    # 4. Redirect to job feed
    # 5. Verify worker profile has: name, phone_verified, address, daily_rate
    # 6. Verify worker profile missing: skills (empty), photo_url (null), bio (null)

def test_skill_selector_modal_on_job_feed():
    """Skills modal appears on first job feed visit"""
    # 1. Complete onboarding (3 steps)
    # 2. Redirect to /worker/job-feed
    # 3. Verify SkillSelectorModal appears (isOpen=true)
    # 4. Select 2 skills → save
    # 5. Verify worker.structured_skills updated
    # 6. Modal closes

def test_skill_selector_skip():
    """Worker can skip skill selection"""
    # 1. Modal appears on job feed
    # 2. Click "Skip, show all jobs"
    # 3. Modal closes
    # 4. Job feed shows all jobs (no skill filter)
    # 5. Worker can still add skills later

def test_photo_upload_modal_trigger_on_booking():
    """Photo modal shows after first booking"""
    # 1. Worker receives booking
    # 2. PhotoUploadModal appears (isOpen=true)
    # 3. Allow upload → save
    # 4. Verify worker.photo_url updated
    # 5. Modal closes

def test_photo_upload_optional():
    """Worker can skip photo upload"""
    # 1. Modal appears
    # 2. Click "Skip for now"
    # 3. Modal closes
    # 4. Worker profile continues working
    # 5. Avatar shows initials (fallback)

def test_phone_verification_in_onboarding():
    """Phone already verified from signup - should skip OTP"""
    # 1. User signed up with phone
    # 2. phone_verified = true
    # 3. Enter onboarding
    # 4. Step 2: Phone pre-filled + badge "✓ Verified"
    # 5. Click continue (no OTP prompt)
    # 6. Proceed to Step 3

def test_phone_verification_in_onboarding_unverified():
    """Phone not verified - show OTP flow"""
    # 1. User somehow reached onboarding without verified phone
    # 2. Step 2: Phone field empty or unverified
    # 3. Enter phone → send OTP
    # 4. Verify OTP → proceed

def test_onboarding_completion_time():
    """Median onboarding time < 5 minutes"""
    # Measure actual duration from start to job feed redirect
    # Target: 3-5 minutes (vs current 10-15 minutes)

def test_worker_profile_partial_state():
    """Worker profile valid with partial data"""
    # After 3-step onboarding:
    # {
    #   name: "Ramesh",
    #   phone_primary: "+918765432150",
    #   phone_verified: true,
    #   address: { pincode: "400001", district: "Mumbai", state: "Maharashtra", village: "Ramnagar" },
    #   daily_rate: 350,
    #   structured_skills: [],  # empty initially
    #   photo_url: null,
    #   bio: null
    # }
    # This should NOT fail - all fields are optional except the core identity
```

### Manual Testing Checklist

- [ ] Start `/signup` → complete phone-first flow
- [ ] Get redirected to `/worker/onboarding`
- [ ] See 3-step progress bar (not 6)
- [ ] Step 1: Enter name + rate → Continue
- [ ] Step 2: Phone pre-filled, shows "✓ Verified" → Continue
- [ ] Step 3: Enter pincode → auto-fill district/state → Complete
- [ ] Redirect to `/worker/job-feed`
- [ ] See SkillSelectorModal appear
- [ ] Select 2 skills → Save
- [ ] Modal closes, job feed loads with filtered jobs
- [ ] Receive booking → PhotoUploadModal appears
- [ ] Upload photo OR skip
- [ ] Verify in DB: skills saved, photo saved (or null)

---

## Success Metrics

| Metric | Target | Current | Improvement |
|--------|--------|---------|-------------|
| **Completion Rate** | >75% | ~50% | +50% |
| **Median Time** | <5 min | ~10-15 min | -67% |
| **Drop-off at Step 2** | <5% | ~20% | -75% |
| **Drop-off at Step 3** | <10% | ~30% | -67% |
| **Skills Added (deferred)** | >60% within 7 days | N/A | New metric |
| **Photo Added (deferred)** | >40% within 14 days | ~35% | +5% |

---

## Implementation Order

1. **Frontend (Days 1-3):**
   - [ ] Simplify `WorkerOnboarding.jsx` → 3 steps
   - [ ] Create `SkillSelectorModal.jsx`
   - [ ] Create `PhotoUploadModal.jsx`
   - [ ] Update `WorkerJobFeed.jsx` to show modals
   - [ ] Test all modals trigger correctly

2. **Backend (Days 2-3):**
   - [ ] Make worker profile fields optional
   - [ ] Add `POST /workers/me/photo` endpoint
   - [ ] Update `GET /workers/me/profile` to handle partial profiles
   - [ ] Test partial profile creation

3. **Testing (Days 4-5):**
   - [ ] Run test suite (`test_worker_onboarding_phase2.py`)
   - [ ] Manual testing: Full flow end-to-end
   - [ ] Measure completion rates
   - [ ] Collect user feedback

4. **Deployment (Day 6):**
   - [ ] Deploy to staging
   - [ ] Run smoke tests
   - [ ] Deploy to production
   - [ ] Monitor metrics

---

## Risk Mitigation

### Risk: Worker can't see jobs without skills
**Mitigation:** Job feed shows all jobs initially; skill filter is optional. Modal appears but "Skip" button allows bypassing.

### Risk: Incomplete profile breaks matching algorithm
**Mitigation:** Ensure matching works with partial profiles (no required fields beyond pincode). Test extensively.

### Risk: Photo upload fails silently
**Mitigation:** Show clear error messages. Make photo optional so failures don't block onboarding.

### Risk: Modal doesn't appear (browser caching)
**Mitigation:** Use React state + localStorage flag. Check `worker.structured_skills.length === 0` on every mount.

---

## Rollout Strategy

### Phase 2a (Weeks 7-8): Implement & Internal Testing
- Build all components
- Run test suite
- Manual testing with team

### Phase 2b (Weeks 8-9): Beta Testing
- Deploy to 100 test workers
- Monitor completion rates
- Collect feedback
- Fix bugs

### Phase 2c (Week 10): Full Rollout
- Deploy to production
- Celebrate 🎉
- Monitor metrics for 2 weeks

---

## Follow-Up: Phase 3 Preview

Once Phase 2 is complete:
- **Marketplace & Jobs** (Weeks 11-16) - Customers can post jobs
- **Worker Job Feed** (Weeks 11-16) - Display matching jobs
- **Booking System** - Customer hires worker

---

**Document Created:** 2026-05-10  
**Status:** Ready for implementation
