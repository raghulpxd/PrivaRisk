import os
import httpx

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")
# Allow overriding which Ollama chat model to use via env var
CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "mistral:7b")

SYSTEM_PROMPTS = {
    "fraud": """You are a senior fraud analyst with 15 years of fintech experience. 
Analyze flagged transactions and provide clear risk assessments. Always include:
RISK LEVEL: HIGH/MEDIUM/LOW
WHY SUSPICIOUS: (2-3 sentences)
RECOMMENDED ACTION: (what to do next)
CONFIDENCE: X/10""",

    "compliance": """You are a BSA/AML compliance officer specializing in FinCEN 
regulations and Bank Secrecy Act. Identify regulatory obligations, filing requirements 
(SAR, CTR), and AML red flags. Always cite which specific regulation applies.""",

    "chat": """You are a helpful AI financial analyst assistant. Answer questions naturally and clearly.
- For general finance questions (what is stock marketing, explain bonds, etc.), answer from your own knowledge.
- If transaction statistics or document snippets are provided below, use them ONLY when they're relevant to the question.
- Do NOT mention "context", "provided context", or complain about missing data unless the user specifically asks about their own data that isn't available.
- Answer like a normal, helpful AI assistant.""",

    "document": """You are a financial document specialist. Extract key figures, 
flag risk indicators, check for compliance red flags, and provide executive summaries. 
Always use clear headers in your response.""",

    "report": """You are a financial reporting specialist writing formal compliance 
reports for banking regulators. Use professional language. Structure: 
Executive Summary, Key Findings, Risk Assessment, Recommended Actions, Conclusion."""
}

async def ask_llm(mode: str, user_message: str, context: str = "") -> str:
    system = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["chat"])
    if context:
        system += f"\n\nRelevant Context:\n{context}"
    
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{OLLAMA_BASE}/api/chat", json={
            "model": CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_message}
            ],
            "stream": False
        })
    try:
        data = resp.json()
    except ValueError:
        raise RuntimeError(f"Invalid JSON from LLM API: {resp.text}")

    if resp.status_code != 200:
        raise RuntimeError(f"LLM API HTTP {resp.status_code}: {data}")

    message = data.get("message")
    if isinstance(message, dict) and "content" in message:
        return message["content"]

    raise RuntimeError(f"Unexpected LLM API response format: {data}")