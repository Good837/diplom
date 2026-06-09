from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


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
        frontend_url: str,
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
        self.frontend_url = frontend_url

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

        default_upload_dir = str((Path(__file__).resolve().parents[2] / "uploads").resolve())
        upload_dir = os.getenv("UPLOAD_DIR", default_upload_dir).strip() or default_upload_dir

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
            frontend_url=frontend_url,
        )
