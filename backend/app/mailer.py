from __future__ import annotations

import json
import re
import smtplib
import urllib.error
import urllib.request
from email.message import EmailMessage

from flask import current_app

from .errors import APIError


def _parse_email_from(raw: str) -> tuple[str, str]:
    """Parse 'Name <email@example.com>' or plain email into (name, email)."""
    text = str(raw or "").strip()
    match = re.match(r"^(.*?)\s*<([^>]+)>$", text)
    if match:
        name = match.group(1).strip().strip('"').strip("'")
        email = match.group(2).strip()
        return name or "TastyHub", email
    return "TastyHub", text


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


def _brevo_send(to_email: str, subject: str, body: str) -> None:
    api_key = current_app.config["BREVO_API_KEY"]
    from_raw = current_app.config["EMAIL_FROM"]
    sender_name, sender_email = _parse_email_from(from_raw)

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=data,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.status >= 400:
                raise OSError(f"Brevo HTTP {response.status}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        current_app.logger.error("Brevo API error %s: %s", exc.code, detail)
        raise OSError(f"Brevo HTTP {exc.code}") from exc


def _dispatch_email(to_email: str, subject: str, body: str) -> None:
    provider = str(current_app.config.get("EMAIL_PROVIDER", "smtp")).lower()
    if provider == "brevo":
        _brevo_send(to_email, subject, body)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = current_app.config["EMAIL_FROM"]
    message["To"] = to_email
    message.set_content(body)
    _smtp_send(message)


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

    provider = str(current_app.config.get("EMAIL_PROVIDER", "smtp")).lower()
    try:
        _dispatch_email(to_email, subject, body)
    except (smtplib.SMTPException, OSError) as exc:
        if provider == "brevo":
            current_app.logger.exception(
                "Brevo send failed for verification email to %s",
                to_email,
            )
        else:
            current_app.logger.exception(
                "SMTP send failed for verification email to %s via %s:%s",
                to_email,
                current_app.config.get("SMTP_HOST"),
                current_app.config.get("SMTP_PORT"),
            )
        raise APIError("Не вдалося надіслати лист підтвердження. Спробуйте пізніше", 503) from exc
