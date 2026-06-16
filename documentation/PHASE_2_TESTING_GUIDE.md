# Phase 2 Testing Guide

Complete walkthrough for testing the progressive profiling & modals flow.

## Quick Start (5 minutes)

### 1. Start Backend
```bash
cd backend
python -m pytest tests/test_phase_2_progressive_profiling.py -v
```

**Expected output:** All tests pass ✅

### 2. Run Frontend Dev Server
```bash
cd frontend
npm start
```

**Expected:** App loads at http://localhost:3000

### 3. Manual Testing (Web)

**Scenario: New Worker Signs Up**

1. Go to http://localhost:3000
2. Click "Sign up as Worker"
3. Enter phone: `+919876543210`
4. Complete OTP flow (use any OTP if in dev mode)
5. Enter name: `Test Worker`
6. Enter address: `Test Village` (any village)
7. Click "See Job Feed"

**Expected Results:**
- ✅ Onboarding completes in <30 seconds
- ✅ Redirects to `/worker/job-feed`
- ✅ SkillSelectorModal appears automatically
- ✅ Modal shows 8 skill categories
- ✅ Skills are multi-selectable

**Action: Select Skills**
1. Click "Mason" under Construction
2. Click "Electrician" under Electrical
3. Click "Save Skills" button

**Expected Results:**
- ✅ Toast notification: "Skills saved!"
- ✅ Modal closes
- ✅ Skills appear in profile

**Action: Skip Skills**
1. (If retesting) Close app, re-login
2. At SkillSelectorModal, click "Skip for now"

**Expected Results:**
- ✅ Modal closes without saving
- ✅ Doesn't appear again this session
- ✅ Skills remain empty

---

## Unit Test Walkthrough

### Test: Partial Profile Creation

**File:** `tests/test_phase_2_progressive_profiling.py`
**Test:** `TestThreeStepOnboarding::test_create_profile_minimal_fields`

**What it tests:**
- Profile can be created with only name, phone, village
- Missing fields (lat, lng, skills, daily_rate, photo_url) are None/empty
- No validation errors

**Run:**
```bash
pytest tests/test_phase_2_progressive_profiling.py::TestThreeStepOnboarding::test_create_profile_minimal_fields -v
```

**Expected:**
```
test_create_profile_minimal_fields PASSED ✅
- Profile has id ✓
- Profile has name ✓
- lat/lng are None ✓
- skills are [] ✓
```

---

### Test: Partial Profile Update (PATCH)

**File:** `tests/test_phase_2_progressive_profiling.py`
**Test:** `TestSkillSelectorModal::test_patch_profile_update_skills`

**What it tests:**
- PATCH /workers/profile updates only skills
- Doesn't overwrite other fields
- Preserves existing data

**Run:**
```bash
pytest tests/test_phase_2_progressive_profiling.py::TestSkillSelectorModal::test_patch_profile_update_skills -v
```

**Expected:**
```
test_patch_profile_update_skills PASSED ✅
- Skills updated to 1 item ✓
- Other fields (village, lat, daily_rate) preserved ✓
```

---

### Test: Photo URL Preservation

**File:** `tests/test_phase_2_progressive_profiling.py`
**Test:** `TestSkillSelectorModal::test_patch_preserves_existing_photo`

**What it tests:**
- When updating skills via PATCH, existing photo_url isn't deleted
- Partial updates don't overwrite fields not in request

**Run:**
```bash
pytest tests/test_phase_2_progressive_profiling.py::TestSkillSelectorModal::test_patch_preserves_existing_photo -v
```

**Expected:**
```
test_patch_preserves_existing_photo PASSED ✅
- Photo URL preserved after skills update ✓
```

---

## Integration Test Walkthrough

### Test: Complete End-to-End Flow

**File:** `tests/test_phase_2_progressive_profiling.py`
**Test:** `TestEndToEndFlow::test_signup_onboarding_modals_flow`

**What it tests:**
- Complete user journey: signup → onboarding → modals → data save
- State transitions and data consistency

**Run:**
```bash
pytest tests/test_phase_2_progressive_profiling.py::TestEndToEndFlow::test_signup_onboarding_modals_flow -v
```

**Expected:**
```
test_signup_onboarding_modals_flow PASSED ✅
- Worker created with partial profile ✓
- Skills update via PATCH works ✓
- All data persists correctly ✓
```

---

## API Testing (Postman/cURL)

### Test 1: Create 3-Step Profile

