const bitcoin = require('bitgo-utxo-lib');

const parseBlockHeader = (hex, network) => {
  const block = bitcoin.Block.fromBuffer(new Buffer.from(hex, 'hex'), network, true);
  return block;
};

const electrumMerkleRoot = (parsedBlock) => {
  if (parsedBlock.merkleRoot) { // electrum protocol v1.4
    return Buffer.from(parsedBlock.merkleRoot.reverse()).toString('hex');
  } else {
    return parsedBlock.merkle_root;
  }
};

module.exports = {
  parseBlockHeader,
  electrumMerkleRoot,
};