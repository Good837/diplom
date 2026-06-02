from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


class Settings:
    def __init__(
        self,
        database_url: str,
        jwt_secret_key: str,
        cors_origins: list[str],
        upload_dir: str,
        max_upload_bytes: int,
    ):
        self.database_url = database_url
        self.jwt_secret_key = jwt_secret_key
        self.cors_origins = cors_origins
        self.upload_dir = upload_dir
        self.max_upload_bytes = max_upload_bytes

    @staticmethod
    def from_env() -> "Settings":
        load_dotenv()

        database_url = os.getenv("DATABASE_URL", "").strip()
        if not database_url:
            raise RuntimeError("Не задано DATABASE_URL у .env")

        jwt_secret_key = os.getenv("JWT_SECRET_KEY", "").strip()
        if not jwt_secret_key:
            raise RuntimeError("Не задано JWT_SECRET_KEY у .env")

        cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000").strip()
        cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

        # Uploads: store locally and serve via /uploads/<path>
        # Default: <repo>/backend/uploads
        default_upload_dir = str((Path(__file__).resolve().parents[2] / "uploads").resolve())
        upload_dir = os.getenv("UPLOAD_DIR", default_upload_dir).strip() or default_upload_dir

        # Default 5MB; override via MAX_UPLOAD_BYTES or MAX_UPLOAD_MB
        max_upload_bytes_raw = (os.getenv("MAX_UPLOAD_BYTES", "") or "").strip()
        max_upload_mb_raw = (os.getenv("MAX_UPLOAD_MB", "") or "").strip()
        max_upload_bytes = 5 * 1024 * 1024
        if max_upload_bytes_raw:
            try:
                max_upload_bytes = int(max_upload_bytes_raw)
            except ValueError:
                raise RuntimeError("Некоректне значення MAX_UPLOAD_BYTES у .env (очікується ціле число)")
        elif max_upload_mb_raw:
            try:
                max_upload_bytes = int(float(max_upload_mb_raw) * 1024 * 1024)
            except ValueError:
                raise RuntimeError("Некоректне значення MAX_UPLOAD_MB у .env (очікується число)")

        return Settings(
            database_url=database_url,
            jwt_secret_key=jwt_secret_key,
            cors_origins=cors_origins,
            upload_dir=upload_dir,
            max_upload_bytes=max_upload_bytes,
        )
