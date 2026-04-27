import uuid

from fastapi import APIRouter, Depends, HTTPException, Response

from ..auth import create_token, get_current_user, hash_password, set_auth_cookie, verify_password
from ..db import db
from ..schemas import AuthResponse, LoginIn, RegisterIn, UserOut
from ..utils import utc_now_iso

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "village": body.village,
        "phone": body.phone,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, email)
    set_auth_cookie(response, token)

    user_out = {
        k: user_doc[k]
        for k in ["id", "email", "name", "role", "village", "phone"]
    }
    return {"user": user_out, "token": token}


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], email)
    set_auth_cookie(response, token)
    user_out = {k: user.get(k) for k in ["id", "email", "name", "role", "village", "phone"]}
    return {"user": user_out, "token": token}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {k: user.get(k) for k in ["id", "email", "name", "role", "village", "phone"]}
