# Phase 1: Detailed Endpoint Specification
## Phone-First OTP Signup (Weeks 1-6)

**Current State:** Email-based registration + login  
**Target State:** Phone + OTP signup, minimal required fields

---

## 1. New Pydantic Schemas

### 1.1 Request/Response Schemas

File: `backend/schemas.py` — add these schemas:

```python
# ============ PHONE-FIRST AUTH SCHEMAS ============

class SendOTPRequest(BaseModel):
    """Step 1: User provides phone number"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$', description="Phone with +91 prefix")

class SendOTPResponse(BaseModel):
    """Response: OTP sent, token for verification"""
    otp_token: str  # Temporary token, valid for 15 minutes
    expires_in: int = 900  # 15 minutes in seconds
    message: str = "OTP sent successfully"

class VerifyOTPRequest(BaseModel):
    """Step 2: User provides OTP received"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    otp: str = Field(..., regex=r'^[0-9]{6}$', description="6-digit OTP")

class VerifyOTPResponse(BaseModel):
    """Response: OTP verified, ready for profile completion"""
    otp_token: str  # Valid for 24 hours, used in signup-complete endpoint
    created_user: bool  # False if user is new, True if returning user attempting reauth

class SignupCompleteRequest(BaseModel):
    """Step 3: Complete signup with name + role"""
    name: str = Field(..., min_length=2, max_length=100)
    role: Literal["worker", "customer"]
    password: Optional[str] = Field(None, min_length=8, description="Optional - OTP auth supported")
    preferred_language: Optional[str] = "en"

class AuthResponse(BaseModel):  # REUSE existing
    """Final response: user created, logged in"""
    user: UserOut
    access_token: str  # JWT token for subsequent requests
    refresh_token: Optional[str] = None  # For refresh flow (future)

class UserOut(BaseModel):  # MODIFY existing
    """User response (no sensitive data)"""
    id: str
    phone_primary: str  # NEW: phone as primary identifier
    email: Optional[str] = None  # CHANGED: now optional
    phone_verified: bool  # NEW
    name: str
    role: str
    pincode: Optional[str] = None
    address: Optional[Address] = None
    photo_url: Optional[str] = None
    preferred_language: str
    avatar_color: Optional[str] = None  # NEW: for fallback avatar
    created_at: str  # NEW: account creation timestamp
```

### 1.2 Internal OTP Storage Schema

MongoDB collection: `otps` (temporary, cleaned up after verification)

```python
# For database queries only (not exposed to API)
{
    "_id": ObjectId,
    "phone": "+918XXXXXXXXX",  # indexed, unique
    "otp": "123456",
    "otp_token": "uuid-string",  # JWT token for OTP verification
    "token_expires_at": "2026-05-10T12:34:56Z",
    "verification_attempts": 0,  # rate limiting
    "created_at": "2026-05-10T12:15:00Z",
    "sent_via": "whatsapp",  # whatsapp | sms | voice
    "fallback_attempted": false  # whether SMS/voice fallback was used
}
```

---

## 2. Endpoint Specifications

### 2.1 POST /api/auth/send-otp
**Goal:** Initiate OTP flow by sending code to user's phone

**URL Path:** `POST /api/auth/send-otp`

**Request:**
```json
{
  "phone": "+918765432109"
}
```

**Validation:**
- Phone must match regex `^\+91[0-9]{10}$` (India only for now)
- Rate limit: 5 per minute per IP
- Rate limit: 3 per 5 minutes per phone number (prevent OTP spam)

**Success Response (200):**
```json
{
  "otp_token": "eyJhbGc...(JWT valid 15 min)...",
  "expires_in": 900,
  "message": "OTP sent successfully"
}
```

**Errors:**
| Code | Reason | Response |
|------|--------|----------|
| 400 | Invalid phone format | `{"detail": "Invalid phone number. Use +91XXXXXXXXXX"}` |
| 429 | Rate limit exceeded (IP) | `{"detail": "Too many attempts. Try again in 1 minute"}` |
| 429 | Rate limit exceeded (phone) | `{"detail": "OTP already sent. Request new one after 5 minutes"}` |
| 500 | OTP provider failure (MSG91 down) | `{"detail": "Failed to send OTP. Try again later"}` |

