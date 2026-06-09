from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from ..email_tokens import issue_verification_token, verify_email_token
from ..errors import APIError
from ..extensions import db
from ..mailer import send_verification_email
from ..models import User
from ..passwords import hash_password, needs_rehash, verify_password

auth_bp = Blueprint("auth", __name__)

RESEND_MESSAGE = "Якщо акаунт існує і email не підтверджено, лист надіслано повторно"


def _require_fields(data: dict, fields: list[str]) -> None:
    missing = [f for f in fields if not str(data.get(f, "")).strip()]
    if missing:
        raise APIError("Некоректні дані", 400, details={"missing": missing})


def _send_verification(user: User) -> None:
    raw_token = issue_verification_token(user)
    db.session.flush()
    send_verification_email(to_email=user.email, raw_token=raw_token)


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    _require_fields(data, ["username", "email", "password"])

    username = str(data["username"]).strip()
    email = str(data["email"]).strip().lower()
    password = str(data["password"])

    if len(password) < 6:
        raise APIError("Пароль має містити щонайменше 6 символів", 400)

    if User.query.filter_by(email=email).first():
        raise APIError("Цей email уже використовується", 409)
    if User.query.filter_by(username=username).first():
        raise APIError("Це ім'я користувача вже зайняте", 409)

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        email_verified=False,
    )
    db.session.add(user)
    db.session.flush()

    try:
        _send_verification(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({"message": "На вашу пошту надіслано лист для підтвердження email"}), 201


@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True) or {}
    token = str(data.get("token") or "").strip()
    if not token:
        raise APIError("Некоректні дані", 400, details={"missing": ["token"]})

    user = verify_email_token(token)
    db.session.commit()
    access_token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "message": "Email успішно підтверджено",
            "access_token": access_token,
            "user": user.to_private_dict(),
        }
    )


@auth_bp.post("/resend-verification")
def resend_verification():
    data = request.get_json(silent=True) or {}
    _require_fields(data, ["email"])

    email = str(data["email"]).strip().lower()
    user = User.query.filter_by(email=email).first()

    if user and not user.email_verified:
        try:
            _send_verification(user)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    return jsonify({"message": RESEND_MESSAGE})


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    _require_fields(data, ["email", "password"])

    email = str(data["email"]).strip().lower()
    password = str(data["password"])

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(user.password_hash, password):
        raise APIError("Невірний email або пароль", 401)

    if not user.email_verified:
        raise APIError(
            "Підтвердіть email перед входом. Перевірте пошту або надішліть лист повторно",
            403,
            details={"code": "email_not_verified"},
        )

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify(
        {
            "message": "Вхід успішний",
            "access_token": token,
            "user": user.to_private_dict(),
        }
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id is not None else None
    if not user:
        raise APIError("Користувача не знайдено", 404)
    return jsonify({"user": user.to_private_dict()})