**Request:**
```bash
curl -X POST http://localhost:8000/api/workers/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "village": "TestVillage",
    "address": {"village": "TestVillage"}
  }'
```

**Expected Response:** 200 OK
```json
{
  "id": "...",
  "name": "Test User",
  "village": "TestVillage",
  "lat": null,
  "lng": null,
  "skills": [],
  "daily_rate": null,
  "photo_url": null,
  "trust_tier": 1,
  "avg_rating": 0.0,
  "total_jobs": 0
}
```

---

### Test 2: Update Skills via PATCH

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/workers/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "structured_skills": [
      {"category": "Construction", "skill": "Mason"},
      {"category": "Electrical", "skill": "Electrician"}
    ]
  }'
```

**Expected Response:** 200 OK
```json
{
  "id": "...",
  "name": "Test User",
  "structured_skills": [
    {"category": "Construction", "skill": "Mason"},
    {"category": "Electrical", "skill": "Electrician"}
  ],
  "village": "TestVillage",
  "lat": null,
  "daily_rate": null,
  "photo_url": null
}
```

---

### Test 3: Upload Photo

**Request:**
```bash
curl -X POST http://localhost:8000/api/workers/me/photo \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/photo.jpg"
```

**Expected Response:** 200 OK
```json
{
  "ok": true,
  "photo_url": "/static/uploads/user-123_abcd1234.jpg"
}
```

---

### Test 4: Get Profile with Photo

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/workers/me/profile
```

**Expected Response:** 200 OK
```json
{
  "id": "...",
  "name": "Test User",
  "photo_url": "/static/uploads/user-123_abcd1234.jpg",
  "structured_skills": [...]
}
```

---

## Frontend Component Testing

### SkillSelectorModal Tests

**File:** `frontend/src/components/SkillSelectorModal.jsx`

**Manual Test 1: Render with empty skills**
```javascript
<SkillSelectorModal 
  isOpen={true} 
  onClose={() => {}} 
  onSave={mockSave} 
  initialSkills={[]} 
/>
```

**Expected:**
- ✅ All 8 categories render
- ✅ 40+ skills visible
- ✅ "Save Skills" button disabled (no selection)
- ✅ "Skip for now" button enabled

**Manual Test 2: Select and save**
1. Click "Mason"
2. Click "Electrician"
3. Click "Save Skills"

**Expected:**
- ✅ onSave called with 2 items
- ✅ Loading state shown during save
- ✅ Modal closes after success

**Manual Test 3: Validation**
1. Click "Save Skills" without selecting
2. Expected: Error toast "Please select at least one skill"

---

### PhotoUploadModal Tests

**File:** `frontend/src/components/PhotoUploadModal.jsx`

**Manual Test 1: Camera input**
1. Click "Take a Photo"
2. Camera permission appears
3. Authorize and take photo

**Expected:**
- ✅ Preview shows captured image
- ✅ Green checkmark overlay appears
- ✅ "Upload Photo" button enabled

**Manual Test 2: Gallery input**
1. Click "Choose from Gallery"
2. Select photo from phone storage

**Expected:**
- ✅ Preview shows selected image
- ✅ Green checkmark overlay appears
- ✅ "Upload Photo" button enabled

**Manual Test 3: Upload**
1. With preview showing, click "Upload Photo"
2. Progress indicator appears

**Expected:**
- ✅ Upload progress visible
- ✅ After upload: Toast "Photo uploaded! 📸"
- ✅ Modal closes
- ✅ Profile shows new photo

---

## WorkerJobFeed Integration Tests

**File:** `frontend/src/pages/WorkerJobFeed.jsx`

**Test 1: SkillSelectorModal triggers on first visit**

**Setup:**
1. Login as new worker (no skills)
2. Land on `/worker/job-feed`

**Expected:**
- ✅ SkillSelectorModal appears
- ✅ Job list visible behind modal
- ✅ Can't interact with jobs while modal open

**Test 2: SkillSelectorModal doesn't repeat**

**Setup:**
1. Click "Skip for now" on skill modal
2. Navigate away
3. Return to job-feed

**Expected:**
- ✅ SkillSelectorModal does NOT appear again
- ✅ Can browse jobs normally

**Test 3: PhotoUploadModal triggers on booking**

**Setup:**
1. (Advanced) Accept a booking via API or test client
2. Refresh `/worker/job-feed`

**Expected:**
- ✅ PhotoUploadModal appears
- ✅ Only if: has booking AND no photo_url

**Test 4: Photo persists after upload**

**Setup:**
1. Upload photo via modal
2. Refresh page

