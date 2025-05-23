const parseRawRuuvi = function (data) {
  const robject = {};

  let temperature = (data[3] << 8) | (data[4] & 0xff);
  if (temperature > 32767) {
    temperature -= 65536;
  }
  robject.temperature = temperature / 200.0;

  if (!(data[5] === 255 && data[6] === 255)) {
    robject.humidity = (((data[5] & 0xff) << 8) | (data[6] & 0xff)) / 400.0;
  }

  if (!(data[7] === 255 && data[8] === 255)) {
    robject.pressure = (((data[7] & 0xff) << 8) | (data[8] & 0xff)) + 50000;
  }

  if (!(data[9] === 128 && data[10] === 0)) {
    let accelerationX = (data[9] << 8) | (data[10] & 0xff);
    if (accelerationX > 32767) accelerationX -= 65536; // two's complement
    robject.accelerationX = accelerationX;
  }

  if (!(data[11] === 128 && data[12] === 0)) {
    let accelerationY = (data[11] << 8) | (data[12] & 0xff);
    if (accelerationY > 32767) accelerationY -= 65536; // two's complement
    robject.accelerationY = accelerationY;
  }

  if (!(data[13] === 128 && data[14] === 0)) {
    let accelerationZ = (data[13] << 8) | (data[14] & 0xff);
    if (accelerationZ > 32767) accelerationZ -= 65536; // two's complement
    robject.accelerationZ = accelerationZ;
  }

  const powerInfo = ((data[15] & 0xff) << 8) | (data[16] & 0xff);
  robject.battery = (powerInfo >>> 5) + 1600;
  robject.txPower = (powerInfo & 0b11111) * 2 - 40;
  robject.movementCounter = data[17] & 0xff;
  robject.measurementSequenceNumber = ((data[18] & 0xff) << 8) | (data[19] & 0xff);
  robject.mac = [
    int2Hex(data[20]),
    int2Hex(data[21]),
    int2Hex(data[22]),
    int2Hex(data[23]),
    int2Hex(data[24]),
    int2Hex(data[25])
  ].join(':');
  robject.dataFormat = 5;
  return robject;
};

export default {
  parse: buffer => parseRawRuuvi(buffer)
};

function int2Hex(str) {
  return ('0' + str.toString(16).toUpperCase()).slice(-2);
}
