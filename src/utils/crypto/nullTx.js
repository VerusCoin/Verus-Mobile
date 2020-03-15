const NULL_TX = Buffer.from(
  Array.apply(null, Array(32)).map(function() {
    return 0;
  }),
  "hex"
);

module.exports = NULL_TX