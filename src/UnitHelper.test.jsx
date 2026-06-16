/**
 * Characterization tests for UnitHelper.jsx, written before refactoring it.
 * These pin down current behavior — including quirks — so the cleanup can be
 * verified to be behavior-preserving. Expected values were computed with the
 * current implementation.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
    allUnits,
    alertTypes,
    DEFAULT_VISIBLE_SENSOR_TYPES,
    getAlertRange,
    getDisplayValue,
    getSetting,
    getSensorTypeOnly,
    getUnitFor,
    getUnitHelper,
    getUnitOnly,
    getUnitSettingFor,
    humidityToUserFormat,
    localeNumber,
    pressureFromUserFormat,
    pressureToUserFormat,
    round,
    temperatureFromUserFormat,
    temperatureToUserFormat,
} from "./UnitHelper";

const setStoredSettings = (settings) =>
    localStorage.setItem("settings", JSON.stringify(settings));

beforeEach(() => {
    localStorage.clear();
});

describe("round", () => {
    it("rounds to the given number of decimals", () => {
        expect(round(1.2345, 2)).toBe(1.23);
        expect(round(1.236, 2)).toBe(1.24);
        expect(round(-1.236, 2)).toBe(-1.24);
        expect(round(5, 0)).toBe(5);
    });
});

describe("temperatureToUserFormat", () => {
    it("defaults to Celsius (no conversion)", () => {
        expect(temperatureToUserFormat(21.345, false, {})).toBe(21.35);
    });

    it("converts to Fahrenheit", () => {
        expect(temperatureToUserFormat(25, false, { UNIT_TEMPERATURE: "F" })).toBe(77);
    });

    it("converts to Kelvin", () => {
        expect(temperatureToUserFormat(0, false, { UNIT_TEMPERATURE: "K" })).toBe(273.15);
    });

    it("offset mode treats the value as a delta: °F scales without the +32", () => {
        expect(temperatureToUserFormat(10, true, { UNIT_TEMPERATURE: "F" })).toBe(18);
    });

    it("offset mode treats the value as a delta: a °C delta equals a K delta", () => {
        expect(temperatureToUserFormat(10, true, { UNIT_TEMPERATURE: "K" })).toBe(10);
    });

    it("reads settings from localStorage when not provided", () => {
        setStoredSettings({ UNIT_TEMPERATURE: "F" });
        expect(temperatureToUserFormat(100)).toBe(212);
    });
});

describe("temperatureFromUserFormat", () => {
    it("is identity for Celsius", () => {
        expect(temperatureFromUserFormat(21.345)).toBe(21.35);
    });

    it("converts from Fahrenheit", () => {
        setStoredSettings({ UNIT_TEMPERATURE: "F" });
        expect(temperatureFromUserFormat(77)).toBe(25);
    });

    it("converts from Kelvin", () => {
        setStoredSettings({ UNIT_TEMPERATURE: "K" });
        expect(temperatureFromUserFormat(273.15)).toBe(0);
    });
});

describe("pressureToUserFormat / pressureFromUserFormat", () => {
    it("defaults to hPa (divide by 100)", () => {
        expect(pressureToUserFormat(101325, {})).toBe(1013.25);
        expect(pressureFromUserFormat(1013.25, {})).toBe(101325);
    });

    it("keeps Pa as-is", () => {
        expect(pressureToUserFormat(101325, { UNIT_PRESSURE: "0" })).toBe(101325);
        expect(pressureFromUserFormat(101325, { UNIT_PRESSURE: "0" })).toBe(101325);
    });

    it("converts mmHg", () => {
        expect(pressureToUserFormat(101325, { UNIT_PRESSURE: "2" })).toBe(760);
        expect(pressureFromUserFormat(760, { UNIT_PRESSURE: "2" })).toBe(101325);
    });

    it("converts inHg", () => {
        expect(pressureToUserFormat(101325, { UNIT_PRESSURE: "3" })).toBe(29.92);
        expect(pressureFromUserFormat(29.92, { UNIT_PRESSURE: "3" })).toBe(101320.75);
    });
});

describe("humidityToUserFormat", () => {
    it("relative humidity passes through", () => {
        expect(humidityToUserFormat(50.567, 20, {})).toBe(50.57);
        expect(humidityToUserFormat(50, 20, { UNIT_HUMIDITY: "0" })).toBe(50);
    });

    it("converts to absolute humidity (g/m³)", () => {
        expect(humidityToUserFormat(50, 20, { UNIT_HUMIDITY: "1" })).toBe(8.64);
    });

    it("converts to dewpoint in the configured temperature unit", () => {
        expect(humidityToUserFormat(50, 20, { UNIT_HUMIDITY: "2" })).toBe(9.27);
        expect(humidityToUserFormat(50, 20, { UNIT_HUMIDITY: "2", UNIT_TEMPERATURE: "F" })).toBe(48.69);
        expect(humidityToUserFormat(50, 20, { UNIT_HUMIDITY: "2", UNIT_TEMPERATURE: "K" })).toBe(282.42);
    });
});

describe("getUnitFor", () => {
    it("maps temperature settings to unit strings", () => {
        expect(getUnitFor("temperature", "C")).toBe("°C");
        expect(getUnitFor("temperature", "F")).toBe("°F");
        expect(getUnitFor("temperature", "K")).toBe("K");
        expect(getUnitFor("temperature", "bogus")).toBe("°C");
    });

    it("maps humidity settings, with dewpoint following the temperature unit", () => {
        expect(getUnitFor("humidity", "0")).toBe("%");
        expect(getUnitFor("humidity", "1")).toBe("g/m³");
        expect(getUnitFor("humidity", "2")).toBe("°C");
        setStoredSettings({ UNIT_TEMPERATURE: "F" });
        expect(getUnitFor("humidity", "2")).toBe("°F");
    });

    it("maps pressure settings", () => {
        expect(getUnitFor("pressure", "0")).toBe("Pa");
        expect(getUnitFor("pressure", "1")).toBe("hPa");
        expect(getUnitFor("pressure", "2")).toBe("mmHg");
        expect(getUnitFor("pressure", "3")).toBe("inHg");
    });

    it("returns empty string for unknown keys", () => {
        expect(getUnitFor("co2", "whatever")).toBe("");
    });
});

describe("getUnitSettingFor", () => {
    it("returns defaults when nothing is stored", () => {
        expect(getUnitSettingFor("temperature")).toBe("C");
        expect(getUnitSettingFor("humidity")).toBe("0");
        expect(getUnitSettingFor("pressure")).toBe("1");
        expect(getUnitSettingFor("voc")).toBe("index");
    });

    it("returns the stored setting when present", () => {
        setStoredSettings({ UNIT_TEMPERATURE: "K", UNIT_PRESSURE: "3" });
        expect(getUnitSettingFor("temperature")).toBe("K");
        expect(getUnitSettingFor("pressure")).toBe("3");
    });

    it("returns null for unmapped keys", () => {
        expect(getUnitSettingFor("co2")).toBeNull();
    });
});

describe("getSetting", () => {
    it("returns the stored value or the fallback", () => {
        expect(getSetting("SOMETHING", "fb")).toBe("fb");
        setStoredSettings({ SOMETHING: "yes" });
        expect(getSetting("SOMETHING", "fb")).toBe("yes");
    });
});

describe("localeNumber", () => {
    // jsdom reports navigator.language as en-US
    it("formats numbers with the navigator locale", () => {
        expect(localeNumber(1234.5, 2)).toBe("1,234.50");
        expect(localeNumber(1234.5)).toBe("1,234.5");
        expect(localeNumber(7, 0)).toBe("7");
    });

    it("returns non-numbers as-is and NaN as a dash", () => {
        expect(localeNumber("abc", 2)).toBe("abc");
        expect(localeNumber(NaN, 2)).toBe("-");
    });
});

describe("getDisplayValue", () => {
    it("rounds aqi", () => {
        expect(getDisplayValue("aqi", 87.6)).toBe(88);
    });

    it("passes through keys other than temperature/humidity/pressure", () => {
        expect(getDisplayValue("co2", 412.34)).toBe(412.34);
        expect(getDisplayValue("co2", null)).toBeNull();
    });

    it("formats temperature with default decimals", () => {
        // 21.345 is stored as 21.34499…, so toFixed(2) yields "21.34"
        expect(getDisplayValue("temperature", 21.345, {})).toBe("21.34");
    });

    it("honors ACCURACY_* settings", () => {
        expect(getDisplayValue("temperature", 21.345, { ACCURACY_TEMPERATURE: "0" })).toBe("21");
        expect(getDisplayValue("humidity", 50.567, { ACCURACY_HUMIDITY: "1" })).toBe("50.6");
        expect(getDisplayValue("pressure", 1013.256, { ACCURACY_PRESSURE: "1" })).toBe("1,013.3");
    });

    it("honors variant-specific humidity accuracy keys", () => {
        expect(getDisplayValue("humidity", 50.567, { ACCURACY_HUMIDITY_RELATIVE: "0" })).toBe("51");
        expect(getDisplayValue("humidity", 50.567, { ACCURACY_HUMIDITY: "1", ACCURACY_HUMIDITY_RELATIVE: "0" })).toBe("51");
    });

    it("honors ACCURACY_PM", () => {
        expect(getDisplayValue("pm25", 12.345, { ACCURACY_PM: "0" })).toBe("12");
    });

    it("honors ACCURACY_ACCELERATION", () => {
        expect(getDisplayValue("accelerationX", 1.23456, { ACCURACY_ACCELERATION: "2" })).toBe("1.23");
    });

    it("honors ACCURACY_VOLTAGE", () => {
        expect(getDisplayValue("battery", 2.956, { ACCURACY_VOLTAGE: "1" })).toBe("3.0");
    });

    it("forces zero decimals for pressure in Pa", () => {
        expect(getDisplayValue("pressure", 101325.5, { UNIT_PRESSURE: "0", ACCURACY_PRESSURE: "2" })).toBe("101,326");
    });

    it("accepts settings as a JSON string", () => {
        expect(getDisplayValue("temperature", 21.345, '{"ACCURACY_TEMPERATURE":"1"}')).toBe("21.3");
    });

    it("parses locale-formatted string values", () => {
        expect(getDisplayValue("temperature", "1,234.56", {})).toBe("1,234.56");
        expect(getDisplayValue("temperature", "−5.5", {})).toBe("-5.50");
    });

    it("returns null untouched", () => {
        expect(getDisplayValue("temperature", null, {})).toBeNull();
    });
});

describe("getAlertRange", () => {
    it("returns known ranges", () => {
        expect(getAlertRange("temperature")).toEqual({ max: 85, min: -40, extended: { max: 150, min: -55 } });
        expect(getAlertRange("pressure")).toEqual({ max: 115500, min: 50000 });
        expect(getAlertRange("offline")).toEqual({ max: +Infinity, min: 120 });
        expect(getAlertRange("signal")).toEqual({ max: 0, min: -105 });
        expect(getAlertRange("battery")).toEqual({ max: 3.6, min: 1.8 });
        expect(getAlertRange("co2")).toEqual({ max: 2500, min: 350 });
        expect(getAlertRange("luminosity")).toEqual({ max: 144284, min: 0 });
        expect(getAlertRange("sound")).toEqual({ max: 127, min: 0 });
    });

    it("falls back to 0..100 for unknown types", () => {
        expect(getAlertRange("nope")).toEqual({ max: 100, min: 0 });
    });
});

describe("exported tables", () => {
    it("alertTypes keeps its order", () => {
        expect(alertTypes).toEqual([
            "temperature", "humidity", "humidityAbsolute", "dewPoint", "pressure",
            "signal", "movement", "offline", "battery", "aqi", "co2", "voc", "nox",
            "pm10", "pm25", "pm40", "pm100", "luminosity", "sound",
        ]);
    });

    it("DEFAULT_VISIBLE_SENSOR_TYPES keeps its order", () => {
        expect(DEFAULT_VISIBLE_SENSOR_TYPES).toEqual([
            "aqi", "co2", "pm25", "voc", "nox", "temperature", "humidity",
            "pressure", "illuminance", "movementCounter", "soundLevelInstant",
        ]);
    });

    it("every sensor type entry has the core fields", () => {
        const keys = Object.keys(allUnits).filter((k) => !k.startsWith("_"));
        expect(keys.length).toBeGreaterThan(20);
        for (const key of keys) {
            const entry = allUnits[key];
            expect(entry.label, key).toBeTypeOf("string");
            expect(entry.value, key).toBeTypeOf("function");
            expect(entry.fromUser, key).toBeTypeOf("function");
            expect(entry.decimals, key).toBeTypeOf("number");
            expect(entry.graphable, key).toBeTypeOf("boolean");
        }
    });

    it("humidity displayVariants keeps its public shape", () => {
        expect(allUnits.humidity.displayVariants).toEqual({
            "0": { unitKey: "%", label: "relative_humidity" },
            "1": { unitKey: "g/m³", label: "absolute_humidity" },
            "2": { unitKey: "dewpoint", label: "dewpoint" },
        });
    });

    it("units lists keep their cloudStoreKey/translationKey shape", () => {
        expect(allUnits.temperature.units.map((u) => u.cloudStoreKey)).toEqual(["C", "F", "K"]);
        expect(allUnits.pressure.units.map((u) => u.translationKey)).toEqual(["Pa", "hPa", "mmHg", "inHg"]);
        expect(allUnits.voc.units.map((u) => u.cloudStoreKey)).toEqual([
            "index", "ethanol_mgm3", "isobutylene_mgm3", "molhave_mgm3",
        ]);
        expect(allUnits.voc.units.map((u) => u.translationKey)).toEqual(["", "mgm3", "mgm3", "mgm3"]);
    });

    it("graphable types match the current list", () => {
        const graphable = Object.keys(allUnits).filter((k) => allUnits[k].graphable);
        expect(graphable).toEqual([
            "temperature", "humidity", "pressure", "movementCounter", "battery",
            "accelerationX", "accelerationY", "accelerationZ", "rssi",
            "measurementSequenceNumber", "pm10", "pm25", "pm40", "pm100", "co2",
            "voc", "nox", "illuminance", "soundLevelInstant", "soundLevelAvg",
            "soundLevelPeak", "aqi",
        ]);
    });
});

describe("getUnitHelper", () => {
    it("returns a fallback for unknown keys", () => {
        const h = getUnitHelper("bogus");
        expect(h.label).toBe("");
        expect(h.unit).toBe("");
        expect(h.decimals).toBe(0);
        expect(h.value(42)).toBe(42);
    });

    it("returns a copy, not the table entry", () => {
        const h = getUnitHelper("co2");
        h.label = "mutated";
        expect(allUnits.co2.label).toBe("carbon_dioxide");
    });

    it("aliases signal to rssi", () => {
        expect(getUnitHelper("signal").label).toBe("signal_strength");
        expect(getUnitHelper("signal").unit).toBe("dBm");
    });

    describe("temperature", () => {
        it("uses Celsius by default", () => {
            const h = getUnitHelper("temperature");
            expect(h.unit).toBe("°C");
            expect(h.infoLabel).toBe("description_text_temperature_celsius");
            expect(h.decimals).toBe(2);
        });

        it("follows the stored unit setting and accuracy", () => {
            setStoredSettings({ UNIT_TEMPERATURE: "F", ACCURACY_TEMPERATURE: "1" });
            const h = getUnitHelper("temperature");
            expect(h.unit).toBe("°F");
            expect(h.infoLabel).toBe("description_text_temperature_fahrenheit");
            expect(h.decimals).toBe(1);
        });

        it("explicit unit argument overrides the stored setting", () => {
            setStoredSettings({ UNIT_TEMPERATURE: "F" });
            const h = getUnitHelper("temperature", false, "K");
            expect(h.unit).toBe("K");
            expect(h.infoLabel).toBe("description_text_temperature_kelvin");
        });

        it("value() and valueWithUnit() convert", () => {
            const h = getUnitHelper("temperature");
            expect(h.value(25, false, { UNIT_TEMPERATURE: "F" })).toBe(77);
            expect(h.valueWithUnit(25, "F")).toBe(77);
        });
    });

    describe("humidity", () => {
        it("relative humidity by default", () => {
            const h = getUnitHelper("humidity");
            expect(h.unit).toBe("%");
            expect(h.label).toBe("relative_humidity");
            expect(h.shortLabel).toBe("rel_humidity");
        });

        it("absolute humidity: plaintext unit string", () => {
            setStoredSettings({ UNIT_HUMIDITY: "1" });
            const h = getUnitHelper("humidity", true);
            expect(h.unit).toBe("g/m³");
            expect(h.label).toBe("absolute_humidity");
            expect(h.shortLabel).toBe("abs_humidity");
            expect(h.infoLabel).toBe("description_text_humidity_absolute");
        });

        it("absolute humidity: JSX unit when not plaintext", () => {
            setStoredSettings({ UNIT_HUMIDITY: "1" });
            const h = getUnitHelper("humidity");
            expect(typeof h.unit).toBe("object");
        });

        it("dewpoint follows the temperature unit", () => {
            setStoredSettings({ UNIT_HUMIDITY: "2", UNIT_TEMPERATURE: "F" });
            const h = getUnitHelper("humidity");
            expect(h.unit).toBe("°F");
            expect(h.label).toBe("dewpoint");
            expect(h.shortLabel).toBe("dewpoint");
            expect(h.infoLabel).toBe("description_text_humidity_dewpoint");
        });

        it("honors ACCURACY_HUMIDITY", () => {
            setStoredSettings({ ACCURACY_HUMIDITY: "0" });
            expect(getUnitHelper("humidity").decimals).toBe(0);
        });

        it("honors ACCURACY_HUMIDITY_RELATIVE over legacy ACCURACY_HUMIDITY", () => {
            setStoredSettings({ ACCURACY_HUMIDITY: "0", ACCURACY_HUMIDITY_RELATIVE: "1" });
            expect(getUnitHelper("humidity").decimals).toBe(1);
        });

        it("falls back to legacy ACCURACY_HUMIDITY when variant key not set", () => {
            setStoredSettings({ ACCURACY_HUMIDITY: "0" });
            expect(getUnitHelper("humidity").decimals).toBe(0);
        });

        it("honors ACCURACY_HUMIDITY_ABSOLUTE", () => {
            setStoredSettings({ UNIT_HUMIDITY: "1", ACCURACY_HUMIDITY_ABSOLUTE: "0" });
            expect(getUnitHelper("humidity").decimals).toBe(0);
        });

        it("honors ACCURACY_HUMIDITY_DEW_POINT", () => {
            setStoredSettings({ UNIT_HUMIDITY: "2", ACCURACY_HUMIDITY_DEW_POINT: "1" });
            expect(getUnitHelper("humidity").decimals).toBe(1);
        });

        it("valueWithUnit converts using stored temperature unit", () => {
            setStoredSettings({ UNIT_TEMPERATURE: "F" });
            const h = getUnitHelper("humidity");
            expect(h.valueWithUnit(50, "2", 20)).toBe(48.69);
            expect(h.valueWithUnit(50, "1", 20)).toBe(8.64);
            expect(h.valueWithUnit(50, "0", 20)).toBe(50);
        });
    });

    describe("pressure", () => {
        it("hPa by default", () => {
            const h = getUnitHelper("pressure");
            expect(h.unit).toBe("hPa");
            expect(h.decimals).toBe(2);
        });

        it("Pa forces zero decimals even with accuracy set", () => {
            setStoredSettings({ UNIT_PRESSURE: "0", ACCURACY_PRESSURE: "2" });
            const h = getUnitHelper("pressure");
            expect(h.unit).toBe("Pa");
            expect(h.decimals).toBe(0);
        });

        it("honors ACCURACY_PRESSURE for non-Pa units", () => {
            setStoredSettings({ UNIT_PRESSURE: "2", ACCURACY_PRESSURE: "1" });
            const h = getUnitHelper("pressure");
            expect(h.unit).toBe("mmHg");
            expect(h.decimals).toBe(1);
        });
    });

    describe("particulate matter", () => {
        it("has default decimals of 1", () => {
            expect(getUnitHelper("pm25").decimals).toBe(1);
            expect(getUnitHelper("pm100").decimals).toBe(1);
        });

        it("honors ACCURACY_PM", () => {
            setStoredSettings({ ACCURACY_PM: "0" });
            expect(getUnitHelper("pm25").decimals).toBe(0);
            expect(getUnitHelper("pm100").decimals).toBe(0);
        });
    });

    describe("voc", () => {
        it("index by default, with empty unit", () => {
            const h = getUnitHelper("voc");
            expect(h.unit).toBe("");
            expect(h.label).toBe("volatile_organic_compounds");
            expect(h.decimals).toBe(0);
        });

        it("mg/m³ variants: plaintext labels and units", () => {
            const h = getUnitHelper("voc", true, "ethanol_mgm3");
            expect(h.unit).toBe("mg/m³");
            expect(h.shortLabel).toBe("TVOCEthanol");
            expect(h.label).toBe("total_volatile_organic_compounds");
            expect(h.decimals).toBe(2);
        });

        it("mg/m³ variants: JSX labels when not plaintext", () => {
            const h = getUnitHelper("voc", false, "isobutylene_mgm3");
            expect(typeof h.unit).toBe("object");
            expect(typeof h.shortLabel).toBe("object");
        });

        it("tvoc_* keys alias to voc variants", () => {
            const h = getUnitHelper("tvoc_molhave", true);
            expect(h.unit).toBe("mg/m³");
            expect(h.shortLabel).toBe("TVOCMolhave");
        });

        it("valueWithUnit converts the VOC index", () => {
            const h = getUnitHelper("voc");
            expect(h.valueWithUnit(100, "index")).toBe(100);
            expect(h.valueWithUnit(100, "ethanol_mgm3")).toBeCloseTo(49.8749, 3);
            expect(h.valueWithUnit(100, "isobutylene_mgm3")).toBeCloseTo(216.1525, 3);
            expect(h.valueWithUnit(100, "molhave_mgm3")).toBeCloseTo(422.9071, 3);
        });
    });

    describe("simple value conversions", () => {
        it("battery converts mV to V both ways", () => {
            const h = getUnitHelper("battery");
            expect(h.value(2950)).toBe(2.95);
            expect(h.fromUser(2.95)).toBe(2950);
        });

        it("acceleration converts mG to g", () => {
            expect(getUnitHelper("accelerationX").value(1000)).toBe(1);
            expect(getUnitHelper("accelerationY").decimals).toBe(3);
        });

        it("honors ACCURACY_ACCELERATION", () => {
            setStoredSettings({ ACCURACY_ACCELERATION: "1" });
            expect(getUnitHelper("accelerationX").decimals).toBe(1);
            expect(getUnitHelper("accelerationY").decimals).toBe(1);
            expect(getUnitHelper("accelerationZ").decimals).toBe(1);
        });

        it("honors ACCURACY_VOLTAGE", () => {
            setStoredSettings({ ACCURACY_VOLTAGE: "0" });
            expect(getUnitHelper("battery").decimals).toBe(0);
        });
    });

});

describe("option string helpers", () => {
    it("getSensorTypeOnly splits on the first underscore", () => {
        expect(getSensorTypeOnly("humidity_1")).toBe("humidity");
        expect(getSensorTypeOnly("voc_ethanol_mgm3")).toBe("voc");
        expect(getSensorTypeOnly("temperature")).toBe("temperature");
        expect(getSensorTypeOnly(null)).toBeNull();
    });

    it("getUnitOnly returns the part after the first underscore", () => {
        expect(getUnitOnly("humidity_1")).toBe("1");
        expect(getUnitOnly("voc_ethanol_mgm3")).toBe("ethanol_mgm3");
        expect(getUnitOnly("temperature")).toBe("temperature");
        expect(getUnitOnly(null)).toBeNull();
    });
});
