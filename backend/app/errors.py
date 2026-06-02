from __future__ import annotations

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(APIError)
    def handle_api_error(err: APIError):
        payload: dict = {"error": err.message}
        if err.details:
            payload["details"] = err.details
        return jsonify(payload), err.status_code

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        message_map = {
            400: "Некоректний запит",
            401: "Потрібна авторизація",
            403: "Недостатньо прав для цієї дії",
            404: "Ресурс не знайдено",
            405: "Метод не дозволено",
            413: "Файл занадто великий",
        }
        return jsonify({"error": message_map.get(err.code, "Сталася помилка")}), err.code

    @app.errorhandler(Exception)
    def handle_unexpected(_err: Exception):
        return jsonify({"error": "Внутрішня помилка сервера"}), 500
