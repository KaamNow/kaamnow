# Phase 2: Progressive Profiling & Modal Flows

## Overview

Phase 2 implements **just-in-time data collection** via modals, reducing onboarding friction from 10-15 minutes to <5 minutes.

**Key Change:** From 6-step onboarding to 3-step + optional modals
- Step 1: Phone OTP verification
- Step 2: Name + Address (3 minutes)
- Step 3: Job Feed (deferred skills & photo)

## Architecture

### Endpoints

| Method | Path | Purpose | Triggers |
|--------|------|---------|----------|
| POST | `/api/workers/profile` | Create/update full profile | Onboarding (3 steps) |
| GET | `/api/workers/me/profile` | Fetch current worker profile | On page load |
| PATCH | `/api/workers/profile` | Partial updates (skills, etc.) | SkillSelectorModal save |
| POST | `/api/workers/me/photo` | Upload profile photo | PhotoUploadModal save |

### Data Flow

```
┌─────────────────────┐
│  Phone Signup OTP   │
│  (Backend: auth.py) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3-Step Onboarding   │ ← POST /workers/profile
│ • Name              │   (lat, lng, skills, photo: NULL)
│ • Phone             │
│ • Address (village) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Worker Job Feed    │
│ (WorkerJobFeed.jsx) │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
  First Visit   Booking
  (oncePerUser) (engagement
                 accepted)
      │          │
      ▼          ▼
┌──────────┐  ┌──────────────┐
│ Skills   │  │ Photo Upload │
│ Modal    │  │ Modal        │
└────┬─────┘  └────┬─────────┘
     │             │
     ▼             ▼
PATCH /profile  POST /photo
```

---

## SkillSelectorModal Flow

**Location:** `frontend/src/components/SkillSelectorModal.jsx`

**Trigger Conditions:**
- User just completed 3-step onboarding
- Lands on job feed
- `GET /workers/me/profile` returns `structured_skills: []`
- Frontend state: `showSkillSelector === true`
- Only shows once per session (tracked with `firstVisit` flag)

**User Actions:**
1. Views 8 skill categories (Construction, Electrical, Agriculture, etc.)
2. Selects 1+ skills (multi-select)
3. Clicks "Save Skills" or "Skip for now"

**Save Flow (if user clicks "Save Skills"):**

```javascript
// Frontend (WorkerJobFeed.jsx)
const handleSkillsSave = async (selectedSkills) => {
  await api.patch("/workers/profile", {
    structured_skills: selectedSkills  // [{ category, skill }, ...]
  });
  setShowSkillSelector(false);
  // Reload engagements to check booking status for photo modal
};
```

**Backend Processing:**

```python
# Backend (routers/workers.py)
@router.patch("/profile", response_model=WorkerOut)
async def update_worker_profile(body: WorkerProfileIn, user: dict):
    # Only update fields in request body (exclude_unset=True)
    profile = body.model_dump(exclude_unset=True)
    profile["last_active_at"] = now
    
    # Only set structured_skills if provided
    if "structured_skills" in profile:
        profile["structured_skills"] = profile.get("structured_skills") or []
    
    # Update only the fields sent (don't touch lat/lng/daily_rate/etc.)
    db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": profile}  # Only updates: structured_skills, last_active_at
    )
```

**Response:**
```json
{
  "id": "worker-xyz",
  "name": "Ramesh Kumar",
  "structured_skills": [
    {"category": "Construction", "skill": "Mason"},
    {"category": "Construction", "skill": "Plastering"}
  ],
  "village": "Pratapgarh",
  "photo_url": null,
  "lat": null,
  "lng": null,
  "daily_rate": null,
  ...
}
```

**What the Modal Doesn't Do:**
- ❌ NOT triggered if user already has skills
- ❌ NOT required (can skip)
- ❌ Doesn't affect job matching yet (Phase 3)

---

## PhotoUploadModal Flow

**Location:** `frontend/src/components/PhotoUploadModal.jsx`

**Trigger Conditions:**
- User receives their first booking (engagement.status === "accepted")
- `GET /workers/me/profile` returns `photo_url: null`
- Frontend state: `showPhotoUpload === true`

