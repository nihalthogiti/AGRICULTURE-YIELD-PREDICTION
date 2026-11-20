
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "FRONTEND"

app = FastAPI(title="Agricultural Yield Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and columns
model = joblib.load(BASE_DIR / "agricultural_yield_model.pkl")
model_columns = joblib.load(BASE_DIR / "model_columns.pkl")


# User input features
class PredictionInput(BaseModel):
    year: int
    temp_max: float
    temp_min: float
    humidity: float
    soil_root: float
    soil_top: float
    precip_mm: float
    rainfall: float
    temp_range: float
    crop: str
    country: str


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "Agricultural Yield Prediction API is running"
    }


@app.get("/options")
def get_options():

    crops = [
        col.replace("crop_", "", 1)
        for col in model_columns
        if col.startswith("crop_")
    ]

    country_mapping = {
        "Australia": "Australia",
        "Brazil": "Brazil",
        "Canada": "Canada",
        "China": "China",
        "Egypt": "Egypt",
        "France": "France",
        "Germany": "Germany",
        "India": "India",
        "Indonesia": "Indonesia",
        "Italy": "Italy",
        "Japan": "Japan",
        "Mexico": "Mexico",
        "Nigeria": "Nigeria",
        "Pakistan": "Pakistan",
        "South Africa": "South Africa",
        "Spain": "Spain",
        "Thailand": "Thailand",
        "Turkey": "T Rkiye",
        "United States": "United States Of America"
    }

    available_countries = {
        col.replace("country_", "", 1)
        for col in model_columns
        if col.startswith("country_")
    }

    countries = [
        {"label": label, "value": value}
        for label, value in country_mapping.items()
        if value in available_countries
    ]

    return {
        "crops": crops,
        "countries": countries
    }


@app.post("/predict")
def predict_yield(data: PredictionInput):

    try:
        input_data = data.model_dump()

        crop = input_data.pop("crop").strip()
        country = input_data.pop("country").strip()

        # Initialize all model features with zero
        final_input = pd.DataFrame(
            0.0,
            index=[0],
            columns=model_columns
        )

        # Fill numerical input values
        for col, value in input_data.items():

            if col not in model_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Feature not found in model: {col}"
                )

            final_input[col] = value

        # Crop encoding
        crop_column = "crop_" + crop

        if crop_column not in model_columns:
            raise HTTPException(
                status_code=400,
                detail="Invalid crop selected"
            )

        final_input[crop_column] = 1

        # Country encoding
        country_column = "country_" + country

        if country_column not in model_columns:
            raise HTTPException(
                status_code=400,
                detail="Invalid country selected"
            )

        final_input[country_column] = 1

        # Maintain training feature order
        final_input = final_input[model_columns]

        # Generate prediction
        prediction = model.predict(final_input)[0]

        return {
            "crop": crop,
            "country": country,
            "predicted_yield_kg_per_ha": round(float(prediction), 2),
            "unit": "kg/ha",
            "message": "Prediction successful"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# Serve frontend
app.mount(
    "/",
    StaticFiles(
        directory=str(FRONTEND_DIR),
        html=True
    ),
    name="frontend"
)
