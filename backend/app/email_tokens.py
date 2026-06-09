from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from .errors import APIError
from .extensions import db
from .models import EmailVerificationToken, User, utcnow

TOKEN_TTL = timedelta(hours=24)


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def clear_tokens_for_user(user_id: int) -> None:
    EmailVerificationToken.query.filter_by(user_id=user_id).delete()


def issue_verification_token(user: User) -> str:
    clear_tokens_for_user(user.id)
    raw_token = secrets.token_urlsafe(32)
    row = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=utcnow() + TOKEN_TTL,
    )
    db.session.add(row)
    return raw_token


def verify_email_token(raw_token: str) -> User:
    token = str(raw_token or "").strip()
    if not token:
        raise APIError("Некоректні дані", 400, details={"missing": ["token"]})

    row = EmailVerificationToken.query.filter_by(token_hash=hash_token(token)).first()
    if not row:
        raise APIError("Недійсне або прострочене посилання підтвердження", 400)

    user = User.query.get(row.user_id)
    if not user:
        raise APIError("Користувача не знайдено", 404)

    if user.email_verified:
        return user

    if row.expires_at < utcnow():
        db.session.delete(row)
        db.session.commit()
        raise APIError("Посилання підтвердження прострочене. Надішліть лист повторно", 400)

    user.email_verified = True
    return user
