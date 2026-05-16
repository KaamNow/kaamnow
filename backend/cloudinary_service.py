import os
try:
    import cloudinary
    import cloudinary.uploader
except ModuleNotFoundError:
    cloudinary = None

if cloudinary:
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )


def _require_cloudinary() -> None:
    if not cloudinary:
        raise RuntimeError("Cloudinary SDK is not installed")


def upload_image(file_bytes: bytes, public_id: str) -> str:
    """Upload image bytes to Cloudinary, returns secure HTTPS URL."""
    _require_cloudinary()
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=public_id,
        overwrite=True,
        folder="kaamnow/profiles",
        transformation=[
            {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
            {"quality": "auto", "fetch_format": "auto"},
        ],
    )
    return result["secure_url"]


def upload_review_image(file_bytes: bytes, public_id: str) -> str:
    """Upload optional review image bytes to Cloudinary."""
    _require_cloudinary()
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=public_id,
        overwrite=True,
        folder="kaamnow/reviews",
        transformation=[
            {"width": 1200, "height": 1200, "crop": "limit"},
            {"quality": "auto", "fetch_format": "auto"},
        ],
    )
    return result["secure_url"]


def delete_image(photo_url: str) -> None:
    """Delete a Cloudinary image by its URL (best-effort, never raises)."""
    if not photo_url or "cloudinary.com" not in photo_url:
        return
    try:
        _require_cloudinary()
        # Extract public_id from URL: .../kaamnow/profiles/user_xxx → kaamnow/profiles/user_xxx
        parts = photo_url.split("/upload/")
        if len(parts) < 2:
            return
        # Strip version segment if present (v1234567890/)
        path = parts[1]
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        # Strip extension
        public_id = path.rsplit(".", 1)[0]
        cloudinary.uploader.destroy(public_id)
    except Exception:
        pass
