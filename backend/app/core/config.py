from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM API Keys
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # Database
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "chatdb"
    postgres_password: str = "chatdb"
    postgres_db: str = "chatdb"
    mongo_host: str = "mongo"
    mongo_port: int = 27017
    mongo_db: str = "chatdb"

    # Session
    session_ttl_minutes: int = 30

    # Dataset
    base_dataset_path: str = "./datasets"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]

    # Rate limiting
    max_queries_per_minute: int = 20

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