**Backend Logic:**
```python
@router.post("/send-otp", response_model=SendOTPResponse)
@limiter.limit("5/minute")  # IP-based
async def send_otp(request: Request, body: SendOTPRequest):
    phone = body.phone
    
    # Check phone-based rate limit (max 3 requests per 5 min)
    recent_otps = await db.otps.find(
        {"phone": phone, "created_at": {"$gt": utc_now_iso(now - 300)}}  # last 5 min
    ).count_documents()
    if recent_otps >= 3:
        raise HTTPException(status_code=429, detail="Too many OTP requests")
    
    # Generate 6-digit OTP
    otp_code = f"{random.randint(0, 999999):06d}"
    
    # Generate temporary token (valid 15 min)
    otp_token = create_temp_token(phone, expires_in=900)
    
    # Store OTP in database
    await db.otps.update_one(
        {"phone": phone},
        {
            "$set": {
                "phone": phone,
                "otp": otp_code,
                "otp_token": otp_token,
                "token_expires_at": utc_now_iso(now + 900),
                "verification_attempts": 0,
                "sent_via": "whatsapp",  # Will try whatsapp first
                "created_at": utc_now_iso()
            }
        },
        upsert=True
    )
    
    # Send OTP (multi-channel fallback)
    try:
        await send_otp_whatsapp(phone, otp_code)
        await db.otps.update_one({"phone": phone}, {"$set": {"sent_via": "whatsapp"}})
    except WhatsAppError:
        try:
            await send_otp_sms(phone, otp_code)
            await db.otps.update_one({"phone": phone}, {"$set": {"sent_via": "sms"}})
        except SMSError:
            await send_otp_voice(phone, otp_code)
            await db.otps.update_one({"phone": phone}, {"$set": {"sent_via": "voice"}})
    
    logger.info(f"OTP sent to {phone} via {sent_via}")
    
    return {
        "otp_token": otp_token,
        "expires_in": 900,
        "message": "OTP sent successfully"
    }
```

**OTP Delivery Channels (Phase 1 MVP = Mock Only):**
- Phase 1: Mock all channels (just log to console)
- Phase 2 (Week 4-5): Integrate MSG91 WhatsApp API
- Phase 2: Add SMS fallback (Exotel)
- Phase 3: Add voice OTP fallback

**For Phase 1 Testing:**
```python
async def send_otp_whatsapp(phone, otp_code):
    # MOCK: Just log
    logger.info(f"MOCK WhatsApp OTP: {otp_code}")
    # In real implementation:
    # response = await msg91_client.whatsapp_otp(phone, otp_code)
    # if response.status != 200:
    #     raise WhatsAppError("Failed to send WhatsApp OTP")

async def send_otp_sms(phone, otp_code):
    # MOCK: Just log
    logger.info(f"MOCK SMS OTP: {otp_code}")
    # In real implementation:
    # response = await msg91_client.sms_otp(phone, otp_code)

async def send_otp_voice(phone, otp_code):
    # MOCK: Just log
    logger.info(f"MOCK Voice OTP: {otp_code}")
    # In real implementation:
    # response = await exotel_client.voice_otp(phone, otp_code)
```

---

### 2.2 POST /api/auth/verify-otp
**Goal:** Verify OTP, mark phone as verified, return token for signup completion

**URL Path:** `POST /api/auth/verify-otp`

**Request:**
```json
{
  "phone": "+918765432109",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "otp_token": "eyJhbGc...(JWT valid 24 hours)...",
  "created_user": false
}
```
- `created_user=false`: First time user, proceed to signup-complete
- `created_user=true`: User exists (returning user, attempting re-login)

