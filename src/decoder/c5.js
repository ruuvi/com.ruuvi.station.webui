const { round } = require("../UnitHelper");

const parseRawRuuvi = function (data) {
  const robject = {};

  let temperature = (data[3] << 8) | (data[4] & 0xff);
  if (temperature > 32767) {
    temperature -= 65536;
  }
  robject.temperature = temperature / 200.0;
  robject.temperature = round(robject.temperature, 2);

  if (!(data[5] === 255 && data[6] === 255)) {
    robject.humidity = (((data[5] & 0xff) << 8) | (data[6] & 0xff)) / 400.0;
    robject.humidity = round(robject.humidity, 2);
  }

  if (!(data[7] === 255 && data[8] === 255)) {
    robject.pressure = (((data[7] & 0xff) << 8) | (data[8] & 0xff)) + 50000;
  }

  const powerInfo = ((data[9] & 0xff) << 8) | (data[10] & 0xff);
  robject.battery = (powerInfo >>> 5) + 1600;
  robject.txPower = (powerInfo & 0b11111) * 2 - 40;
  robject.movementCounter = data[11] & 0xff;
  robject.measurementSequenceNumber = ((data[12] & 0xff) << 8) | (data[13] & 0xff);
  robject.mac = [
    int2Hex(data[14]),
    int2Hex(data[15]),
    int2Hex(data[16]),
    int2Hex(data[17]),
    int2Hex(data[18]),
    int2Hex(data[19])
  ].join(':');
  robject.dataFormat = "c5";
  return robject;
};

module.exports = {
  parse: buffer => parseRawRuuvi(buffer)
};

function int2Hex(str) {
  return ('0' + str.toString(16).toUpperCase()).slice(-2);
}
