from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..authz import get_current_user
from ..errors import APIError
from ..extensions import db

uploads_bp = Blueprint("uploads", __name__)

_ALLOWED_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
_ALLOWED_MIMES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _get_max_upload_bytes() -> int:
    value = current_app.config.get("MAX_CONTENT_LENGTH", None)
    if isinstance(value, int) and value > 0:
        return value
    # Fallback; should normally be set by app config.
    return 5 * 1024 * 1024


def _get_upload_root() -> Path:
    raw = current_app.config.get("UPLOAD_FOLDER", None)
    if not raw:
        raise APIError("Завантаження файлів не налаштовано на сервері", 500)
    return Path(str(raw)).resolve()


def _sniff_image_type(first_bytes: bytes) -> str | None:
    # Minimal magic-byte checks to avoid accepting non-images with spoofed extensions.
    if first_bytes.startswith(b"\xFF\xD8\xFF"):
        return "jpeg"
    if first_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if first_bytes.startswith(b"GIF87a") or first_bytes.startswith(b"GIF89a"):
        return "gif"
    # WEBP: RIFF....WEBP
    if len(first_bytes) >= 12 and first_bytes[0:4] == b"RIFF" and first_bytes[8:12] == b"WEBP":
        return "webp"
    return None


def _validate_image_upload(file: FileStorage | None) -> tuple[str, str]:
    if not file:
        raise APIError("Некоректні дані", 400, details={"missing": ["file"]})
    if not file.filename:
        raise APIError("Некоректні дані", 400, details={"missing": ["file"]})

    # Size limit: MAX_CONTENT_LENGTH will reject big requests, but we also guard common cases.
    max_bytes = _get_max_upload_bytes()
    if request.content_length is not None and request.content_length > max_bytes:
        raise APIError("Файл занадто великий", 413, details={"max_bytes": max_bytes})

    filename = secure_filename(file.filename)
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
    if ext not in _ALLOWED_EXTS:
        raise APIError(
            "Непідтримуваний формат зображення",
            400,
            details={"allowed_extensions": sorted(_ALLOWED_EXTS)},
        )

    mimetype = (file.mimetype or "").lower()
    if mimetype and mimetype not in _ALLOWED_MIMES:
        raise APIError(
            "Непідтримуваний тип файлу",
            400,
            details={"allowed_mimetypes": sorted(_ALLOWED_MIMES)},
        )

    # Sniff first bytes (does not fully validate image, but blocks obvious spoofing).
    head = file.stream.read(16)
    file.stream.seek(0)
    kind = _sniff_image_type(head)
    if kind is None:
        raise APIError("Файл не схожий на зображення", 400)

    # Prefer extension consistent with detected type.
    if kind == "jpeg":
        normalized_ext = "jpg"
    else:
        normalized_ext = kind

    return normalized_ext, kind


def _save_image(file: FileStorage, subdir: str, prefix: str) -> str:
    ext, _kind = _validate_image_upload(file)

    root = _get_upload_root()
    target_dir = (root / subdir).resolve()
    # Ensure it stays under root.
    if root not in target_dir.parents and target_dir != root:
        raise APIError("Некоректний шлях для завантаження", 400)

    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{prefix}_{uuid4().hex}.{ext}"
    path = target_dir / name
    file.save(path)

    # URL served by app route: /uploads/<subdir>/<filename>
    return f"/uploads/{subdir}/{name}"


@uploads_bp.post("/avatar")
@jwt_required()
def upload_avatar():
    file = request.files.get("file")
    url = _save_image(file, subdir="avatars", prefix="avatar")
    user = get_current_user()
    user.avatar_url = url
    db.session.commit()
    return jsonify({"avatar_url": url}), 201


@uploads_bp.post("/recipe-image")
@jwt_required()
def upload_recipe_image():
    file = request.files.get("file")
    url = _save_image(file, subdir="recipes", prefix="recipe")
    return jsonify({"image_url": url}), 201

