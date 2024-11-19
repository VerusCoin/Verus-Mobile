// These functions are deprecated and will be removed in the future. This file is only used 
// to help decode electrum inputs/outputs and transactions, and is temporarily required in order 
// to be able to remove the tx-builder dependancy.

const varuint = require('varuint-bitcoin')
const typeforce = require('typeforce')
const bitcoin = require('bitgo-utxo-lib');

// readSlice :: Number -> Buffer -> (Buffer, Buffer)
const readSlice = offset => buffer => {
  return [buffer.slice(0, offset), buffer.slice(offset)]
}

// readUInt32 :: Buffer -> (Number, Buffer)
function readUInt32 (buffer) {
  typeforce(typeforce.Buffer, buffer)
  const i = buffer.readUInt32LE(0)
  return [i, buffer.slice(4)]
}

// readInt32 :: Buffer -> (Number, Buffer)
function readInt32 (buffer) {
  typeforce(typeforce.Buffer, buffer)
  const i = buffer.readInt32LE(0)
  return [i, buffer.slice(4)]
}

// readUInt64 :: Buffer -> (Number, Buffer)
function readUInt64 (buffer) {
  typeforce(typeforce.Buffer, buffer)
  const a = buffer.readUInt32LE(0)
  let b = buffer.readUInt32LE(4)
  b *= 0x100000000
  // verifuint(b + a, 0x001fffffffffffff)
  return [b + a, buffer.slice(8)]
}

// readVarInt :: Buffer -> (Res, Buffer)
function readVarInt (buffer) {
  const vi = varuint.decode(buffer, 0)
  return [vi, buffer.slice(varuint.decode.bytes)]
}

// readVarSlice :: Buffer -> (Res, Buffer)
function readVarSlice (buffer) {
  const [len, bufferLeft] = readVarInt(buffer)
  const [res, bufferLeft2] = readSlice(len)(bufferLeft)
  return [res, bufferLeft2]
}

// compose :: [Fn] -> State -> Buffer -> [State, Buffer]
const compose = args => (state, buffer) => {
  typeforce(typeforce.Array, args)
  typeforce(typeforce.Object, state)
  typeforce(typeforce.Buffer, buffer)
  return args.reduce(([state, buffer], f) => f(state, buffer), [state, buffer])
}

// addProp :: PropName -> Fn -> (State -> Buffer -> [State, Buffer])
const addProp = (propName, f) => (state, buffer) => {
  typeforce(typeforce.String, propName)
  typeforce(typeforce.Function, f)
  typeforce(typeforce.Object, state)
  typeforce(typeforce.Buffer, buffer)
  const [res, bufferLeft] = f(buffer)
  state[propName] = res
  return [state, bufferLeft]
}

// readInputs :: Fn -> Buffer -> (Res, Buffer)
const readInputs = readFn => buffer => {
  const vins = []
  let [vinLen, bufferLeft] = readVarInt(buffer)
  let vin
  for (let i = 0; i < vinLen; ++i) {
    [vin, bufferLeft] = readFn(bufferLeft)
    vins.push(vin)
  }
  return [vins, bufferLeft]
}

// readSig :: Buffer -> [ScriptSig, Buffer]
const readSig = buffer => {
  const [ res, bufferLeft ] = readVarSlice(buffer)

  const [ asmPart, asmBufferLeft ] = readVarSlice(res)
  const asm = [ asmPart.toString('hex') ]
  const hashType = asmPart.readUInt8(asmPart.length - 1) & ~0x80
  if (hashType <= 0 || hashType >= 4) throw new Error('Invalid hashType ' + hashType)
  const [ asmPart2 ] = readVarSlice(asmBufferLeft)
  asm.push(asmPart2.toString('hex'))

  return [{ asm: asm.join(' '), hex: res.toString('hex') }, bufferLeft]
}

// readScript :: Buffer -> [ScriptPubKey, Buffer]
const readScript = buffer => {
  const [ scriptBuffer, bufferLeft ] = readVarSlice(buffer)
  
  return [ {
    hex: scriptBuffer.toString('hex'),
    type: scriptBuffer[0] === bitcoin.opcodes.OP_DUP && scriptBuffer[1] === bitcoin.opcodes.OP_HASH160 ? 'pubkeyhash' : 'nonstandard',
    asm: bitcoin.script.toASM(scriptBuffer),
    addresses: [ bitcoin.address.fromOutputScript(scriptBuffer) ]
  }, bufferLeft ]
}

/**
 * Transaction's hash is a 256-bit integer, so we need to reverse bytes due to Little Endian byte order.
 */
// readHash :: Buffer -> [Hash, Buffer]
const readHash = buffer => {
  const [res, bufferLeft] = readSlice(32)(buffer)
  // Note: `buffer.reverse()` mutates the buffer, so make a copy:
  const hash = Buffer.from(res).reverse().toString('hex')
  return [hash, bufferLeft]
}

// readInput :: Buffer -> [Res, Buffer]
const readInput = buffer =>
  (
    compose([
      addProp('txid', readHash),                // 32 bytes, Transaction Hash
      addProp('vout', readUInt32),             // 4 bytes, Output Index
      addProp('scriptSig', readSig),       // 1-9 bytes (VarInt), Unlocking-Script Size; Variable, Unlocking-Script
      addProp('sequence', readUInt32)           // 4 bytes, Sequence Number
    ])({}, buffer)
  )
  
// readOutput :: Buffer -> [Res, Buffer]
const readOutput = buffer =>
(
  compose([
    addProp('value', readUInt64),             // 8 bytes, Amount in satoshis
    addProp('scriptPubKey', readScript)     // 1-9 bytes (VarInt), Locking-Script Size; Variable, Locking-Script
  ])({}, buffer)
)

module.exports = {
  readInt32,
  readUInt32,
  readSlice,
  compose,
  addProp,
  readInputs,
  readInput,
  readOutput
};