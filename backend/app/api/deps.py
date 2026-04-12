"""Shared dependencies — session validation, DB connections."""

from fastapi import Request

from app.db.session import SessionManager


def get_session_manager(request: Request) -> SessionManager:
    return request.app.state.session_manager
