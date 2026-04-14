from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RawDayInput(BaseModel):
    date: dt.date = Field(
        ...,
        description="Observation date in ISO format (YYYY-MM-DD).",
        examples=["2016-01-09"],
    )
    SEA_LEVEL: float = Field(
        ...,
        description="Daily sea level raw value.",
        examples=[2707.0],
    )
    WS2M: float = Field(..., description="Wind speed at 2m.", examples=[2.09])
    T2M: float = Field(..., description="Air temperature at 2m.", examples=[15.84])
    RH2M: float = Field(..., description="Relative humidity at 2m.", examples=[78.7])
    PS: float = Field(..., description="Surface pressure.", examples=[101.93])
    SLP: float = Field(..., description="Sea-level pressure.", examples=[102.03])
    WD2M: float = Field(
        ...,
        description="Wind direction at 2m in degrees.",
        examples=[318.5],
    )


class NewDayInput(BaseModel):
    date: dt.date = Field(
        ...,
        description="Future date to condition the forecast on.",
        examples=["2016-01-10"],
    )
    WS2M: float = Field(..., description="Wind speed at 2m.", examples=[3.15])
    T2M: float = Field(..., description="Air temperature at 2m.", examples=[16.2])
    RH2M: float = Field(..., description="Relative humidity at 2m.", examples=[72.0])
    PS: float = Field(..., description="Surface pressure.", examples=[101.8])
    SLP: float = Field(..., description="Sea-level pressure.", examples=[101.9])
    WD2M: float = Field(
        ...,
        description="Wind direction at 2m in degrees.",
        examples=[280.0],
    )
    SEA_LEVEL: float | None = Field(
        default=None,
        description="Optional known sea level for this date. If omitted, the model prediction is fed back recursively.",
        examples=[None],
    )


class ForecastRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "history": [
                    {
                        "date": "2015-12-27",
                        "SEA_LEVEL": 2428.0,
                        "WS2M": 2.65,
                        "T2M": 16.54,
                        "RH2M": 70.64,
                        "PS": 102.42,
                        "SLP": 102.52,
                        "WD2M": 53.8,
                    }
                ],
                "new_days": [
                    {
                        "date": "2016-01-10",
                        "WS2M": 3.15,
                        "T2M": 16.2,
                        "RH2M": 72.0,
                        "PS": 101.8,
                        "SLP": 101.9,
                        "WD2M": 280.0,
                    }
                ],
                "horizon_days": 7,
            }
        }
    )

    history: list[RawDayInput] | None = Field(
        default=None,
        description="Optional full historical raw window. If omitted, service uses model_files/last_known_data.csv.",
    )
    new_days: list[NewDayInput] | None = Field(
        default=None,
        description="Optional future raw weather inputs to condition each forecast day.",
    )
    horizon_days: int | None = Field(
        default=None,
        ge=1,
        le=30,
        description="Forecast length in days. Defaults to config.forecast_horizon.",
        examples=[7],
    )


class ForecastPoint(BaseModel):
    date: dt.date = Field(..., description="Forecast date.", examples=["2016-01-10"])
    predicted_sea_level: float = Field(
        ..., description="Predicted sea level in original target scale.", examples=[2682.3]
    )


class ForecastResponse(BaseModel):
    generated_at: dt.datetime = Field(..., description="UTC generation timestamp.")
    lookback_window: int = Field(..., description="Window size consumed by model input.")
    horizon_days: int = Field(..., description="Number of forecast points returned.")
    input_last_date: dt.date = Field(..., description="Last date in the input history used.")
    forecast: list[ForecastPoint] = Field(..., description="Ordered forecast points.")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service liveness status.", examples=["ok"])
    model_loaded: bool = Field(..., description="Whether model artifacts are loaded.")
    last_known_date: dt.date = Field(..., description="Last date found in default history.")
    lookback_window: int = Field(..., description="Configured lookback window.")
    forecast_horizon: int = Field(..., description="Configured default forecast horizon.")


class LastWindowResponse(BaseModel):
    lookback_window: int = Field(..., description="Number of rows returned.")
    raw_window: list[RawDayInput] = Field(..., description="Raw input window used by the service.")
    engineered_window: list[dict[str, Any]] = Field(
        ...,
        description="Engineered features for the same window in model feature order.",
    )
