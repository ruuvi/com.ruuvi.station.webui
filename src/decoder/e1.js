import { round } from "../UnitHelper";

const parse = function (data) {
  const robject = {};

  let temperature = (data[5] << 8) | (data[6] & 0xff);
  if (temperature !== 0x8000) {
    if (temperature > 32767) {
      temperature -= 65536;
    }
    robject.temperature = temperature / 200.0;
  }

  if (!(data[7] === 255 && data[8] === 255)) {
    robject.humidity = (((data[7] & 0xff) << 8) | (data[8] & 0xff)) / 400.0;
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

  const voc = data[21] << 1 | (data[32] & 0b01000000) >> 6;
  if (voc !== 511) robject.voc = voc

  const nox = data[22] << 1 | (data[32] & 0b10000000) >> 7;
  if (nox !== 511) robject.nox = nox

  const illuminance = ((data[23] << 16) | (data[24] << 8) | data[25])
  if (illuminance !== 0xFFFFFF) robject.illuminance = illuminance * 0.01

  const soundLevelInstant = data[26] << 1 | (data[32] & 0b00001000) >> 3;
  if (soundLevelInstant !== 511) robject.soundLevelInstant = soundLevelInstant * 0.2 + 18;

  const soundLevelAvg = data[27] << 1 | (data[32] & 0b00010000) >> 4;
  if (soundLevelAvg !== 511) robject.soundLevelAvg = soundLevelAvg * 0.2 + 18

  const soundLevelPeak = data[28] << 1 | (data[32] & 0b00100000) >> 5;
  if (soundLevelPeak !== 511) robject.soundLevelPeak = soundLevelPeak * 0.2 + 18

  const measurementSequenceNumber = (data[29] << 16) | (data[30] << 8) | data[31];
  if (robject.measurementSequenceNumber !== 0xFFFFFF) robject.measurementSequenceNumber = measurementSequenceNumber

  robject.flags = {
    calibrating: (data[32] & 0b00000001),
    buttonPressed: (data[32] & 0b00000010) >> 1,
    rtcOnBoot: (data[32] & 0b00000100) >> 2,
  }

  // reserved
  // 33 fw version
  // 34 sraw_voc
  // 35 sraw_voc
  // 36 sraw_nox
  // 37 sraw_nox

  robject.mac = [
    int2Hex(data[38]),
    int2Hex(data[39]),
    int2Hex(data[40]),
    int2Hex(data[41]),
    int2Hex(data[42]),
    int2Hex(data[43])
  ].join(':');

  // aqi
  function scorePpm(ppm) {
    return Math.max(0, (ppm - 12) * 2);
  }
  function scoreVoc(voc) {
    return Math.max(0, (voc - 200));
  }
  function scoreNox(nox) {
    return Math.max(0, (nox - 200));
  }
  function scoreCo2(co2) {
    return Math.max(0, (co2 - 600) / 10);
  }

  let distances = [];
  if (robject.pm2p5 !== undefined) {
    distances.push(scorePpm(robject.pm2p5));
  }
  if (robject.voc !== undefined) {
    distances.push(scoreVoc(robject.voc));
  }
  if (robject.co2 !== undefined) {
    distances.push(scoreCo2(robject.co2));
  }
  if (robject.nox !== undefined) {
    distances.push(scoreNox(robject.nox));
  }
  const distance = Math.sqrt(distances.reduce((acc, val) => acc + val * val, 0) / distances.length);
  robject.aqi = Math.max(0, 100 - distance);
  robject.aqi = round(robject.aqi, 2);

  /*
  100...66 -> green,
  66..33 -> yellow,
  33...0 -> red
  */

  robject.dataFormat = "e1";
  return robject;
};

export default {
  parse
};

function int2Hex(str) {
  return ('0' + str.toString(16).toUpperCase()).slice(-2);
}