**Errors:**
| Code | Reason | Response |
|------|--------|----------|
| 400 | Invalid phone/OTP format | `{"detail": "Phone and OTP are required"}` |
| 401 | OTP mismatch | `{"detail": "Invalid OTP"}` |
| 401 | OTP expired | `{"detail": "OTP expired. Request a new one"}` |
| 429 | Too many failed attempts | `{"detail": "Too many failed attempts. Try again after 15 min"}` |

**Backend Logic:**
```python
@router.post("/verify-otp", response_model=VerifyOTPResponse)
@limiter.limit("10/minute")  # More lenient than send
async def verify_otp(request: Request, body: VerifyOTPRequest):
    phone = body.phone
    otp_code = body.otp
    
    # Retrieve OTP record
    otp_record = await db.otps.find_one({"phone": phone})
    if not otp_record:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check expiry
    if datetime.fromisoformat(otp_record["token_expires_at"]) < datetime.utcnow():
        await db.otps.delete_one({"phone": phone})
        raise HTTPException(status_code=401, detail="OTP expired")
    
    # Check if too many failed attempts
    if otp_record.get("verification_attempts", 0) >= 5:
        await db.otps.delete_one({"phone": phone})
        raise HTTPException(status_code=429, detail="Too many failed attempts")
    
    # Verify OTP
    if otp_record["otp"] != otp_code:
        await db.otps.update_one(
            {"phone": phone},
            {"$inc": {"verification_attempts": 1}}
        )
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # OTP correct! Check if user exists
    existing_user = await db.users.find_one({"phone_primary": phone})
    created_user = existing_user is not None
    
    # Create new OTP token valid for 24 hours (for signup-complete flow)
    new_otp_token = create_temp_token(phone, expires_in=86400)
    
    # Store new token in otps record (overwrite old OTP)
    await db.otps.update_one(
        {"phone": phone},
        {
            "$set": {
                "otp_token": new_otp_token,
                "token_expires_at": utc_now_iso(now + 86400),
                "verified_at": utc_now_iso(),
                "otp": None  # Clear the old OTP
            }
        }
    )
    
    logger.info(f"OTP verified for {phone}. User exists: {created_user}")
    
    return {
        "otp_token": new_otp_token,
        "created_user": created_user
    }
```

**Token Mechanism:**
- `otp_token` is a JWT that proves "this phone number was verified"
- Valid for 24 hours (allows user to step away and come back)
- Checked in `/signup-complete` endpoint
- Must be decoded and validated before creating user

---

### 2.3 POST /api/auth/signup-complete
**Goal:** Finalize signup with name + role, create user account

**URL Path:** `POST /api/auth/signup-complete`

**Headers Required:**
```
Authorization: Bearer <otp_token from verify-otp>
```

**Request:**
```json
{
  "name": "Raj Kumar",
  "role": "worker",
  "password": "SecurePassword123",  // optional, OTP auth supported
  "preferred_language": "hi"  // optional, defaults to "en"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "phone_primary": "+918765432109",
    "email": null,
    "phone_verified": true,
    "name": "Raj Kumar",
    "role": "worker",
    "pincode": null,
    "address": null,
    "photo_url": null,
    "preferred_language": "hi",
    "avatar_color": "#FF6B6B",
    "created_at": "2026-05-10T12:45:00Z"
  },
  "access_token": "eyJhbGc...(JWT valid 30 days)...",
  "refresh_token": null
}
```

**Errors:**
| Code | Reason | Response |
|------|--------|----------|
| 401 | Missing/invalid Authorization header | `{"detail": "Authorization required"}` |
| 401 | otp_token expired or invalid | `{"detail": "Verification expired. Start over"}` |
| 400 | Name missing or too short | `{"detail": "Name must be 2-100 characters"}` |
| 400 | Invalid role | `{"detail": "Role must be 'worker' or 'customer'"}` |
| 409 | User already exists (edge case) | `{"detail": "This phone is already registered. Login instead"}` |
| 400 | Password too weak | `{"detail": "Password must be 8+ characters"}` |

