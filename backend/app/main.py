from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from . import auth, clinic, emergency
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


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    """Return {"error": {"message"}} at the top level, as src/services/api.ts expects."""
    body = exc.detail if isinstance(exc.detail, dict) and "error" in exc.detail else {"error": {"message": str(exc.detail)}}
    return JSONResponse(body, status_code=exc.status_code)


app.include_router(auth.router)
app.include_router(clinic.router)
app.include_router(emergency.router)


@app.get("/health")
def health():
    try:
        get_db().command("ping")
    except Exception as exc:
        raise HTTPException(503, detail={"error": {"message": f"MongoDB unreachable: {type(exc).__name__}"}})
    return {"status": "ok", "mongo": "ok"}
