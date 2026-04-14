from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from predictor import SeaLevelPredictor
from schemas import (
    ForecastRequest,
    ForecastResponse,
    HealthResponse,
    LastWindowResponse,
)


BASE_DIR = Path(__file__).resolve().parent
MODEL_FILES_DIR = BASE_DIR / "model_files"

predictor = SeaLevelPredictor(MODEL_FILES_DIR)

app = FastAPI(
    title="Alexandria Sea Level Forecast API",
    version="1.0.0",
    description="Production-ready FastAPI wrapper for the LSTM sea-level forecasting model.",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    try:
        predictor.load_artifacts()
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to load model artifacts on startup: {exc}") from exc


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        return HealthResponse(
            status="ok",
            model_loaded=predictor.is_loaded,
            last_known_date=predictor.get_last_known_date(),
            lookback_window=predictor.lookback_window,
            forecast_horizon=predictor.forecast_horizon,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    try:
        history = [row.model_dump() for row in request.history] if request.history else None
        new_days = [row.model_dump() for row in request.new_days] if request.new_days else None

        result = predictor.forecast(
            history=history,
            new_days=new_days,
            horizon_days=request.horizon_days,
        )
        return ForecastResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/forecast/quick", response_model=ForecastResponse)
def forecast_quick() -> ForecastResponse:
    try:
        result = predictor.forecast(history=None, new_days=None, horizon_days=None)
        return ForecastResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/last-window", response_model=LastWindowResponse)
def last_window() -> LastWindowResponse:
    try:
        result = predictor.get_last_window()
        return LastWindowResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