**Backend Logic:**
```python
@router.post("/signup-complete", response_model=AuthResponse)
async def signup_complete(
    request: Request,
    body: SignupCompleteRequest,
    auth_header: str = Header(...)  # "Bearer <otp_token>"
):
    # Validate Authorization header
    try:
        token = auth_header.replace("Bearer ", "")
        phone = verify_temp_token(token)  # Decode JWT, extract phone
    except JWTError:
        raise HTTPException(status_code=401, detail="Authorization expired")
    
    # Validate request body
    if not 2 <= len(body.name) <= 100:
        raise HTTPException(status_code=400, detail="Name invalid")
    if body.role not in ["worker", "customer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if body.password and len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password too weak")
    
    # Check if user already exists (should not happen, but edge case)
    existing = await db.users.find_one({"phone_primary": phone})
    if existing:
        raise HTTPException(status_code=409, detail="Already registered")
    
    # Create user document
    user_id = str(uuid.uuid4())
    avatar_color = generate_avatar_color(body.name)  # Hash initials to color
    user_doc = {
        "id": user_id,
        "phone_primary": phone,
        "phone_verified": True,
        "email": None,  # Optional, can be added later
        "email_verified": False,
        "name": body.name,
        "role": body.role,
        "password_hash": hash_password(body.password) if body.password else None,
        "pincode": None,
        "address": None,
        "photo_url": None,
        "preferred_language": body.preferred_language or "en",
        "avatar_color": avatar_color,
        "created_at": utc_now_iso(),
        "migration_status": "phone_primary"
    }
    
    # Insert into users collection
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_token(user_id, phone)
    
    # Clean up OTP record
    await db.otps.delete_one({"phone": phone})
    
    logger.info(f"User created: {user_id} via phone signup")
    
    return {
        "user": user_doc,
        "access_token": access_token,
        "refresh_token": None
    }
```

---

## 3. MongoDB Schema Changes

### 3.1 Users Collection - Index Changes

**Current indexes:**
```javascript
db.users.createIndex({ "email": 1 }, { unique: true })
```

**New indexes (add these):**
```javascript
// Primary identifier
db.users.createIndex({ "phone_primary": 1 }, { unique: true })

// Supporting queries
db.users.createIndex({ "phone_verified": 1 })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "created_at": -1 })

// Keep existing email index but make sparse (allow nulls)
db.users.dropIndex("email_1")
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true })
```

### 3.2 Users Collection - Field Changes

Add to every user document:

```javascript
{
  // EXISTING (keep these)
  id: UUID,
  email: String (now optional/null),
  password_hash: String,
  name: String,
  role: "worker" | "customer",
  created_at: ISO8601,
  
  // NEW - Phone-First
  phone_primary: String (unique, required) // "+91" + 10 digits
  phone_verified: Boolean (default: false),
  
  // NEW - Visual
  avatar_color: String (e.g., "#FF6B6B") // Color for fallback avatar
  
  // NEW - Audit
  migration_status: "phone_primary" | "migrated" | "email_only"
}
```

### 3.3 OTPs Collection - New

```javascript
db.createCollection("otps", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["phone", "otp_token"],
      properties: {
        _id: { bsonType: "objectId" },
        phone: { bsonType: "string" },
        otp: { bsonType: "string" },  // Will be nulled after verification
        otp_token: { bsonType: "string" },  // JWT token
        token_expires_at: { bsonType: "date" },
        verification_attempts: { bsonType: "int", default: 0 },
        sent_via: { enum: ["whatsapp", "sms", "voice"] },
        verified_at: { bsonType: "date" },
        created_at: { bsonType: "date" }
      }
    }
  }
});

// TTL index: auto-delete expired OTPs after 24 hours
db.otps.createIndex({ "created_at": 1 }, { expireAfterSeconds: 86400 })

// Query index
db.otps.createIndex({ "phone": 1 }, { unique: true })
```

---

## 4. Frontend Changes

### 4.1 Frontend Auth Flow (3 Screens)