**User Actions:**
1. Takes photo (camera) OR chooses from gallery
2. Sees preview with name initials fallback
3. Clicks "Upload Photo" or "Skip for now"
4. Sees upload progress

**Upload Flow (if user clicks "Upload Photo"):**

```javascript
// Frontend (WorkerJobFeed.jsx)
const handlePhotoUpload = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  await api.post("/workers/me/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  
  setShowPhotoUpload(false);
  // Reload profile to show updated photo_url
};
```

**Backend Processing:**

```python
# Backend (routers/workers.py)
@router.post("/workers/me/photo")
async def upload_photo(file: UploadFile, user: dict):
    # Create unique filename
    os.makedirs("static/uploads", exist_ok=True)
    file_ext = file.filename.split(".")[-1]
    filename = f"{user['id']}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join("static/uploads", filename)
    
    # Save to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/static/uploads/{filename}"
    
    # Update worker profile
    db.workers.update_one(
        {"user_id": user["id"]},
        {"$set": {"photo_url": photo_url}}
    )
    
    return {"ok": True, "photo_url": photo_url}
```

**Response:**
```json
{
  "ok": true,
  "photo_url": "/static/uploads/user-123_abcd1234.jpg"
}
```

**What the Modal Doesn't Do:**
- ❌ NOT triggered if user already has photo
- ❌ NOT required (can skip)
- ❌ Doesn't affect job matching (photo is just trust signal)

---

## Data Structure: Partial Profiles

### 3-Step Onboarding Profile
```json
{
  "id": "worker-1",
  "user_id": "user-1",
  "name": "Ramesh Kumar",
  "phone_primary": "+919876543210",
  "village": "Pratapgarh",
  "district": "",
  "state": "",
  "address": {
    "village": "Pratapgarh",
    "pincode": null,
    "block": null,
    "district": null,
    "state": null
  },
  
  "lat": null,              // ← Deferred
  "lng": null,              // ← Deferred
  "skills": [],             // ← Empty
  "structured_skills": [],  // ← Deferred to modal
  "daily_rate": null,       // ← Deferred (Phase 3+)
  "bio": "",
  "photo_url": null,        // ← Deferred to modal
  
  "available": true,
  "availability_status": "available",
  "trust_tier": 1,
  "avg_rating": 0.0,
  "total_jobs": 0,
  "created_at": "2026-05-10T...",
  "last_active_at": "2026-05-10T..."
}
```

### After SkillSelectorModal (PATCH)
```json
{
  ...
  "structured_skills": [
    {"category": "Construction", "skill": "Mason"},
    {"category": "Construction", "skill": "Plastering"}
  ],  // ← Updated
  "lat": null,
  "lng": null,
  "daily_rate": null,
  "photo_url": null
}
```

### After PhotoUploadModal (POST /photo)
```json
{
  ...
  "structured_skills": [...],
  "photo_url": "/static/uploads/user-1_abc123.jpg",  // ← Updated
  "lat": null,
  "lng": null,
  "daily_rate": null
}
```

---

## State Management (Frontend)

**WorkerJobFeed.jsx State:**

```javascript
const [showSkillSelector, setShowSkillSelector] = useState(false);
const [showPhotoUpload, setShowPhotoUpload] = useState(false);
const [workerProfile, setWorkerProfile] = useState(null);
const [firstVisit, setFirstVisit] = useState(true);

// On mount/load
useEffect(() => {
  const loadEngagements = async () => {
    const [engagements, profile] = await Promise.all([
      api.get("/api/engagements"),
      api.get("/api/workers/me/profile")
    ]);
    
    setWorkerProfile(profile);
    
    // Show skill modal if first visit AND no skills
    if (firstVisit && profile.structured_skills.length === 0) {
      setShowSkillSelector(true);
      setFirstVisit(false);
    }
    
    // Show photo modal if booking exists AND no photo
    const hasBooking = engagements.some(e => e.status === "accepted");
    if (hasBooking && !profile.photo_url) {
      setShowPhotoUpload(true);
    }
  };
}, []);
```

