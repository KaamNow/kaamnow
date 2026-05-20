from io import BytesIO

_FALLBACK_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff"
    b"\xff?\x00\x05\xfe\x02\xfeA\xe2(\x9b\x00\x00\x00\x00IEND\xaeB`\x82"
)


def generate_profile_qr(worker_id: str, base_url: str) -> bytes:
    try:
        import qrcode
    except ImportError as exc:
        return _FALLBACK_PNG

    target = f"{base_url.rstrip('/')}/local-expert/{worker_id}"
    image = qrcode.make(target)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