**Expected:**
- ✅ Photo modal doesn't appear (photo exists)
- ✅ Profile shows photo URL

---

## Error Scenario Testing

### Scenario 1: Network Failure During Skill Save

**Setup:**
1. Open DevTools → Network → Throttle to "Offline"
2. Select skills, click "Save Skills"
3. Close DevTools

**Expected:**
- ✅ Error toast appears: "Failed to save skills..."
- ✅ Modal stays open
- ✅ User can retry

### Scenario 2: Invalid File Upload

**Setup:**
1. Open PhotoUploadModal
2. Try to upload non-image file (e.g., .txt)

**Expected:**
- ✅ Browser prevents non-image selection (accept="image/*")
- ✅ Or backend returns 400 error

### Scenario 3: User Loses Permission

**Setup:**
1. Login as worker
2. Admin removes worker role via backend
3. Try to save skills

**Expected:**
- ✅ 403 Forbidden response
- ✅ Error message: "You don't have permission"

---

## Performance Testing

### Load Test: Modal Response Time

**Setup:**
```bash
# Load test PATCH /profile endpoint
artillery run phase2-load-test.yml
```

**Expected:**
- ✅ PATCH /profile: p95 <500ms
- ✅ POST /photo: p95 <2s (file I/O)
- ✅ No 5xx errors

---

## Mobile Testing (iOS/Android)

### Setup: Expo Dev Client

```bash
cd mobile
npm install
npx expo start
```

Scan QR code on device, or use Expo Go app.

### Test 1: Skills Modal on Mobile

**Expected:**
- ✅ Modals render full-screen on mobile
- ✅ Scrolling works for long skill lists
- ✅ Touch interactions responsive

### Test 2: Photo Upload on Mobile

**Expected:**
- ✅ Camera permission flow works
- ✅ Gallery picker opens
- ✅ Photo preview displays
- ✅ Upload works over cellular/WiFi

---

## Regression Testing

**Before Every Release:**

```bash
# Run all phase 2 tests
pytest tests/test_phase_2_progressive_profiling.py -v

# Run existing tests to ensure no breakage
pytest tests/test_current_flows.py -v
pytest tests/test_phases_4_to_9.py -v

# Frontend type checking
cd frontend && npm run type-check
```

**Expected:**
- ✅ All tests pass
- ✅ No type errors
- ✅ No console errors in dev tools

---

## Sign-Off Checklist

**Before marking Phase 2 complete:**

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual E2E flow tested (web)
- [ ] Manual E2E flow tested (mobile)
- [ ] Error scenarios handled gracefully
- [ ] Performance acceptable (p95 <500ms)
- [ ] No regression in existing features
- [ ] Documentation complete and accurate
- [ ] Modals trigger under correct conditions only
- [ ] Data persists correctly across page reloads
- [ ] Photo upload works on mobile (camera + gallery)
- [ ] Skills selection multi-works as expected
- [ ] Skip buttons work (modals don't repeat)

---

## Debugging Tips

### Debug: Why isn't skill modal appearing?

**Checklist:**
1. Is user first-time visitor? Check `firstVisit` state
2. Does profile have skills? Check `structured_skills.length > 0`
3. Is modal imported in WorkerJobFeed? Check imports
4. Is state initialized? Check useState(false)
5. Check React DevTools: is state changing?

```javascript
// Add to WorkerJobFeed.jsx temporarily
console.log("showSkillSelector:", showSkillSelector);
console.log("firstVisit:", firstVisit);
console.log("workerProfile:", workerProfile);
console.log("skills:", workerProfile?.structured_skills?.length);
```

### Debug: Why is PATCH failing?

**Checklist:**
1. Is token valid? Check localStorage.getItem("kn_token")
2. Is Authorization header sent? Check Network tab
3. Is response 403? User might not be worker
4. Is response 404? Worker profile might not exist yet
5. Check console for error details

```bash
# Test endpoint directly
curl -X PATCH http://localhost:8000/api/workers/profile \
  -H "Authorization: Bearer $(cat token.txt)" \
  -d '{"structured_skills":[]}' -H "Content-Type: application/json" -v
```

### Debug: Why is photo upload timing out?

**Checklist:**
1. Is file too large? Try <5MB
2. Is server running? Check backend console
3. Is static/uploads dir writable? Check permissions
4. Is network slow? Try again on better connection
5. Check backend logs for errors

```bash
# Check if uploads dir exists
ls -la backend/static/uploads/

# Watch upload in real-time
tail -f backend.log | grep -i photo
```