---

## Error Handling

### SkillSelectorModal Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "Please select at least one skill" | User clicks Save without selecting | Show error toast, keep modal open |
| 422 Validation | Schema mismatch | Retry (shouldn't happen) |
| Network error | API unreachable | Show retry button |

### PhotoUploadModal Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| "No file selected" | User clicks Upload without choosing file | Show error, keep modal open |
| File too large | Image > max size | Show size limit message |
| Invalid format | Not image/\* | Show allowed formats |
| Upload timeout | Server hung | Auto-retry or cancel |

### Both Modals

| Error | Cause | Recovery |
|-------|-------|----------|
| User no longer worker role | Permission issue | Redirect to dashboard |
| 404 Profile not found | User deleted | Reload page or logout |

---

## Testing Checklist

### Unit Tests
- [ ] WorkerProfileIn validates partial updates
- [ ] WorkerOut accepts null lat/lng/skills/photo
- [ ] PATCH /profile only updates provided fields
- [ ] POST /photo saves filename correctly

### Integration Tests
- [ ] Complete flow: signup → skills → booking → photo
- [ ] Skills modal appears only on first visit
- [ ] Skills modal doesn't appear if skills exist
- [ ] Photo modal appears when booking accepted
- [ ] Photo modal doesn't appear if photo exists
- [ ] Existing data isn't overwritten on partial update

### E2E Tests (Manual)
- [ ] New worker: complete onboarding, see skills modal
- [ ] Select skills, verify saved
- [ ] Receive booking, see photo modal
- [ ] Upload photo, verify shown in profile
- [ ] Skip skills modal, still works
- [ ] Skip photo modal, still works
- [ ] Upload photo from camera (mobile)
- [ ] Upload photo from gallery (mobile)

---

## Monitoring

**Metrics to Track:**

1. **Onboarding Completion**
   - Users who complete 3-step: ✅
   - Time to completion: <5 min expected
   - Drop-off rate: should be <20%

2. **Modal Engagement**
   - % of users seeing skill modal: depends on cohort
   - % completing skill modal: target >70%
   - % receiving booking: depends on job volume
   - % completing photo modal: target >50%

3. **Profile Enrichment**
   - % with lat/lng: 0% after phase 2 (Phase 3 adds this)
   - % with skills: >70% (via modal)
   - % with photo: >50% (via modal)
   - % with daily_rate: 0% after phase 2 (Phase 3 adds this)

4. **Errors**
   - PATCH /profile 422 errors: should be ~0%
   - POST /photo upload failures: <5%
   - Modal dismissal rate: track vs. completion

---

## Future Phases

**Phase 3: Enhanced Job Matching**
- Add lat/lng via location picker (triggered first time viewing job details)
- Add daily_rate via earnings modal (triggered after first booking)
- Use skills in job matching algorithm

**Phase 4: Ratings & Reviews**
- Photo becomes required for customer reviews
- Ratings shown in worker profile

---

## API Compatibility

| Client | Support | Notes |
|--------|---------|-------|
| Web (React) | ✅ Full | Both modals implemented |
| Mobile (Expo) | ⚠️ Partial | Skills modal ✅, Photo modal needs work |
| WhatsApp Bot | ❌ Not applicable | Skills collected via menu |

---

## FAQ

**Q: What if user skips the skills modal?**
A: Skills remain empty. Job matching doesn't use skills yet (Phase 3). User can fill later via profile edit.

**Q: What if user skips the photo modal?**
A: Photo remains null. Bookings still work. Photo is just a trust signal, not required.

**Q: Can users edit skills later?**
A: Yes, via WorkerProfile page (not yet implemented). PATCH /profile endpoint supports partial updates.

**Q: Can users delete their photo?**
A: Not yet. Would need DELETE /workers/me/photo endpoint (Phase 3+).

**Q: What happens if profile creation fails?**
A: Onboarding page stays on form, error message shown. User can retry.

**Q: Are skills and photo visible to customers?**
A: Yes, in search results and job booking flow (Phase 3+).

