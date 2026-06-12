from __future__ import annotations

import smtplib
from email.message import EmailMessage

from flask import current_app

from .errors import APIError


def _smtp_send(message: EmailMessage) -> None:
    host = current_app.config["SMTP_HOST"]
    port = int(current_app.config["SMTP_PORT"])
    user = current_app.config["SMTP_USER"]
    password = current_app.config["SMTP_PASSWORD"]
    use_tls = bool(current_app.config.get("SMTP_USE_TLS", True))
    use_ssl = bool(current_app.config.get("SMTP_USE_SSL", False))

    if use_ssl:
        with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
            if user and password:
                smtp.login(user, password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(host, port, timeout=30) as smtp:
        if use_tls:
            smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.send_message(message)


def send_verification_email(*, to_email: str, raw_token: str) -> None:
    frontend_url = str(current_app.config.get("FRONTEND_URL", "")).rstrip("/")
    verify_url = f"{frontend_url}/verify-email?token={raw_token}"

    subject = "Підтвердження email — TastyHub"
    body = (
        "Вітаємо в TastyHub!\n\n"
        "Щоб завершити реєстрацію, підтвердьте свою електронну адресу за посиланням:\n"
        f"{verify_url}\n\n"
        "Посилання дійсне 24 години.\n"
        "Якщо ви не реєструвалися на TastyHub, проігноруйте цей лист."
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["SMTP_FROM"]
    message["To"] = to_email
    message.set_content(body)

    try:
        _smtp_send(message)
    except (smtplib.SMTPException, OSError) as exc:
        current_app.logger.exception(
            "SMTP send failed for verification email to %s via %s:%s",
            to_email,
            current_app.config.get("SMTP_HOST"),
            current_app.config.get("SMTP_PORT"),
        )
        raise APIError("Не вдалося надіслати лист підтвердження. Спробуйте пізніше", 503) from exc
