from io import BytesIO


def generate_profile_qr(worker_id: str, base_url: str) -> bytes:
    try:
        import qrcode
    except ImportError as exc:
        raise RuntimeError("qrcode is required to generate profile QR codes") from exc

    target = f"{base_url.rstrip('/')}/local-expert/{worker_id}"
    image = qrcode.make(target)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
