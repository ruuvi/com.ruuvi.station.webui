import { round } from "../UnitHelper";

const parseRawRuuvi = function (data) {
  const robject = {};

  let temperature = (data[5] << 8) | (data[6] & 0xff);
  if (temperature !== 0x8000) {
    if (temperature > 32767) {
      temperature -= 65536;
    }
    robject.temperature = temperature / 200.0;
    robject.temperature = round(robject.temperature, 2);
  }

  if (!(data[7] === 255 && data[8] === 255)) {
    robject.humidity = (((data[7] & 0xff) << 8) | (data[8] & 0xff)) / 400.0;
    robject.humidity = round(robject.humidity, 2);
  }

  if (!(data[9] === 255 && data[10] === 255)) {
    robject.pressure = (((data[9] & 0xff) << 8) | (data[10] & 0xff)) + 50000;
  }

  const pmTypes = ["pm1p0", "pm2p5", "pm4p0", "pm10p0"];
  const pmOffsets = [11, 13, 15, 17];

  pmOffsets.forEach((offset, index) => {
    const pm = (data[offset] << 8) | data[offset + 1];
    const value = pm === 0xFFFF ? null : round(pm / 10.0, 2);
    if (value !== null) {
      robject[pmTypes[index]] = value;
    }
  });

  const co2 = ((data[19] << 8) | data[20])
  if (co2 !== 0xFFFF) robject.co2 = co2

  const voc = (((data[21] & 0b00000001) << 8) | data[22])
  if (voc !== 511) robject.voc = voc

  const nox = (((data[23] & 0b00000001) << 8) | data[24])
  if (nox !== 511) robject.nox = nox

  const illuminance = ((data[25] << 8) | data[26])
  if (illuminance !== 0xFFFF) robject.illuminance = illuminance

  if (data[27] !== 0xFF) robject.soundLevelAvg = data[27] * 0.5

  if (data[28] !== 0xFF) robject.soundLevelPeak = data[28] * 0.5

  const measurementSequenceNumber = ((data[29] & 0xff) << 8) | (data[30] & 0xff);
  if (robject.measurementSequenceNumber !== 0xFFFF) robject.measurementSequenceNumber = measurementSequenceNumber

  if (data[31] === 0xFF) robject.battery = data[31] * 0.03 * 1000;


  robject.flags = {
    usbOn: (data[32] & 0b10000000) >> 7,
    lowBattery: (data[32] & 0b01000000) >> 6,
    calibration: (data[32] & 0b00100000) >> 5,
    boostMode: (data[32] & 0b00010000) >> 4
  }

  //robject.flags = data[32].toString(2).padStart(8, '0')

  // 33 fw version
  // 34 movement
  // 35 acc x
  // 36 acc y
  // 37 acc z

  robject.mac = [
    int2Hex(data[38]),
    int2Hex(data[39]),
    int2Hex(data[40]),
    int2Hex(data[41]),
    int2Hex(data[42]),
    int2Hex(data[43])
  ].join(':');

  robject.dataFormat = "e0";
  return robject;
};

export default {
  parse: buffer => parseRawRuuvi(buffer)
};

function int2Hex(str) {
  return ('0' + str.toString(16).toUpperCase()).slice(-2);
}
