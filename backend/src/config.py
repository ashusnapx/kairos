from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://kairos:kairos@localhost:5433/kairos"
    redis_url: str = "redis://localhost:6379/0"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "kairos123"
    llm_provider: str = "vllm"
    vllm_url: str = "http://localhost:8001"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"
    upload_dir: str = "/tmp/kairos-uploads"
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "allow"}


settings = Settings()
