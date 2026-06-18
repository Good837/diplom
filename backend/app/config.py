from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _resolve_upload_dir() -> str:
    default_upload_dir = (PROJECT_ROOT / "uploads").resolve()
    upload_dir_raw = os.getenv("UPLOAD_DIR", "").strip()
    if not upload_dir_raw:
        return str(default_upload_dir)

    upload_path = Path(upload_dir_raw)
    if not upload_path.is_absolute():
        upload_path = (PROJECT_ROOT / upload_path).resolve()
    else:
        upload_path = upload_path.resolve()
    return str(upload_path)


class Settings:
    def __init__(
        self,
        database_url: str,
        jwt_secret_key: str,
        cors_origins: list[str],
        upload_dir: str,
        max_upload_bytes: int,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        smtp_from: str,
        smtp_use_tls: bool,
        smtp_use_ssl: bool,
        frontend_url: str,
        cloudinary_cloud_name: str | None,
        cloudinary_api_key: str | None,
        cloudinary_api_secret: str | None,
    ):
        self.database_url = database_url
        self.jwt_secret_key = jwt_secret_key
        self.cors_origins = cors_origins
        self.upload_dir = upload_dir
        self.max_upload_bytes = max_upload_bytes
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.smtp_from = smtp_from
        self.smtp_use_tls = smtp_use_tls
        self.smtp_use_ssl = smtp_use_ssl
        self.frontend_url = frontend_url
        self.cloudinary_cloud_name = cloudinary_cloud_name
        self.cloudinary_api_key = cloudinary_api_key
        self.cloudinary_api_secret = cloudinary_api_secret

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)

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

        upload_dir = _resolve_upload_dir()

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

        smtp_host = os.getenv("SMTP_HOST", "").strip()
        smtp_user = os.getenv("SMTP_USER", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        smtp_from = os.getenv("SMTP_FROM", "").strip()
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")

        missing_mail = [
            name
            for name, value in {
                "SMTP_HOST": smtp_host,
                "SMTP_USER": smtp_user,
                "SMTP_PASSWORD": smtp_password,
                "SMTP_FROM": smtp_from,
                "FRONTEND_URL": frontend_url,
            }.items()
            if not value
        ]
        if missing_mail:
            raise RuntimeError(f"Не задано змінні пошти у .env: {', '.join(missing_mail)}")

        smtp_port_raw = os.getenv("SMTP_PORT", "587").strip()
        try:
            smtp_port = int(smtp_port_raw)
        except ValueError:
            raise RuntimeError("Некоректне значення SMTP_PORT у .env (очікується ціле число)")

        cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip() or None
        cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY", "").strip() or None
        cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip() or None

        return Settings(
            database_url=database_url,
            jwt_secret_key=jwt_secret_key,
            cors_origins=cors_origins,
            upload_dir=upload_dir,
            max_upload_bytes=max_upload_bytes,
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            smtp_from=smtp_from,
            smtp_use_tls=_env_bool("SMTP_USE_TLS", True),
            smtp_use_ssl=_env_bool("SMTP_USE_SSL", False),
            frontend_url=frontend_url,
            cloudinary_cloud_name=cloudinary_cloud_name,
            cloudinary_api_key=cloudinary_api_key,
            cloudinary_api_secret=cloudinary_api_secret,
        )
