import { round } from "../UnitHelper";

const parseRawRuuvi = function (data) {
  const robject = {};

  let temperature = (data[5] << 8) | (data[6] & 0xff);
  if (temperature > 32767) {
    temperature -= 65536;
  }
  robject.temperature = temperature / 200.0;
  robject.temperature = round(robject.temperature, 2);

  if (!(data[7] === 255 && data[8] === 255)) {
    robject.humidity = (((data[7] & 0xff) << 8) | (data[8] & 0xff)) / 400.0;
    robject.humidity = round(robject.humidity, 2);
  }

  if (!(data[9] === 255 && data[10] === 255)) {
    robject.pressure = (((data[9] & 0xff) << 8) | (data[10] & 0xff)) + 50000;
  }

  const pmFrom = offset => {
    let pm = (data[offset] << 8) | data[offset + 1];
    return round(pm / 10.0, 2);
  }

  robject.pm1p0 = pmFrom(11)
  robject.pm2p5 = pmFrom(13)
  robject.pm4p0 = pmFrom(15)
  robject.pm10p0 = pmFrom(17)

  robject.co2 = ((data[19] & 0b00011111) << 4) | ((data[20] & 0b11110000) >> 4)
  robject.voc = ((data[21] & 0b11111111) << 1) | ((data[22] & 0b10000000) >> 7)
  robject.nox = ((data[23] & 0b11111111) << 1) | ((data[24] & 0b10000000) >> 7)
  robject.illuminance = ((data[25] & 0b00011111) << 4) | ((data[26] & 0b11110000) >> 4)

  robject.soundLevelAvg = data[27] * 0.5
  robject.soundLevelPeak = data[28] * 0.5

  robject.measurementSequenceNumber = ((data[29] & 0xff) << 8) | (data[30] & 0xff);
  robject.battery = data[31] * 0.03 * 1000;

  
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
