"""Rate limiting and input sanitization."""

import re
import time
from collections import defaultdict

from fastapi import HTTPException, Request


class RateLimiter:
    """In-memory per-session rate limiter.

    Tracks query counts per session within a rolling 60-second window.
    """

    def __init__(self, max_per_minute: int = 20):
        self.max_per_minute = max_per_minute
        # session_id -> list of timestamps
        self._requests: dict[str, list[float]] = defaultdict(list)

    def check(self, session_id: str) -> None:
        """Check if the session is within rate limits.

        Raises HTTPException 429 if limit exceeded.
        """
        now = time.time()
        cutoff = now - 60.0

        # Prune old timestamps
        timestamps = self._requests[session_id]
        self._requests[session_id] = [t for t in timestamps if t > cutoff]

        if len(self._requests[session_id]) >= self.max_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: max {self.max_per_minute} queries per minute",
            )

        self._requests[session_id].append(now)

    def cleanup_session(self, session_id: str) -> None:
        """Remove rate limit tracking for a deleted session."""
        self._requests.pop(session_id, None)


# Singleton instance
_rate_limiter: RateLimiter | None = None


def get_rate_limiter(request: Request) -> RateLimiter:
    """FastAPI dependency to get the rate limiter instance."""
    return request.app.state.rate_limiter


# Pattern for valid identifiers (table names, column names)
_IDENTIFIER_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def sanitize_identifier(name: str) -> str:
    """Validate and return a safe identifier name.

    Raises ValueError if the name contains invalid characters.
    """
    name = name.strip()
    if not name:
        raise ValueError("Identifier cannot be empty")
    if not _IDENTIFIER_PATTERN.match(name):
        raise ValueError(
            f"Invalid identifier '{name}': only letters, digits, and underscores allowed"
        )
    return name
