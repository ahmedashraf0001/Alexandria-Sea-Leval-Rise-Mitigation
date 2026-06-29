from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HourlyRawInput(BaseModel):
    datetime: dt.datetime = Field(
        ...,
        description="Observation datetime in ISO format (YYYY-MM-DDTHH:MM:SS).",
        examples=["2015-12-27T00:00:00"],
    )
    TWL: float = Field(
        ...,
        description="Total Water Level (mm).",
        examples=[2707.0],
    )
    WS2M: float = Field(..., description="Wind speed at 2m (m/s).", examples=[2.09])
    T2M: float = Field(..., description="Air temperature at 2m (C).", examples=[15.84])
    SLP: float = Field(
        ..., description="Sea-level pressure (hPa).", examples=[102.03]
    )
    WD2M: float = Field(
        ...,
        description="Wind direction at 2m (degrees).",
        examples=[318.5],
    )


class ForecastRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "history": [
                    {
                        "datetime": "2015-12-27T00:00:00",
                        "TWL": 2428.0,
                        "WS2M": 2.65,
                        "T2M": 16.54,
                        "SLP": 102.52,
                        "WD2M": 53.8,
                    }
                ],
                "horizon_hours": 72,
            }
        }
    )

    history: list[HourlyRawInput] | None = Field(
        default=None,
        description="Optional hourly raw history. If omitted, service uses model_files/last_known_data.csv.",
    )
    horizon_hours: int | None = Field(
        default=None,
        ge=1,
        le=72,
        description="Forecast length in hours. Defaults to 72 (3 days).",
        examples=[72],
    )


class ForecastPoint(BaseModel):
    date: str = Field(
        ..., description="Forecast date (YYYY-MM-DD).", examples=["2016-01-03"]
    )
    hour: int = Field(
        ..., description="Forecast hour (0-23).", examples=[0]
    )
    predicted_twl: float = Field(
        ...,
        description="Predicted Total Water Level in original scale (mm).",
        examples=[2682.3],
    )


class ForecastResponse(BaseModel):
    generated_at: dt.datetime = Field(..., description="UTC generation timestamp.")
    lookback_hours: int = Field(
        ..., description="Lookback window size in hours consumed by model input."
    )
    horizon_hours: int = Field(
        ..., description="Number of forecast hours returned."
    )
    input_last_date: dt.date = Field(
        ..., description="Last date in the input history used."
    )
    forecast: list[ForecastPoint] = Field(
        ..., description="Ordered hourly forecast points."
    )


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service liveness status.", examples=["ok"])
    model_loaded: bool = Field(
        ..., description="Whether model artifacts are loaded."
    )
    last_known_date: dt.date = Field(
        ..., description="Last date found in default history."
    )
    lookback_hours: int = Field(
        ..., description="Configured lookback window in hours."
    )
    forecast_hours: int = Field(
        ..., description="Configured default forecast horizon in hours."
    )


class LastWindowResponse(BaseModel):
    lookback_hours: int = Field(..., description="Number of rows returned.")
    raw_window: list[HourlyRawInput] = Field(
        ..., description="Raw input window used by the service."
    )
    engineered_window: list[dict[str, Any]] = Field(
        ...,
        description="Engineered features (raw + time features) for the same window.",
    )
