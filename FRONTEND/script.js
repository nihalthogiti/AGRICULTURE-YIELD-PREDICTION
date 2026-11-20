
// Automatically detect local or deployed environment
const isLocalFrontend =
    location.protocol === "file:" ||
    (
        ["localhost", "127.0.0.1"].includes(location.hostname) &&
        location.port !== "8000"
    );

const API_URL = isLocalFrontend
    ? "http://127.0.0.1:8000"
    : "";


const form = document.getElementById("predictionForm");
const cropSelect = document.getElementById("crop");
const countrySelect = document.getElementById("country");

const predictButton = document.getElementById("predictButton");
const formError = document.getElementById("formError");

const resultPlaceholder =
    document.getElementById("resultPlaceholder");

const resultData = document.getElementById("resultData");


// Format raw model feature names for display
function formatLabel(value) {
    return value.replace(/\b\w/g, char => char.toUpperCase());
}


// Load supported crops and countries from FastAPI
async function loadOptions() {
    try {
        const response = await fetch(`${API_URL}/options`);

        if (!response.ok) {
            throw new Error("Unable to load crop options.");
        }

        const data = await response.json();

        cropSelect.innerHTML =
            '<option value="">Select Crop</option>';

        countrySelect.innerHTML =
            '<option value="">Select Country</option>';

        data.crops.forEach(crop => {
            const option = document.createElement("option");

            option.value = crop;
            option.textContent = formatLabel(crop);

            cropSelect.appendChild(option);
        });

        data.countries.forEach(country => {
            const option = document.createElement("option");

            option.value = country.value;
            option.textContent = country.label;

            countrySelect.appendChild(option);
        });

        formError.textContent = "";

    } catch (error) {
        cropSelect.innerHTML =
            '<option value="">Unable to load crops</option>';

        countrySelect.innerHTML =
            '<option value="">Unable to load countries</option>';

        formError.textContent =
            "Cannot connect to the backend. Please check whether the server is running.";

        console.error("Options loading error:", error);
    }
}


// Collect numerical input
function getNumber(id) {
    return Number(document.getElementById(id).value);
}


// Display prediction result
function displayResult(data) {
    resultPlaceholder.hidden = true;
    resultData.hidden = false;

    document.getElementById("yieldValue").textContent =
        Number(data.predicted_yield_kg_per_ha)
            .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

    document.getElementById("resultCrop").textContent =
        formatLabel(data.crop);

    document.getElementById("resultCountry").textContent =
        data.country;

    document.getElementById("result").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// Form submission
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    formError.textContent = "";

    const tempMax = getNumber("temp_max");
    const tempMin = getNumber("temp_min");

    if (tempMin > tempMax) {
        formError.textContent =
            "Minimum temperature cannot exceed maximum temperature.";
        return;
    }

    const payload = {
        year: getNumber("year"),
        temp_max: tempMax,
        temp_min: tempMin,
        humidity: getNumber("humidity"),
        soil_root: getNumber("soil_root"),
        soil_top: getNumber("soil_top"),
        precip_mm: getNumber("precip_mm"),
        rainfall: getNumber("rainfall"),
        temp_range: getNumber("temp_range"),
        crop: cropSelect.value,
        country: countrySelect.value
    };


    // Loading state
    predictButton.disabled = true;

    predictButton.innerHTML = `
        <span>Generating Prediction...</span>
        <span>...</span>
    `;


    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Prediction failed."
            );
        }

        // Display prediction
        displayResult(data);

    } catch (error) {
        formError.textContent =
            error.message || "Something went wrong.";

        console.error("Prediction error:", error);

    } finally {
        predictButton.disabled = false;

        predictButton.innerHTML = `
            <span>Predict Crop Yield</span>
            <span>→</span>
        `;
    }
});


// Reset result when form is reset
form.addEventListener("reset", function() {
    setTimeout(() => {
        formError.textContent = "";

        resultData.hidden = true;
        resultPlaceholder.hidden = false;

    }, 0);
});


// Initialize application
loadOptions();
