from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model


RAW_COLUMNS = ["TWL", "WS2M", "T2M", "SLP", "WD2M"]
TIME_FEATURE_COLS = ["Hour_Sin", "Hour_Cos", "DOY_Sin", "DOY_Cos"]
LOOKBACK_HOURS = 168
FORECAST_HOURS = 72


class SeaLevelPredictor:
    def __init__(self, model_files_dir: Path) -> None:
        self.model_files_dir = Path(model_files_dir)

        self.model: Any = None
        self.scaler_X: Any = None
        self.scaler_Y: Any = None

        self.lookback_hours: int = LOOKBACK_HOURS
        self.forecast_hours: int = FORECAST_HOURS

        self._last_known_raw: pd.DataFrame | None = None
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_artifacts(self) -> None:
        model_path = self.model_files_dir / "sea_level_forecast_lstm.keras"
        scaler_x_path = self.model_files_dir / "scaler_X.joblib"
        scaler_y_path = self.model_files_dir / "scaler_Y.joblib"
        last_known_path = self.model_files_dir / "last_known_data.csv"

        if not model_path.exists():
            raise FileNotFoundError(f"Missing model file: {model_path}")
        if not scaler_x_path.exists():
            raise FileNotFoundError(f"Missing feature scaler: {scaler_x_path}")
        if not scaler_y_path.exists():
            raise FileNotFoundError(f"Missing target scaler: {scaler_y_path}")
        if not last_known_path.exists():
            raise FileNotFoundError(f"Missing last known data: {last_known_path}")

        self.model = load_model(model_path)
        self.scaler_X = joblib.load(scaler_x_path)
        self.scaler_Y = joblib.load(scaler_y_path)

        raw_df = pd.read_csv(last_known_path)
        self._last_known_raw = self._normalize_raw_df(raw_df)

        if len(self._last_known_raw) < self.lookback_hours:
            raise ValueError(
                f"last_known_data.csv has {len(self._last_known_raw)} rows, "
                f"need at least {self.lookback_hours} (lookback_hours)"
            )

        self._loaded = True

    def get_last_known_date(self) -> datetime.date:
        self._ensure_loaded()
        assert self._last_known_raw is not None
        return self._last_known_raw.iloc[-1]["datetime"].date()

    def get_last_window(self) -> dict[str, Any]:
        self._ensure_loaded()
        assert self._last_known_raw is not None

        raw_window = (
            self._last_known_raw.tail(self.lookback_hours)
            .copy()
            .reset_index(drop=True)
        )
        enriched = self._add_time_features(raw_window)

        raw_records: list[dict[str, Any]] = []
        for _, row in raw_window.iterrows():
            rec: dict[str, Any] = {
                "datetime": row["datetime"].isoformat(),
            }
            for col in RAW_COLUMNS:
                rec[col] = float(row[col])
            raw_records.append(rec)

        engineered_records: list[dict[str, Any]] = []
        for _, row in enriched.iterrows():
            rec = {}
            for col in RAW_COLUMNS + TIME_FEATURE_COLS:
                rec[col] = float(row[col])
            engineered_records.append(rec)

        return {
            "lookback_hours": self.lookback_hours,
            "raw_window": raw_records,
            "engineered_window": engineered_records,
        }

    def forecast(
        self,
        history: list[dict[str, Any]] | None = None,
        horizon_hours: int | None = None,
    ) -> dict[str, Any]:
        self._ensure_loaded()

        horizon = int(horizon_hours) if horizon_hours is not None else self.forecast_hours
        if horizon < 1:
            raise ValueError("horizon_hours must be >= 1")
        if horizon > self.forecast_hours:
            raise ValueError(
                f"horizon_hours ({horizon}) cannot exceed model forecast horizon ({self.forecast_hours})"
            )

        base_history = self._prepare_history(history)
        if len(base_history) < self.lookback_hours:
            raise ValueError(
                f"At least {self.lookback_hours} hourly rows required, got {len(base_history)}"
            )

        lookback_data = base_history.tail(self.lookback_hours).copy()
        enriched_lookback = self._add_time_features(lookback_data)

        x_input = self._build_model_input(enriched_lookback)
        x_scaled = self.scaler_X.transform(x_input.reshape(1, -1))
        x_for_model = x_scaled.reshape(1, 1, -1)

        pred_scaled = self.model.predict(x_for_model, verbose=0)
        pred_original = self.scaler_Y.inverse_transform(pred_scaled)

        last_timestamp = lookback_data.iloc[-1]["datetime"]
        input_last_date = last_timestamp.date()

        forecast_points: list[dict[str, Any]] = []
        for h in range(horizon):
            forecast_time = last_timestamp + pd.Timedelta(hours=h + 1)
            forecast_points.append(
                {
                    "date": forecast_time.date().isoformat(),
                    "hour": forecast_time.hour,
                    "predicted_twl": float(pred_original[0, h]),
                }
            )

        return {
            "generated_at": datetime.now(UTC),
            "lookback_hours": self.lookback_hours,
            "horizon_hours": horizon,
            "input_last_date": input_last_date,
            "forecast": forecast_points,
        }

    def _prepare_history(self, history: list[dict[str, Any]] | None) -> pd.DataFrame:
        if history is None:
            assert self._last_known_raw is not None
            return self._last_known_raw.copy()
        history_df = pd.DataFrame(history)
        return self._normalize_raw_df(history_df)

    def _normalize_raw_df(self, df: pd.DataFrame) -> pd.DataFrame:
        missing = [col for col in RAW_COLUMNS if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        out = df.copy()

        if "datetime" in out.columns:
            out["datetime"] = pd.to_datetime(out["datetime"])
        elif "date" in out.columns:
            out["datetime"] = pd.to_datetime(out["date"])
            out = out.drop(columns=["date"])
        else:
            raise ValueError("Input must have a 'datetime' or 'date' column")

        if out["datetime"].isna().any():
            raise ValueError("Found invalid datetime values")

        for col in RAW_COLUMNS:
            out[col] = pd.to_numeric(out[col], errors="coerce")

        if out[RAW_COLUMNS].isna().any().any():
            raise ValueError("Found non-numeric or missing values")

        return out.sort_values("datetime").reset_index(drop=True)

    def _add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        enriched = df.copy()
        enriched["Hour_Sin"] = np.sin(2 * np.pi * enriched["datetime"].dt.hour / 24)
        enriched["Hour_Cos"] = np.cos(2 * np.pi * enriched["datetime"].dt.hour / 24)
        enriched["DOY_Sin"] = np.sin(
            2 * np.pi * enriched["datetime"].dt.dayofyear / 365.25
        )
        enriched["DOY_Cos"] = np.cos(
            2 * np.pi * enriched["datetime"].dt.dayofyear / 365.25
        )
        return enriched

    def _build_model_input(self, enriched_window: pd.DataFrame) -> np.ndarray:
        feature_cols = RAW_COLUMNS + TIME_FEATURE_COLS

        lookback_features = enriched_window[feature_cols].values.flatten()

        last_ts = enriched_window["datetime"].iloc[-1]
        future_index = pd.date_range(
            start=last_ts + pd.Timedelta(hours=1),
            periods=self.forecast_hours,
            freq="h",
        )
        future_time_features = np.column_stack(
            [
                np.sin(2 * np.pi * future_index.hour / 24),
                np.cos(2 * np.pi * future_index.hour / 24),
                np.sin(2 * np.pi * future_index.dayofyear / 365.25),
                np.cos(2 * np.pi * future_index.dayofyear / 365.25),
            ]
        ).flatten()

        return np.concatenate([lookback_features, future_time_features]).astype(
            np.float64
        )

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            raise RuntimeError("Predictor is not loaded. Call load_artifacts() first.")
