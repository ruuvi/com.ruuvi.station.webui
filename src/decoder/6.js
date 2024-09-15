import { round } from "../UnitHelper";

// cid  df  pm2 pm2.  pm4 pm10  c02     packed msqn          mac
// 9904 06 0027 0028 0028 0028 03AB 4CCC4010F0 00BE C803C7B14436
// 0    2  3    5    7    9    11   13      17 18   20

const parseRawRuuvi = function (data) {
  const robject = {};

  const pmFrom = offset => {
    let pm = (data[offset] << 8) | data[offset + 1];
    return round(pm / 10.0, 2);
  }

  robject.pm1p0 = pmFrom(3)
  robject.pm2p5 = pmFrom(5)
  robject.pm4p0 = pmFrom(7)
  robject.pm10p0 = pmFrom(9)

  let co2 = (data[11] << 8) | data[12];
  robject.co2 = round(co2, 2);

  let humidity = (((data[13] << 8) | (data[14] & 0x11000000))) >> 6
  robject.humidity = round(humidity / 10, 2)

  let temperature = (((data[16] & 0b00000011) << 8) | (data[17]))
  if (data[16] & 0b00000100) {
    temperature -= 1024
  }
  robject.temperature = round(temperature / 10, 2)

  let voc = ((data[14] & 0b00111111) << 3) | ((data[15] & 0b11100000) >> 5)
  robject.voc = voc

  let nox = ((data[15] & 0b00011111) << 4) | ((data[16] & 0b11110000) >> 4)
  robject.nox = nox

  robject.measurementSequenceNumber = ((data[18] & 0xff) << 8) | (data[19] & 0xff);
  robject.mac = [
    int2Hex(data[20]),
    int2Hex(data[21]),
    int2Hex(data[22]),
    int2Hex(data[23]),
    int2Hex(data[24]),
    int2Hex(data[25])
  ].join(':');
  robject.dataFormat = 6;
  return robject;
};

export default {
  parse: buffer => parseRawRuuvi(buffer)
};

function int2Hex(str) {
  return ('0' + str.toString(16).toUpperCase()).slice(-2);
}