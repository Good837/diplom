from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from ..errors import APIError
from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)


def _require_fields(data: dict, fields: list[str]) -> None:
    missing = [f for f in fields if not str(data.get(f, "")).strip()]
    if missing:
        raise APIError("Некоректні дані", 400, details={"missing": missing})


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
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Реєстрація успішна"}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    _require_fields(data, ["email", "password"])

    email = str(data["email"]).strip().lower()
    password = str(data["password"])

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        raise APIError("Невірний email або пароль", 401)

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
