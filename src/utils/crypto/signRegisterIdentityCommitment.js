/**
 * Sign the name-commitment input of a registeridentity returntx WITHOUT
 * destroying existing SmartTransactionSignatures (parent / funding sigs).
 *
 * @bitgo/utxo-lib TransactionBuilder.sign() for SMART_TRANSACTION replaces the
 * entire signature blob with a single entry — that breaks vrealv1's 2-of-2
 * commitment (user + parent). The daemon *appends* the user fulfillment; this
 * helper mirrors that (proven 2026-07-13 VRSCTEST).
 */
const {
  networks,
  Transaction,
  ECPair,
  ECSignature,
} = require('@bitgo/utxo-lib');
const bscript = require('@bitgo/utxo-lib/src/script');
const SmartTransactionSignatures = require('@bitgo/utxo-lib/src/smart_transaction_signatures');
const SmartTransactionSignature = require('@bitgo/utxo-lib/src/smart_transaction_signature');

/**
 * @param {string} returnTxHex
 * @param {number} commitVin
 * @param {string|object} userWifOrKeyPair
 * @param {Buffer} prevOutScript
 * @param {number} satoshis
 * @param {object} [network]
 * @returns {string}
 */
function signRegisterIdentityCommitmentInput(
  returnTxHex,
  commitVin,
  userWifOrKeyPair,
  prevOutScript,
  satoshis,
  network = networks.verus,
) {
  const keyPair = typeof userWifOrKeyPair === 'string'
    ? ECPair.fromWIF(userWifOrKeyPair, network)
    : userWifOrKeyPair;
  const tx = Transaction.fromHex(returnTxHex, network);
  if (commitVin < 0 || commitVin >= tx.ins.length) {
    throw new Error(`commitVin ${commitVin} out of range (nIn=${tx.ins.length})`);
  }

  const hashType = Transaction.SIGHASH_ALL;
  const signatureHash = tx.hashForSignatureByNetwork(
    commitVin,
    prevOutScript,
    satoshis,
    hashType,
    false,
  );

  let signature = keyPair.sign(signatureHash);
  if (Buffer.isBuffer(signature)) {
    signature = ECSignature.fromRSBuffer(signature);
  }
  const pubKey = keyPair.publicKey || keyPair.getPublicKeyBuffer();
  const newSig = new SmartTransactionSignature(1, 1, pubKey, signature.toCompact().slice(1));

  const existingScript = tx.ins[commitVin].script || Buffer.alloc(0);
  let smartSigs;
  if (existingScript.length > 0) {
    const chunks = bscript.decompile(existingScript);
    if (chunks && chunks[0] && Buffer.isBuffer(chunks[0]) && chunks[0].length > 0) {
      smartSigs = SmartTransactionSignatures.fromChunk(chunks[0]);
      if (smartSigs.error) {
        smartSigs = new SmartTransactionSignatures(1, hashType, []);
      }
    }
  }
  if (!smartSigs) {
    smartSigs = new SmartTransactionSignatures(1, hashType, []);
  }

  const pubHex = pubKey.toString('hex');
  smartSigs.signatures = (smartSigs.signatures || []).filter(
    (s) => s.pubKeyData && s.pubKeyData.toString('hex') !== pubHex,
  );
  // Daemon signrawtransaction places the user (control) fulfillment first.
  smartSigs.signatures.unshift(newSig);
  smartSigs.sigHashType = hashType;
  smartSigs.version = 1;

  tx.setInputScript(commitVin, bscript.compile([smartSigs.toChunk()]));
  return tx.toHex();
}

function findCommitmentVin(returnTxHex, commitmentTxid, network = networks.verus) {
  const tx = Transaction.fromHex(returnTxHex, network);
  const want = String(commitmentTxid).toLowerCase();
  for (let i = 0; i < tx.ins.length; i += 1) {
    const prev = Buffer.from(tx.ins[i].hash).reverse().toString('hex');
    if (prev === want) return i;
  }
  return -1;
}

module.exports = {
  signRegisterIdentityCommitmentInput,
  findCommitmentVin,
};
