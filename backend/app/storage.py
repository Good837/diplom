from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.datastructures import FileStorage

from .errors import APIError


def init_cloudinary(cloud_name: str | None, api_key: str | None, api_secret: str | None) -> None:
    if not cloud_name or not api_key or not api_secret:
        return
    try:
        import cloudinary
    except ImportError as exc:
        raise RuntimeError(
            "Задано CLOUDINARY_* у .env, але пакет cloudinary не встановлено. "
            "Виконайте: pip install -r requirements.txt"
        ) from exc
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


def cloudinary_configured() -> bool:
    return bool(
        current_app.config.get("CLOUDINARY_CLOUD_NAME")
        and current_app.config.get("CLOUDINARY_API_KEY")
        and current_app.config.get("CLOUDINARY_API_SECRET")
    )


def _get_upload_root() -> Path:
    raw = current_app.config.get("UPLOAD_FOLDER", None)
    if not raw:
        raise APIError("Завантаження файлів не налаштовано на сервері", 500)
    return Path(str(raw)).resolve()


def save_image(file: FileStorage, subdir: str, prefix: str, ext: str) -> str:
    if cloudinary_configured():
        try:
            import cloudinary.uploader
        except ImportError as exc:
            raise APIError(
                "Cloudinary не налаштовано на сервері (встановіть пакет cloudinary)",
                500,
            ) from exc
        file.stream.seek(0)
        result = cloudinary.uploader.upload(
            file,
            folder=f"tastyhub/{subdir}",
            public_id=f"{prefix}_{uuid4().hex}",
            resource_type="image",
        )
        url = result.get("secure_url") or result.get("url")
        if not url:
            raise APIError("Не вдалося завантажити зображення", 500)
        return str(url)

    root = _get_upload_root()
    target_dir = (root / subdir).resolve()
    if root not in target_dir.parents and target_dir != root:
        raise APIError("Некоректний шлях для завантаження", 400)

    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{prefix}_{uuid4().hex}.{ext}"
    path = target_dir / name
    file.stream.seek(0)
    file.save(path)
    return f"/uploads/{subdir}/{name}"
