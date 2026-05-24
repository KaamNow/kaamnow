from io import BytesIO


def generate_profile_qr(profile_id: str, base_url: str) -> bytes:
    target = f"{base_url.rstrip('/')}/local-expert/{profile_id}"
    return generate_url_qr(target)


_FALLBACK_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff"
    b"\x3f\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"
)


def generate_url_qr(target: str) -> bytes:
    try:
        import qrcode
        from PIL import Image as PILImage
    except ImportError:
        return _FALLBACK_PNG

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(target)
    qr.make(fit=True)

    # make_image with explicit fill/back colours always returns an RGB(A) image
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
