from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM API Keys
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "vedant"
    postgres_password: str = ""
    postgres_db: str = "chatdb"

    # MongoDB
    mongo_host: str = "localhost"
    mongo_port: int = 27017
    mongo_user: str = "vedant"
    mongo_password: str = ""
    mongo_db: str = "chatdb"
    mongo_auth_source: str = "chatdb"

    # Session
    session_ttl_minutes: int = 30

    # Dataset
    base_dataset_path: str = "./datasets"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:6009",
        "https://chatdb.vtibrewal.com",
    ]

    # Rate limiting
    max_queries_per_minute: int = 20

    model_config = {"env_file": ["../.env", ".env"], "env_file_encoding": "utf-8"}


settings = Settings()
