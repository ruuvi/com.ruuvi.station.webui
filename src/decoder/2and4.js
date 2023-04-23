function unSign(signed) {
  return signed & 0x80 ? -1 * (signed & 0x7f) : signed;
}

module.exports = {
  parse: buffer => {
    return {
      dataFormat: buffer[0],
      humidity: buffer[1] / 2,
      temperature: unSign(buffer[2]),
      pressure: (buffer[3] * 256 + buffer[4] + 50000),
      eddystoneId: buffer.length === 7 ? buffer[5] : undefined,
    };
  },
};