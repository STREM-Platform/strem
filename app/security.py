"""Access-token verification.

strem-user-service does not issue tokens — it only verifies the access JWT
issued by strem-auth-service, using the shared secret and algorithm.
"""

import jwt


def decode_access_token(token: str, *, secret: str, algorithm: str) -> dict[str, object]:
    """Decode and validate an access JWT, returning its claims.

    Raises `jwt.PyJWTError` (or a subclass) when the token is missing required
    claims, malformed, expired, or signed with the wrong key.
    """
    claims: dict[str, object] = jwt.decode(token, secret, algorithms=[algorithm])
    if "user_id" not in claims or "email" not in claims:
        raise jwt.InvalidTokenError("Token is missing required claims.")
    return claims
