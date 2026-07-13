"""
Utility helpers: QR code generation and profile image storage.
"""
import os
import uuid
import qrcode

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
QR_DIR = os.path.join(STATIC_DIR, "qrcodes")
PROFILE_DIR = os.path.join(STATIC_DIR, "profiles")

os.makedirs(QR_DIR, exist_ok=True)
os.makedirs(PROFILE_DIR, exist_ok=True)


def generate_qr_code(qr_uuid: str, app_base_url: str) -> str:
    """
    Generate a PNG QR code encoding a deep link to the user's chat-start URL,
    e.g. https://yourapp.com/chat/{qr_uuid}. Saves it under static/qrcodes
    and returns the relative path.

    Note: the QR encodes only the opaque UUID identifier -- never the
    username, email, or password -- so scanning it cannot leak credentials.
    """
    deep_link = f"{app_base_url}/chat/{qr_uuid}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(deep_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    filename = f"{qr_uuid}.png"
    filepath = os.path.join(QR_DIR, filename)
    img.save(filepath)

    return f"static/qrcodes/{filename}"


def save_profile_image(file_bytes: bytes, original_filename: str, user_id: int) -> str:
    """Save an uploaded profile image to disk and return its relative path."""
    ext = os.path.splitext(original_filename)[1] or ".jpg"
    filename = f"user_{user_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PROFILE_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"static/profiles/{filename}"
