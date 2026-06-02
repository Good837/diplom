from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from .config import Settings
from .errors import register_error_handlers
from .extensions import cors, db, jwt, migrate
from .routes.auth import auth_bp
from .routes.categories import categories_bp
from .routes.comments import comments_bp
from .routes.recipes import recipes_bp
from .routes.uploads import uploads_bp
from .routes.users import users_bp


def create_app() -> Flask:
    app = Flask(__name__)

    settings = Settings.from_env()
    app.config.update(
        SQLALCHEMY_DATABASE_URI=settings.database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=settings.jwt_secret_key,
        UPLOAD_FOLDER=settings.upload_dir,
        MAX_CONTENT_LENGTH=settings.max_upload_bytes,
    )

    app.json.ensure_ascii = False

    # Ensure upload directory exists (and its parent chain).
    Path(str(app.config["UPLOAD_FOLDER"])).mkdir(parents=True, exist_ok=True)

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": settings.cors_origins}},
        supports_credentials=False,
    )
    db.init_app(app)
    # Import models so Alembic can discover metadata.
    from . import models  # noqa: F401

    migrate.init_app(app, db)
    jwt.init_app(app)

    register_error_handlers(app)

    @jwt.unauthorized_loader
    def _jwt_missing(_reason: str):
        return jsonify({"error": "Потрібна авторизація"}), 401

    @jwt.invalid_token_loader
    def _jwt_invalid(_reason: str):
        return jsonify({"error": "Недійсний токен авторизації"}), 401

    @jwt.expired_token_loader
    def _jwt_expired(_jwt_header: dict, _jwt_payload: dict):
        return jsonify({"error": "Термін дії токена минув"}), 401

    @jwt.needs_fresh_token_loader
    def _jwt_needs_fresh(_jwt_header: dict, _jwt_payload: dict):
        return jsonify({"error": "Потрібна повторна авторизація"}), 401

    @jwt.revoked_token_loader
    def _jwt_revoked(_jwt_header: dict, _jwt_payload: dict):
        return jsonify({"error": "Токен відкликано"}), 401

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(comments_bp, url_prefix="/api/comments")
    app.register_blueprint(recipes_bp, url_prefix="/api/recipes")
    app.register_blueprint(uploads_bp, url_prefix="/api/uploads")
    app.register_blueprint(users_bp, url_prefix="/api/users")

    @app.get("/uploads/<path:filename>")
    def serve_upload(filename: str):
        upload_root = Path(str(app.config["UPLOAD_FOLDER"])).resolve()
        return send_from_directory(upload_root, filename)

    @app.get("/api/health")
    def health():
        return jsonify({"message": "OK"})

    return app