**Screen 1: Phone Entry**
```javascript
// frontend/src/pages/PhoneSignup.jsx
const [phone, setPhone] = useState("");
const [loading, setLoading] = useState(false);
const navigate = useNavigate();

const handleSendOTP = async () => {
  setLoading(true);
  try {
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: `+91${phone}` })
    });
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem("otp_token", data.otp_token);
      navigate("/auth/verify-otp", { state: { phone } });
    } else {
      setError(data.detail);
    }
  } finally {
    setLoading(false);
  }
};

return (
  <div className="auth-form">
    <h1>Join KaamNow</h1>
    <div className="phone-input">
      <span>+91</span>
      <input
        type="tel"
        placeholder="Enter 10-digit number"
        maxLength="10"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={loading}
      />
    </div>
    <button onClick={handleSendOTP} disabled={phone.length !== 10 || loading}>
      {loading ? "Sending..." : "Send OTP"}
    </button>
  </div>
);
```

**Screen 2: OTP Verification**
```javascript
// frontend/src/pages/OTPVerify.jsx
const [otp, setOtp] = useState("");
const [loading, setLoading] = useState(false);
const [resendTimer, setResendTimer] = useState(0);
const { state } = useLocation();
const phone = state?.phone;

const handleVerifyOTP = async () => {
  setLoading(true);
  try {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: `+91${phone}`, otp })
    });
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem("otp_token", data.otp_token);
      navigate("/auth/signup-complete", { state: { phone, created_user: data.created_user } });
    } else {
      setError(data.detail);
    }
  } finally {
    setLoading(false);
  }
};

return (
  <div className="auth-form">
    <h1>Enter OTP</h1>
    <p>Sent to {phone}</p>
    <input
      type="text"
      placeholder="000000"
      maxLength="6"
      inputMode="numeric"
      value={otp}
      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
      disabled={loading}
    />
    <button onClick={handleVerifyOTP} disabled={otp.length !== 6}>
      Verify
    </button>
    {resendTimer > 0 && <p>Resend available in {resendTimer}s</p>}
  </div>
);
```

**Screen 3: Profile Completion**
```javascript
// frontend/src/pages/SignupComplete.jsx
const [name, setName] = useState("");
const [role, setRole] = useState("worker");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const { state } = useLocation();
const navigate = useNavigate();

const handleSignupComplete = async () => {
  const otp_token = localStorage.getItem("otp_token");
  
  setLoading(true);
  try {
    const response = await fetch("/api/auth/signup-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${otp_token}`
      },
      body: JSON.stringify({ name, role, password })
    });
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.removeItem("otp_token");
      
      if (role === "worker") {
        navigate("/worker/onboarding");
      } else {
        navigate("/marketplace");
      }
    } else {
      setError(data.detail);
    }
  } finally {
    setLoading(false);
  }
};

