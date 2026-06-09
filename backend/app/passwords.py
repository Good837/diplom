from __future__ import annotations

import bcrypt
from werkzeug.security import check_password_hash as werkzeug_check


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password_hash: str, password: str) -> bool:
    if password_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except ValueError:
            return False
    return werkzeug_check(password_hash, password)


def needs_rehash(password_hash: str) -> bool:
    return not password_hash.startswith("$2")
