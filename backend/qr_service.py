from io import BytesIO


def generate_profile_qr(profile_id: str, base_url: str) -> bytes:
    target = f"{base_url.rstrip('/')}/local-expert/{profile_id}"
    return generate_url_qr(target)


def generate_url_qr(target: str) -> bytes:
    try:
        import qrcode
    except ImportError:
        raise RuntimeError("QR generation dependencies are not installed") from None

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