return (
  <div className="auth-form">
    <h1>Create Your Profile</h1>
    <input
      type="text"
      placeholder="Your name"
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
    <div className="role-toggle">
      <button onClick={() => setRole("customer")} className={role === "customer" ? "active" : ""}>
        I need workers
      </button>
      <button onClick={() => setRole("worker")} className={role === "worker" ? "active" : ""}>
        I am a worker
      </button>
    </div>
    <input
      type="password"
      placeholder="Password (optional)"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <button onClick={handleSignupComplete} disabled={!name || loading}>
      {loading ? "Creating..." : "Start Using KaamNow"}
    </button>
  </div>
);
```

### 4.2 Auth Context Changes

```javascript
// frontend/src/contexts/AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    // Phone signup flow state
    signupStep: "phone",  // "phone" | "otp" | "profile" | "complete"
    phone: null,
    otpToken: null,  // From verify-otp response
    
    // Logged-in state
    user: null,
    accessToken: localStorage.getItem("access_token"),
    isAuthenticated: !!localStorage.getItem("access_token"),
    
    // UI state
    error: null,
    loading: false
  });

  const login = async (phone, otp) => {
    // Step 1: Send OTP
    // Step 2: Verify OTP
    // Step 3: Get access token (if user exists, after password-less or password auth)
  };

  const signupStart = (phone) => {
    setAuthState(prev => ({ ...prev, signupStep: "otp", phone }));
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("otp_token");
    setAuthState(prev => ({ ...prev, user: null, isAuthenticated: false }));
  };

  return (
    <AuthContext.Provider value={{ authState, signupStart, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 5. Testing Data & Dummy Data Cleanup

### 5.1 Dummy Data to Remove

**Current dummy users (from seed.py):**
- Remove all users with email-based signup (they'll be recreated with phone)
- Keep worker/customer test data structure (reuse for new phone-based tests)

**Affected files:**
- `backend/seed.py` → Clean and rewrite for phone-first
- `tests/test_current_flows.py` → Update auth tests for phone + OTP
- `tests/test_phases_*.py` → Update RegisterIn/LoginIn usage

### 5.2 New Test Data

```python
# backend/test_data.py (new file)

TEST_PHONE_CUSTOMER = "+918765432101"
TEST_PHONE_WORKER = "+918765432102"
TEST_OTP_CODE = "123456"  # Mock OTP for testing
TEST_NAMES = {
    "+918765432101": "Priya Patel",  # Customer
    "+918765432102": "Raj Kumar"     # Worker
}

async def create_test_user(phone: str, role: str, db):
    """Helper: Create phone-based test user"""
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "phone_primary": phone,
        "phone_verified": True,
        "email": None,
        "name": TEST_NAMES.get(phone, "Test User"),
        "role": role,
        "pincode": None,
        "address": None,
        "photo_url": None,
        "preferred_language": "en",
        "created_at": utc_now_iso(),
        "migration_status": "phone_primary"
    }
    await db.users.insert_one(user_doc)
    return user_doc
```

### 5.3 Test Cases for Phase 1

**File:** `tests/test_auth_phone_first.py`

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.asyncio
async def test_send_otp_success():
    """Test: /send-otp returns otp_token"""
    response = client.post("/api/auth/send-otp", json={"phone": "+918765432109"})
    assert response.status_code == 200
    assert "otp_token" in response.json()
    assert response.json()["expires_in"] == 900

@pytest.mark.asyncio
async def test_send_otp_invalid_phone():
    """Test: Invalid phone format rejected"""
    response = client.post("/api/auth/send-otp", json={"phone": "8765432109"})  # missing +91
    assert response.status_code == 400
    assert "Invalid phone" in response.json()["detail"]

@pytest.mark.asyncio
async def test_verify_otp_success():
    """Test: /verify-otp returns new otp_token for signup"""
    # Send OTP first
    send_resp = client.post("/api/auth/send-otp", json={"phone": "+918765432109"})
    
    # Verify OTP (mock OTP is "123456")
    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": "+918765432109",
        "otp": "123456"
    })
    assert verify_resp.status_code == 200
    assert "otp_token" in verify_resp.json()
    assert verify_resp.json()["created_user"] == False  # new user

@pytest.mark.asyncio
async def test_signup_complete_creates_user():
    """Test: /signup-complete creates user + returns access token"""
    # Send OTP → Verify OTP → Complete signup
    send_resp = client.post("/api/auth/send-otp", json={"phone": "+918765432109"})
    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": "+918765432109",
        "otp": "123456"
    })
    otp_token = verify_resp.json()["otp_token"]
    
    # Complete signup
    complete_resp = client.post(
        "/api/auth/signup-complete",
        json={"name": "Test User", "role": "worker"},
        headers={"Authorization": f"Bearer {otp_token}"}
    )
    assert complete_resp.status_code == 200
    user = complete_resp.json()["user"]
    assert user["phone_primary"] == "+918765432109"
    assert user["phone_verified"] == True
    assert user["name"] == "Test User"
    assert user["role"] == "worker"
    assert "access_token" in complete_resp.json()

