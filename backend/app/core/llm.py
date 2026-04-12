"""LiteLLM wrapper — multi-provider model switching."""

import logging
import os

import litellm

from app.core.config import settings

logger = logging.getLogger(__name__)

AVAILABLE_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
    {"id": "gemini/gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "google"},
]

# Map provider to settings key
_PROVIDER_KEY_MAP = {
    "openai": "openai_api_key",
    "anthropic": "anthropic_api_key",
    "google": "google_api_key",
}


def _ensure_env_keys() -> None:
    """Set API keys as env vars so LiteLLM can discover them."""
    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    if settings.google_api_key:
        os.environ.setdefault("GEMINI_API_KEY", settings.google_api_key)


def get_available_models() -> list[dict]:
    """Return models that have a configured API key."""
    result = []
    for m in AVAILABLE_MODELS:
        key_attr = _PROVIDER_KEY_MAP.get(m["provider"], "")
        api_key = getattr(settings, key_attr, "")
        if api_key:
            result.append(m)
    return result


async def llm_completion(
    messages: list[dict],
    model: str = "gpt-4o",
) -> str:
    """Call LiteLLM async completion and return the assistant message content."""
    _ensure_env_keys()

    # Suppress LiteLLM's verbose logging
    litellm.suppress_debug_info = True

    logger.info("LLM call: model=%s, messages=%d", model, len(messages))

    response = await litellm.acompletion(
        model=model,
        messages=messages,
        temperature=0,
        max_tokens=2048,
    )
    content = response.choices[0].message.content
    return content.strip()
