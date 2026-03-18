from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["models"])


class ModelInfo(BaseModel):
    id: str
    provider: str
    name: str


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


@router.get("/v1/models", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    return ModelsResponse(
        models=[
            ModelInfo(id="demo", provider="mock", name="Demo (Mock)"),
            ModelInfo(id="gpt-4o", provider="openai", name="GPT-4o"),
            ModelInfo(
                id="claude-3-5-sonnet-20240620", provider="anthropic", name="Claude 3.5 Sonnet"
            ),
        ]
    )
