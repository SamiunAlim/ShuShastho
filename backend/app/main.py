from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import auth
from .db import get_db
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        print("Seeded demo data" if seed() else "Demo data already present")
    except Exception as exc:  # server still starts; /health reports the problem
        print(f"Seed skipped: {exc}")
    yield


app = FastAPI(title="ShuShastho API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


app.include_router(auth.router)


@app.get("/health")
def health():
    try:
        get_db().command("ping")
    except Exception as exc:
        raise HTTPException(503, detail={"error": {"message": f"MongoDB unreachable: {type(exc).__name__}"}})
    return {"status": "ok", "mongo": "ok"}
