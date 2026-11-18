import { ORDERED_VISIBILITY_CODES, visibilityFromCloudToWeb } from "../utils/cloudTranslator";

const temperature = "TEMPERATURE_C";
const humidity = "HUMIDITY_0";
const dewPoint = "HUMIDITY_2";
const co2 = "CO2_PPM";

const sharedReadings = ["temperature", "humidity", "pressure", "rssi", "measurementSequenceNumber"];
function allFields(modelReadings) {
    const supported = new Set([...sharedReadings, ...modelReadings]);
    return ORDERED_VISIBILITY_CODES.filter(code => supported.has(visibilityFromCloudToWeb(code)[0]));
}

// The first field becomes the card's main reading and default graph.
// Only select fields supported by that sensor's packet format.
export const DEMO_SENSORS = [
    { name: "Living room", air: true, fields: ["AQI_INDEX", co2, temperature, humidity], range: [16, 28],
        description: "Everyday comfort and air quality, with evening occupancy and cooking nearby." },
    { name: "Bedroom", fields: [temperature, humidity], range: [15, 25],
        description: "Overnight comfort and the effect of opening the window in the morning." },
    { name: "Garden", fields: [temperature, humidity, "PRESSURE_1"], range: [-5, 30],
        description: "Outdoor weather, passing rain showers and changing air pressure." },
    { name: "Refrigerator", fields: [temperature], range: [0, 5],
        description: "Compressor cycles and short warm-ups when the door opens." },
    { name: "Sauna", fields: [temperature, humidity], range: [5, 100],
        description: "Evening heating sessions, steam bursts and overnight cooling." },
    { name: "Freezer", fields: [temperature], range: [-25, -15],
        description: "Frozen storage with compressor cycling and occasional defrost periods." },
    { name: "Greenhouse", fields: [temperature, humidity, dewPoint], range: [5, 35],
        description: "Solar warming, watering and ventilation around growing plants." },
    { name: "Wine cellar", fields: [temperature, humidity], range: [10, 16],
        description: "Slow temperature drift and humidity in a sheltered storage space." },
    { name: "Bathroom", fields: [humidity, temperature, dewPoint], range: [16, 30],
        description: "Shower humidity spikes followed by extractor-fan drying." },
    { name: "Laundry room", fields: [humidity, "HUMIDITY_1", temperature], range: [15, 30],
        description: "Moisture from drying laundry and its gradual removal by ventilation." },
    { name: "Home office", air: true, fields: [co2, temperature, humidity, "LUMINOSITY_LX"], range: [16, 28],
        description: "Workday CO2 buildup, window ventilation and desk lighting." },
    { name: "Nursery", air: true, fields: [temperature, humidity, co2, "SOUNDAVG_DBA"], range: [16, 27],
        description: "Room comfort, overnight occupancy and short periods of activity." },
    { name: "Kitchen", air: true, fields: ["PM25_MGM3", "VOC_INDEX", co2, temperature], range: [16, 30],
        description: "Cooking particles and VOC peaks that clear after the extractor runs." },
    { name: "Garage", fields: [temperature, humidity], range: [-5, 30],
        description: "An unheated space that responds to outdoor weather and door openings." },
    { name: "Attic", fields: [temperature, dewPoint, humidity], range: [-5, 40],
        description: "Roof-space heating in sunlight and humidity changes as it cools." },
    { name: "Basement", fields: [humidity, dewPoint, temperature], range: [5, 25],
        description: "Slow moisture changes and intermittent dehumidifier operation." },
    { name: "Server cabinet", fields: [temperature], range: [15, 35],
        description: "Equipment heat under changing workloads and cooling-fan response." },
    { name: "Music room", fields: [humidity, temperature], range: [16, 27],
        description: "A stable storage environment with small humidifier cycles." },
    { name: "Workshop", air: true, fields: ["PM25_MGM3", "VOC_INDEX", "SOUNDPEAK_DBA", temperature], range: [10, 30],
        description: "Dust, VOC and noise bursts during projects, followed by air clearing." },
    { name: "Meeting room", air: true, fields: [co2, temperature, humidity, "SOUNDAVG_DBA"], range: [16, 28],
        description: "CO2 buildup during meetings and recovery between bookings." },
    { name: "RuuviTag", range: [16, 28],
        fields: allFields(["movementCounter", "battery", "accelerationX", "accelerationY", "accelerationZ"]),
        description: "Indoor conditions, movement, battery voltage and signal strength." },
    { name: "Ruuvi Air", air: true, range: [16, 28],
        fields: allFields(["aqi", "co2", "pm10", "pm25", "pm40", "pm100", "voc", "nox",
            "illuminance", "soundLevelInstant", "soundLevelAvg", "soundLevelPeak"]),
        description: "Indoor air quality, climate, light and sound throughout the day." },
];

export function demoDisplaySettings(profile) {
    return {
        defaultDisplayOrder: "false",
        displayOrder: JSON.stringify(DEMO_SENSORS[profile].fields),
    };
}
