from __future__ import annotations

# IMPORTANT
# - sklearn version required by scaler artifacts: 1.6.1 (embedded as _sklearn_version).
# - tensorflow version required: unknown in artifact metadata; model was saved with keras_version 3.13.2.
# - Exact load methods for artifacts:
#   - model_files/lstm_sealevel.keras: tensorflow.keras.models.load_model(...)
#   - model_files/feature_scaler.pkl: joblib.load(...)
#   - model_files/target_scaler.pkl: joblib.load(...)
#   - model_files/config.json: json.load(...)
#   - model_files/last_known_data.csv: pandas.read_csv(...)

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model


RAW_COLUMNS = ["date", "SEA_LEVEL", "WS2M", "T2M", "RH2M", "PS", "SLP", "WD2M"]
ENV_COLUMNS = ["WS2M", "T2M", "RH2M", "PS", "SLP", "WD2M"]
ROLLING_BASE = ["WS2M", "PS", "SLP", "SEA_LEVEL", "T2M"]


class SeaLevelPredictor:
    def __init__(self, model_files_dir: Path) -> None:
        self.model_files_dir = Path(model_files_dir)

        self.model: Any = None
        self.feature_scaler: Any = None
        self.target_scaler: Any = None

        self.feature_cols: list[str] = []
        self.lookback_window: int = 14
        self.forecast_horizon: int = 7

        self._last_known_raw: pd.DataFrame | None = None
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_artifacts(self) -> None:
        config_path = self.model_files_dir / "config.json"
        model_path = self.model_files_dir / "lstm_sealevel.keras"
        feature_scaler_path = self.model_files_dir / "feature_scaler.pkl"
        target_scaler_path = self.model_files_dir / "target_scaler.pkl"
        last_known_path = self.model_files_dir / "last_known_data.csv"

        if not config_path.exists():
            raise FileNotFoundError(f"Missing config file: {config_path}")
        if not model_path.exists():
            raise FileNotFoundError(f"Missing model file: {model_path}")
        if not feature_scaler_path.exists():
            raise FileNotFoundError(f"Missing feature scaler file: {feature_scaler_path}")
        if not target_scaler_path.exists():
            raise FileNotFoundError(f"Missing target scaler file: {target_scaler_path}")
        if not last_known_path.exists():
            raise FileNotFoundError(f"Missing last known data file: {last_known_path}")

        with config_path.open("r", encoding="utf-8") as f:
            cfg = json.load(f)

        self.feature_cols = cfg["feature_cols"]
        self.lookback_window = int(cfg["lookback_window"])
        self.forecast_horizon = int(cfg["forecast_horizon"])

        self.model = load_model(model_path)
        self.feature_scaler = joblib.load(feature_scaler_path)
        self.target_scaler = joblib.load(target_scaler_path)

        raw_df = pd.read_csv(last_known_path)
        self._last_known_raw = self._normalize_raw_df(raw_df)

        if len(self._last_known_raw) < self.lookback_window:
            raise ValueError(
                "last_known_data.csv has fewer rows than lookback_window; cannot initialize predictor"
            )

        _ = self._compute_features(self._last_known_raw)
        self._loaded = True

    def get_last_known_date(self) -> datetime.date:
        self._ensure_loaded()
        assert self._last_known_raw is not None
        return self._last_known_raw.iloc[-1]["date"].date()

    def get_last_window(self) -> dict[str, Any]:
        self._ensure_loaded()
        assert self._last_known_raw is not None

        raw_window = self._last_known_raw.tail(self.lookback_window).copy().reset_index(drop=True)
        feature_window = self._compute_features(raw_window).reset_index(drop=True)

        raw_records = []
        for row in raw_window.to_dict(orient="records"):
            row["date"] = row["date"].date().isoformat()
            raw_records.append(row)

        engineered_records = []
        for idx, row in feature_window.tail(self.lookback_window).iterrows():
            rec = {"date": raw_window.iloc[idx]["date"].date().isoformat()}
            for col in self.feature_cols:
                rec[col] = float(row[col])
            engineered_records.append(rec)

        return {
            "lookback_window": self.lookback_window,
            "raw_window": raw_records,
            "engineered_window": engineered_records,
        }

    def forecast(
        self,
        history: list[dict[str, Any]] | None = None,
        new_days: list[dict[str, Any]] | None = None,
        horizon_days: int | None = None,
    ) -> dict[str, Any]:
        self._ensure_loaded()

        horizon = int(horizon_days) if horizon_days is not None else self.forecast_horizon
        if horizon < 1:
            raise ValueError("horizon_days must be >= 1")

        base_history = self._prepare_history(history)
        if len(base_history) < self.lookback_window:
            raise ValueError(
                f"At least {self.lookback_window} rows are required in history, got {len(base_history)}"
            )

        new_days_map = self._build_new_days_map(new_days)

        working = base_history.copy()
        forecast_points: list[dict[str, Any]] = []

        input_last_date = working.iloc[-1]["date"].date()

        for _ in range(horizon):
            next_date = working.iloc[-1]["date"] + pd.Timedelta(days=1)
            next_row, has_observed_sea_level = self._build_next_raw_row(
                working, next_date, new_days_map.get(next_date.date().isoformat())
            )

            candidate = pd.concat([working, pd.DataFrame([next_row])], ignore_index=True)
            candidate_features = self._compute_features(candidate)
            window_features = candidate_features.tail(self.lookback_window)

            model_input = self._scale_window(window_features)
            pred_scaled = np.asarray(self.model.predict(model_input, verbose=0)).reshape(-1, 1)
            pred_original = np.asarray(self.target_scaler.inverse_transform(pred_scaled)).reshape(-1)
            pred_value = float(pred_original[0])

            if not has_observed_sea_level:
                next_row["SEA_LEVEL"] = pred_value

            working = pd.concat([working, pd.DataFrame([next_row])], ignore_index=True)
            forecast_points.append(
                {
                    "date": next_date.date().isoformat(),
                    "predicted_sea_level": pred_value,
                }
            )

        return {
            "generated_at": datetime.now(UTC),
            "lookback_window": self.lookback_window,
            "horizon_days": horizon,
            "input_last_date": input_last_date,
            "forecast": forecast_points,
        }

    def _prepare_history(self, history: list[dict[str, Any]] | None) -> pd.DataFrame:
        if history is None:
            assert self._last_known_raw is not None
            return self._last_known_raw.copy()

        history_df = pd.DataFrame(history)
        return self._normalize_raw_df(history_df)

    def _build_new_days_map(self, new_days: list[dict[str, Any]] | None) -> dict[str, dict[str, Any]]:
        if not new_days:
            return {}

        mapped: dict[str, dict[str, Any]] = {}
        for row in new_days:
            if "date" not in row:
                raise ValueError("Each new_days item must include 'date'")
            d = pd.to_datetime(row["date"], errors="coerce")
            if pd.isna(d):
                raise ValueError(f"Invalid date in new_days: {row.get('date')}")
            key = d.date().isoformat()
            mapped[key] = row
        return mapped

    def _build_next_raw_row(
        self,
        working: pd.DataFrame,
        next_date: pd.Timestamp,
        override_row: dict[str, Any] | None,
    ) -> tuple[dict[str, Any], bool]:
        last_row = working.iloc[-1]

        out = {
            "date": next_date,
            "SEA_LEVEL": float(last_row["SEA_LEVEL"]),
            "WS2M": float(last_row["WS2M"]),
            "T2M": float(last_row["T2M"]),
            "RH2M": float(last_row["RH2M"]),
            "PS": float(last_row["PS"]),
            "SLP": float(last_row["SLP"]),
            "WD2M": float(last_row["WD2M"]),
        }

        has_observed_sea_level = False
        if override_row:
            for col in ENV_COLUMNS:
                if col in override_row and override_row[col] is not None:
                    out[col] = float(override_row[col])

            if "SEA_LEVEL" in override_row and override_row["SEA_LEVEL"] is not None:
                out["SEA_LEVEL"] = float(override_row["SEA_LEVEL"])
                has_observed_sea_level = True

        return out, has_observed_sea_level

    def _normalize_raw_df(self, df: pd.DataFrame) -> pd.DataFrame:
        missing = [col for col in RAW_COLUMNS if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required raw columns: {missing}")

        out = df[RAW_COLUMNS].copy()
        out["date"] = pd.to_datetime(out["date"], errors="coerce")
        if out["date"].isna().any():
            raise ValueError("Found invalid date values in input history")

        for col in RAW_COLUMNS:
            if col == "date":
                continue
            out[col] = pd.to_numeric(out[col], errors="coerce")

        if out.drop(columns=["date"]).isna().any().any():
            raise ValueError("Found non-numeric or missing raw numeric values in history")

        return out.sort_values("date").reset_index(drop=True)

    def _compute_features(self, raw_df: pd.DataFrame) -> pd.DataFrame:
        df = raw_df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)

        df["month"] = df["date"].dt.month
        df["day_of_year"] = df["date"].dt.dayofyear

        df["month_sin"] = np.sin(2.0 * np.pi * df["month"] / 12.0)
        df["month_cos"] = np.cos(2.0 * np.pi * df["month"] / 12.0)
        df["doy_sin"] = np.sin(2.0 * np.pi * df["day_of_year"] / 365.25)
        df["doy_cos"] = np.cos(2.0 * np.pi * df["day_of_year"] / 365.25)

        radians = np.deg2rad(df["WD2M"])
        df["wind_u"] = df["WS2M"] * np.sin(radians)
        df["wind_v"] = df["WS2M"] * np.cos(radians)

        df["PS_diff1"] = df["PS"].diff(1)
        df["PS_diff3"] = df["PS"] - df["PS"].shift(3)
        df["SLP_diff1"] = df["SLP"].diff(1)
        df["SLP_diff3"] = df["SLP"] - df["SLP"].shift(3)

        for base in ROLLING_BASE:
            roll3 = df[base].rolling(window=3, min_periods=1)
            df[f"{base}_rmean3"] = roll3.mean()
            df[f"{base}_rstd3"] = roll3.std(ddof=1)
            df[f"{base}_rmin3"] = roll3.min()
            df[f"{base}_rmax3"] = roll3.max()

            roll7 = df[base].rolling(window=7, min_periods=1)
            df[f"{base}_rmean7"] = roll7.mean()
            df[f"{base}_rstd7"] = roll7.std(ddof=1)
            df[f"{base}_rmin7"] = roll7.min()
            df[f"{base}_rmax7"] = roll7.max()

        # Training-time storm threshold logic is not available in repository source.
        # Keep deterministic placeholders and retain the feature slots expected by the model.
        df["storm_wind"] = 0.0
        df["strong_wind_3d"] = 0.0
        df["pressure_drop"] = 0.0
        df["rapid_pressure_drop_3d"] = 0.0
        df["storm_index"] = 0.0

        df["SL_lag1"] = df["SEA_LEVEL"].shift(1)
        df["SL_lag2"] = df["SEA_LEVEL"].shift(2)
        df["SL_lag3"] = df["SEA_LEVEL"].shift(3)
        df["SL_lag5"] = df["SEA_LEVEL"].shift(5)
        df["SL_lag7"] = df["SEA_LEVEL"].shift(7)
        df["SL_lag14"] = df["SEA_LEVEL"].shift(14)

        df["SL_diff1"] = df["SEA_LEVEL"].diff(1)
        df["SL_diff7"] = df["SEA_LEVEL"] - df["SEA_LEVEL"].shift(7)

        df["wind_x_pdrop"] = df["WS2M"] * np.maximum(0.0, -df["SLP_diff1"].fillna(0.0))

        missing_feature_cols = [col for col in self.feature_cols if col not in df.columns]
        if missing_feature_cols:
            raise ValueError(f"Feature engineering did not produce columns: {missing_feature_cols}")

        features = df[self.feature_cols].copy()
        features = features.apply(pd.to_numeric, errors="coerce")
        features = features.ffill().bfill().fillna(0.0)

        return features

    def _scale_window(self, window_features: pd.DataFrame) -> np.ndarray:
        if len(window_features) < self.lookback_window:
            raise ValueError(
                f"Not enough rows to create model input window: have {len(window_features)}, need {self.lookback_window}"
            )

        x = window_features[self.feature_cols].tail(self.lookback_window).to_numpy(dtype=np.float64)
        x_scaled = self.feature_scaler.transform(x)
        return np.asarray(x_scaled, dtype=np.float32).reshape(
            1, self.lookback_window, len(self.feature_cols)
        )

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            raise RuntimeError("Predictor is not loaded. Call load_artifacts() first.")
