function minifier(options) {
  return {
    code: options.code,
    map: options.map,
  };
}

module.exports = minifier;
