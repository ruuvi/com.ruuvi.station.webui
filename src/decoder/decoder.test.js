import { describe, expect, it } from "vitest";
import decoder from "./decode";
import df2and4 from "./2and4";
import df3 from "./3";
import df5 from "./5";
import df6 from "./6";
import parse from "./parser";
import { aqi } from "./untils";

function hexToBytes(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// Official test vectors from docs.ruuvi.com, wrapped in a BLE advertisement
// (flags AD + manufacturer data AD with company id FF9904) the way the cloud
// stores them.
const DF5_VALID_ADV = "0201061BFF9904" + "0512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F";
const DF3_VALID_ADV = "0201061BFF9904" + "03291A1ECE1EFC18F94202CA0B53";

describe("data format 5 (RAWv2)", () => {
    // https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2
    it("decodes the official 'valid data' vector", () => {
        const result = decoder(DF5_VALID_ADV);
        expect(result).toMatchObject({
            dataFormat: 5,
            temperature: 24.3,
            humidity: 53.49,
            pressure: 100044,
            accelerationX: 4,
            accelerationY: -4,
            accelerationZ: 1036,
            battery: 2977,
            txPower: 4,
            movementCounter: 66,
            measurementSequenceNumber: 205,
            mac: "CB:B8:33:4C:88:4F",
        });
    });

    it("decodes the official 'maximum values' vector", () => {
        const bytes = hexToBytes("9904" + "057FFFFFFEFFFE7FFF7FFF7FFFFFDEFEFFFECBB8334C884F");
        expect(df5.parse(bytes)).toMatchObject({
            temperature: 163.835,
            humidity: 163.835,
            pressure: 115534,
            accelerationX: 32767,
            accelerationY: 32767,
            accelerationZ: 32767,
            battery: 3646,
            txPower: 20,
            movementCounter: 254,
            measurementSequenceNumber: 65534,
        });
    });

    it("decodes the official 'minimum values' vector", () => {
        const bytes = hexToBytes("9904" + "058001000000008001800180010000000000CBB8334C884F");
        expect(df5.parse(bytes)).toMatchObject({
            temperature: -163.835,
            humidity: 0,
            pressure: 50000,
            accelerationX: -32767,
            accelerationY: -32767,
            accelerationZ: -32767,
            battery: 1600,
            txPower: -40,
            movementCounter: 0,
            measurementSequenceNumber: 0,
        });
    });

    it("omits fields set to their 'not available' sentinels", () => {
        const bytes = hexToBytes("9904" + "058000FFFFFFFF800080008000000000FFFFCBB8334C884F");
        const result = df5.parse(bytes);
        expect(result.temperature).toBeUndefined();
        expect(result.humidity).toBeUndefined();
        expect(result.pressure).toBeUndefined();
        expect(result.accelerationX).toBeUndefined();
        expect(result.accelerationY).toBeUndefined();
        expect(result.accelerationZ).toBeUndefined();
    });
});

describe("data format 3 (RAWv1)", () => {
    // https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-3-rawv1
    it("decodes the official 'valid data' vector", () => {
        expect(decoder(DF3_VALID_ADV)).toMatchObject({
            dataFormat: 3,
            humidity: 20.5,
            temperature: 26.3,
            pressure: 102766,
            accelerationX: -1000,
            accelerationY: -1726,
            accelerationZ: 714,
            battery: 2899,
        });
    });

    it("decodes negative temperatures (sign bit + magnitude)", () => {
        // temperature bytes 0x81 0x45 -> -(1 + 69/100)
        const result = df3.parse("9904" + "03298145CE1EFC18F94202CA0B53");
        expect(result.temperature).toBeCloseTo(-1.69, 10);
    });
});

describe("data format C5 (cut RAWv2)", () => {
    it("decodes a packet reusing the format 5 field values", () => {
        const result = decoder("1AFF9904" + "C512FC5394C37CAC364200CDCBB8334C884F");
        expect(result).toMatchObject({
            dataFormat: "c5",
            temperature: 24.3,
            humidity: 53.49,
            pressure: 100044,
            battery: 2977,
            txPower: 4,
            movementCounter: 66,
            measurementSequenceNumber: 205,
            mac: "CB:B8:33:4C:88:4F",
        });
    });

    it("omits temperature/humidity/pressure sentinels", () => {
        const result = decoder("1AFF9904" + "C58000FFFFFFFFAC364200CDCBB8334C884F");
        expect(result.temperature).toBeUndefined();
        expect(result.humidity).toBeUndefined();
        expect(result.pressure).toBeUndefined();
    });
});

describe("data format 6", () => {
    // Matches the draft layout this decoder was written against (sample
    // packet documented in 6.js), not the current published format 6 spec.
    it("decodes the sample packet from the decoder's own documentation", () => {
        const result = decoder("1CFF" + "990406002700280028002803AB4CCC4010F000BEC803C7B14436");
        expect(result).toMatchObject({
            dataFormat: 6,
            pm10: 3.9,
            pm25: 4,
            pm40: 4,
            pm100: 4,
            co2: 939,
            humidity: 30.7, // 10-bit field: needs both high bits of data[14]
            temperature: 24,
            voc: 98,
            nox: 1,
            measurementSequenceNumber: 190,
            mac: "C8:03:C7:B1:44:36",
        });
    });

    it("decodes negative temperatures (10-bit two's complement)", () => {
        // data[16] bit 2 set -> temperature - 1024
        const bytes = hexToBytes("990406002700280028002803AB4CCC4014F000BEC803C7B14436");
        expect(df6.parse(bytes).temperature).toBe(-78.4);
    });
});

describe("data format E0", () => {
    const E0_VALID =
        "27FF9904" + "E0" +
        "170C" + // temperature 29.5
        "5668" + // humidity 55.3
        "C79E" + // pressure 101102
        "0065" + "0070" + "04BD" + "11CA" + // pm 10.1 / 11.2 / 121.3 / 455.4
        "00C9" + // co2 201
        "0104" + // voc 260 (9 bit)
        "0002" + // nox 2 (9 bit)
        "32E3" + // illuminance 13027
        "5B" + "78" + // sound avg 45.5, peak 60 (0.5 dB steps)
        "0BB8" + // sequence number 3000
        "64" + // battery 100 * 30 mV = 3000 mV
        "0F" + // flags
        "0000000000" + // reserved
        "CBB8334C884F";

    it("decodes a full packet", () => {
        expect(decoder(E0_VALID)).toMatchObject({
            dataFormat: "e0",
            temperature: 29.5,
            humidity: 55.3,
            pressure: 101102,
            pm10: 10.1,
            pm25: 11.2,
            pm40: 121.3,
            pm100: 455.4,
            co2: 201,
            voc: 260,
            nox: 2,
            illuminance: 13027,
            soundLevelAvg: 45.5,
            soundLevelPeak: 60,
            measurementSequenceNumber: 3000,
            battery: 3000,
            flags: { usbOn: 1, lowBattery: 1, calibration: 1, boostMode: 1 },
            mac: "CB:B8:33:4C:88:4F",
        });
    });

    it("computes aqi from pm2.5 and co2", () => {
        // co2 201 clamps to 420 -> dy 0; dx = 11.2 * 100/60; aqi = 100 - dx
        expect(decoder(E0_VALID).aqi).toBe(81.33);
    });

    it("omits every field set to its 'not available' sentinel", () => {
        const packet =
            "27FF9904" + "E0" + "8000" + "FFFF" + "FFFF" +
            "FFFF" + "FFFF" + "FFFF" + "FFFF" + "FFFF" +
            "01FF" + "01FF" + "FFFF" + "FF" + "FF" + "FFFF" + "FF" + "00" +
            "0000000000" + "CBB8334C884F";
        const result = decoder(packet);
        for (const field of ["temperature", "humidity", "pressure", "pm10", "pm25",
            "pm40", "pm100", "co2", "voc", "nox", "illuminance",
            "soundLevelAvg", "soundLevelPeak", "measurementSequenceNumber", "battery"]) {
            expect(result[field], field).toBeUndefined();
        }
        expect(result.aqi).toBeNull();
    });
});

describe("data format E1", () => {
    // Official 'valid data' vector from docs.ruuvi.com (reserved bytes zeroed)
    const E1_VALID =
        "2BFF9904" + "E1" +
        "170C" + "5668" + "C79E" +
        "0065" + "0070" + "04BD" + "11CA" +
        "00C9" +
        "0A" + "02" + // voc 20, nox 4 (bit 0 of each lives in the flags byte)
        "13E0AC" + // illuminance 13027.00
        "000000" + // reserved / sound (draft)
        "DECDEE" + // sequence number 14601710
        "01" + // flags: calibrating
        "0000000000" +
        "CBB8334C884F";

    it("decodes the official 'valid data' vector", () => {
        expect(decoder(E1_VALID)).toMatchObject({
            dataFormat: "e1",
            temperature: 29.5,
            humidity: 55.3,
            pressure: 101102,
            pm10: 10.1,
            pm25: 11.2,
            pm40: 121.3,
            pm100: 455.4,
            co2: 201,
            voc: 20,
            nox: 4,
            illuminance: 13027,
            measurementSequenceNumber: 14601710,
            flags: { calibrating: 1, buttonPressed: 0, rtcOnBoot: 0 },
            mac: "CB:B8:33:4C:88:4F",
            aqi: 81.33,
        });
    });

    it("reads the 9th voc/nox bit from the flags byte", () => {
        const packet = E1_VALID.replace("0A" + "02" + "13E0AC", "FA" + "FA" + "13E0AC")
            .replace("DECDEE" + "01", "DECDEE" + "C0"); // flags bits 6+7 set
        const result = decoder(packet);
        expect(result.voc).toBe(501);
        expect(result.nox).toBe(501);
    });

    it("omits voc/nox/sequence sentinels", () => {
        const packet = E1_VALID.replace("0A" + "02" + "13E0AC", "FF" + "FF" + "13E0AC")
            .replace("DECDEE" + "01", "FFFFFF" + "C0"); // voc/nox 511, seq 0xFFFFFF
        const result = decoder(packet);
        expect(result.voc).toBeUndefined();
        expect(result.nox).toBeUndefined();
        expect(result.measurementSequenceNumber).toBeUndefined();
    });

    it("decodes negative temperature and omits the 0x8000 sentinel", () => {
        expect(decoder(E1_VALID.replace("E1" + "170C", "E1" + "8001")).temperature).toBe(-163.835);
        expect(decoder(E1_VALID.replace("E1" + "170C", "E1" + "8000")).temperature).toBeUndefined();
    });
});

describe("data formats 2 and 4 (Eddystone URL)", () => {
    it("is dispatched from a hex-encoded ruu.vi URL", () => {
        // ASCII "ruu.vi/#BCmVzh4R" -> base64 payload [4, 41, 0x95, 0xCE, 0x1E, 0x11]
        const result = decoder("7275752E76692F2342436D567A683452");
        expect(result).toMatchObject({
            dataFormat: 4,
            humidity: 20.5,
            temperature: -21, // 0x95: sign bit + magnitude
            pressure: 102766,
        });
        expect(result.eddystoneId).toBeUndefined();
    });

    it("includes the eddystone id for 7-byte payloads", () => {
        const result = df2and4.parse([4, 41, 21, 0xCE, 0x1E, 0xAB, 0x01]);
        expect(result).toMatchObject({
            dataFormat: 4,
            humidity: 20.5,
            temperature: 21,
            pressure: 102766,
            eddystoneId: 0xAB,
        });
    });
});

describe("decode dispatch", () => {
    it("returns null for an unknown data format", () => {
        expect(decoder("0201061BFF990407AABB")).toBeNull();
    });

    it("returns null when there is no Ruuvi company id or ruu.vi URL", () => {
        expect(decoder("020106AABBCC")).toBeNull();
    });

    it("returns null for empty or garbage input instead of throwing", () => {
        expect(decoder("")).toBeNull();
        expect(decoder("zzzz")).toBeNull();
    });
});

describe("parser", () => {
    const measurement = (timestamp, rssi, data = DF5_VALID_ADV) => ({ timestamp, rssi, data });
    const sensor = (measurements, offsets = {}) => ({
        offsetTemperature: 0,
        offsetHumidity: 0,
        offsetPressure: 0,
        ...offsets,
        measurements,
    });

    it("decodes, filters unparseable measurements and sorts newest first", () => {
        const result = parse(sensor([
            measurement(100, -50),
            measurement(200, -60, "0201061BFF990407AABB"), // unknown format
            measurement(300, -70),
        ]));
        expect(result.measurements).toHaveLength(2);
        expect(result.measurements.map(m => m.timestamp)).toEqual([300, 100]);
        expect(result.latestTimestamp).toBe(300);
        expect(result.measurements[0].parsed.rssi).toBe(-70);
    });

    it("applies calibration offsets to parsed values", () => {
        const result = parse(sensor([measurement(100, -50)], {
            offsetTemperature: 1.5,
            offsetHumidity: -3.49,
            offsetPressure: 100,
        }));
        const parsed = result.measurements[0].parsed;
        expect(parsed.temperature).toBe(25.8);
        expect(parsed.humidity).toBe(50);
        expect(parsed.pressure).toBe(100144);
    });

    it("leaves values untouched when offsets are zero", () => {
        const parsed = parse(sensor([measurement(100, -50)])).measurements[0].parsed;
        expect(parsed.temperature).toBe(24.3);
        expect(parsed.humidity).toBe(53.49);
        expect(parsed.pressure).toBe(100044);
    });

    it("handles an empty measurement list", () => {
        const result = parse(sensor([]));
        expect(result.measurements).toEqual([]);
        expect(result.latestTimestamp).toBeUndefined();
    });
});

describe("aqi", () => {
    it("is 100 in clean air (pm2.5 at 0, co2 at or below baseline)", () => {
        expect(aqi(0, 420)).toBe(100);
        expect(aqi(0, 0)).toBe(100); // co2 clamps up to the 420 baseline
    });

    it("is 0 when both inputs are at or beyond their maximums", () => {
        expect(aqi(60, 2300)).toBe(0);
        expect(aqi(999, 99999)).toBe(0); // clamped
    });

    it("combines the axes with a euclidean distance", () => {
        // dx = 11.2 * 100/60, dy = 0 -> 100 - 18.67
        expect(aqi(11.2, 201)).toBe(81.33);
        // dx = dy = 50 -> 100 - sqrt(5000) = 29.29
        expect(aqi(30, 1360)).toBe(29.29);
    });

    it("returns null when either input is missing", () => {
        expect(aqi(undefined, undefined)).toBeNull();
        expect(aqi(10, undefined)).toBeNull();
        expect(aqi(undefined, 500)).toBeNull();
        expect(aqi(NaN, 500)).toBeNull();
    });
});