@pytest.mark.asyncio
async def test_verify_otp_wrong_code():
    """Test: Wrong OTP rejected"""
    client.post("/api/auth/send-otp", json={"phone": "+918765432109"})
    
    verify_resp = client.post("/api/auth/verify-otp", json={
        "phone": "+918765432109",
        "otp": "999999"  # wrong
    })
    assert verify_resp.status_code == 401
    assert "Invalid OTP" in verify_resp.json()["detail"]

@pytest.mark.asyncio
async def test_otp_rate_limit():
    """Test: Rate limiting on OTP requests"""
    for i in range(6):  # Try 6 times (limit is 5/min)
        response = client.post("/api/auth/send-otp", json={"phone": "+918765432109"})
        if i < 5:
            assert response.status_code == 200
        else:
            assert response.status_code == 429  # Too many requests
```

---

## 6. Implementation Checklist

- [ ] Add new Pydantic schemas to `backend/schemas.py`
- [ ] Create `backend/utils/otp.py` module for OTP generation + token creation
- [ ] Update `backend/routers/auth.py` with new endpoints
- [ ] Create `backend/utils/avatar.py` for color generation
- [ ] Add OTP collection indexes in migration
- [ ] Create `tests/test_auth_phone_first.py` with comprehensive tests
- [ ] Implement frontend: Phone entry, OTP verify, Profile complete screens
- [ ] Update `AuthContext` for phone-first flow
- [ ] Update routing: `/auth/signup` → new 3-screen flow
- [ ] Update `seed.py` to create phone-based test users
- [ ] Document: API endpoints in PHASE_1_ENDPOINT_SPEC.md (this file)
- [ ] Integration test: Full flow phone signup → access token
- [ ] Manual test: Test with dummy OTP "123456"
- [ ] Performance: Measure OTP send latency
- [ ] Security review: OTP token generation, rate limiting

---

## 7. Database Migration Script

**File:** `backend/migrations/001_add_phone_first.py`

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_up():
    """Add phone-first support to users collection"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.kaamnow_db
    
    # 1. Add phone_primary index
    await db.users.create_index([("phone_primary", 1)], unique=True)
    
    # 2. Add supporting indexes
    await db.users.create_index([("phone_verified", 1)])
    await db.users.create_index([("role", 1)])
    
    # 3. Make email sparse (allow nulls)
    await db.users.drop_index("email_1")
    await db.users.create_index([("email", 1)], unique=True, sparse=True)
    
    # 4. Create OTPs collection
    await db.create_collection("otps")
    await db.otps.create_index([("phone", 1)], unique=True)
    await db.otps.create_index([("created_at", 1)], expireAfterSeconds=86400)
    
    print("✓ Migration complete")

async def migrate_down():
    """Rollback (remove phone-first support)"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.kaamnow_db
    
    # Drop new collection + indexes
    await db.otps.drop()
    await db.users.drop_index("phone_primary_1")
    
    # Restore email unique constraint
    await db.users.create_index([("email", 1)], unique=True)
    
    print("✓ Rollback complete")

if __name__ == "__main__":
    asyncio.run(migrate_up())
```

---

## 8. Deployment Notes

**Phase 1 Deployment Order:**
1. Deploy backend code (new endpoints, but old ones still work)
2. Deploy database migrations (add indexes + OTPs collection)
3. Deploy frontend (new signup flow)
4. Monitor: OTP delivery, signup completion rate, errors

**Backwards Compatibility:**
- Existing `/register` endpoint stays (for email signups) → deprecated but functional
- Existing `/login` endpoint stays (email + password) → deprecated but functional
- New endpoints coexist, customers can choose signup method

**Rollback Plan:**
- If OTP provider fails: revert to email-based signup (existing flow)
- If phone duplication issues: pause new signups, investigate migrations

---

## 9. Success Metrics (Phase 1)

| Metric | Target | Baseline |
|--------|--------|----------|
| OTP send success rate | >99% | N/A |
| OTP verification success rate | >95% | N/A |
| Signup completion time | <3 min | ~5 min (email-based) |
| Signup funnel completion | >80% | ~60% (current) |
| OTP send latency (p99) | <1 sec | N/A |
| Server errors during signup | <0.1% | N/A |

---

