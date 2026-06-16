import json
import structlog
import httpx
from openai import AsyncOpenAI

from src.config import settings

logger = structlog.get_logger()


class LLMClient:
    def __init__(self):
        self._vllm_client: AsyncOpenAI | None = None
        self._gemini_api_key: str = settings.gemini_api_key

    @property
    def vllm_client(self) -> AsyncOpenAI:
        if self._vllm_client is None:
            self._vllm_client = AsyncOpenAI(
                base_url=f"{settings.vllm_url}/v1",
                api_key="not-needed",
            )
        return self._vllm_client

    async def generate(
        self,
        prompt: str,
        system: str = "",
        model: str = "",
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        if settings.llm_provider == "vllm" or settings.llm_provider == "rocm":
            return await self._generate_vllm(prompt, system, model or "qwen3-8b", temperature, max_tokens)
        if self._gemini_api_key:
            return await self._generate_gemini(prompt, system, temperature, max_tokens)
        logger.warning("no_llm_available_using_mock", prompt=prompt[:100])
        return self._mock_response(prompt)

    async def _generate_vllm(
        self, prompt: str, system: str, model: str, temperature: float, max_tokens: int
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await self.vllm_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            logger.error("vllm_call_failed", error=str(e))
            if self._gemini_api_key:
                return await self._generate_gemini(prompt, system, temperature, max_tokens)
            return self._mock_response(prompt)

    async def _generate_gemini(
        self, prompt: str, system: str, temperature: float, max_tokens: int
    ) -> str:
        model_name = settings.gemini_model or "gemini-2.0-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self._gemini_api_key}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json=body)
                data = resp.json()
                if resp.status_code != 200:
                    err = data.get("error", {}).get("message", str(data))
                    logger.error("gemini_api_error", status=resp.status_code, error=err)
                    return self._mock_response(prompt)
                candidates = data.get("candidates", [])
                if candidates:
                    return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception as e:
            logger.error("gemini_call_failed", error=str(e))
        return self._mock_response(prompt)

    def _mock_response(self, prompt: str) -> str:
        return json.dumps({
            "analysis": "Mock LLM response. Configure VLLM_URL or GEMINI_API_KEY for real inference.",
            "prompt_truncated": prompt[:200],
        })

    async def generate_json(
        self,
        prompt: str,
        system: str = "",
        model: str = "qwen3-8b",
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> dict:
        json_prompt = f"{prompt}\n\nRespond with valid JSON only. No markdown, no explanation."
        result = await self.generate(json_prompt, system, model, temperature, max_tokens)
        result = result.strip().removeprefix("```json").removesuffix("```").strip()
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            logger.error("llm_json_parse_failed", result=result[:500])
            return {"error": "Failed to parse LLM response as JSON", "raw": result[:500]}


llm_client = LLMClient()
