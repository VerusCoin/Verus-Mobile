// Real scripts and transactions: RPC responses are the only mocked boundary.
import BigNumber from 'bignumber.js';
import {ECPair, Transaction, TransactionBuilder, networks} from '@bitgo/utxo-lib';
import {VerusIdInterface} from 'verusid-ts-client';
import {BigNumber as BN, CurrencyValueMap, DEST_ID, DEST_PKH, EVALS, Identity, IdentityID,
  IdentityReservationScript, IdentityScript, NameReservation, SmartTransactionScript,
  TokenOutput, TransferDestination, TxDestination, fromBase58Check, nameAndParentAddrToIAddr} from 'verus-typescript-primitives';
import {addIdentityAmounts, identityOutputAmounts, readIdentityFunds} from '../../identityManagement/identityFunds';

const SYSTEM = nameAndParentAddrToIAddr('VRSCTEST');
const SUBJECT = nameAndParentAddrToIAddr('alice', SYSTEM);
const TOKEN = nameAndParentAddrToIAddr('token', SYSTEM);
const OTHER = nameAndParentAddrToIAddr('other', SYSTEM);
const WALLET = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 31), networks.verus).getAddress();
const stringify = values => Object.fromEntries([...values].map(([id, value]) => [id, value.toFixed(0)]));
const payment = (currencies = {[SYSTEM]: '100000'}, address = SUBJECT) => Transaction.fromHex(
  VerusIdInterface.createUnfundedCurrencyTransferTransaction(SYSTEM, [{currencies,
    address: new TransferDestination({type: address === WALLET ? DEST_PKH : DEST_ID,
      destinationBytes: fromBase58Check(address).hash})}], 120), networks.verus).outs[0];
const edit = (output, mutate) => {
  const parsed = new SmartTransactionScript();
  parsed.fromBuffer(output.script);
  mutate(parsed);
  return {...output, script: parsed.toBuffer()};
};
const tokenPayload = entries => new TokenOutput({version: new BN(1), values: new CurrencyValueMap({
  valueMap: new Map(entries.map(([id, value]) => [id, new BN(value, 10)])), multivalue: entries.length !== 1,
})}).toBuffer();
const replaceReserve = entries => edit(payment({[TOKEN]: '5'}), parsed => {
  parsed.paramsOptCC.vData = [tokenPayload(entries)];
});

const fixture = outputs => {
  const builder = new TransactionBuilder(networks.verus);
  builder.setVersion(4);
  builder.setVersionGroupId(0x892f2085);
  builder.setExpiryHeight(120);
  builder.addInput(Buffer.alloc(32, 44), 0);
  outputs.forEach(output => builder.addOutput(output.script, output.value));
  const tx = builder.buildIncomplete();
  const entries = outputs.map((output, index) => ({address: SUBJECT, txid: tx.getId(), outputIndex: index,
    script: output.script.toString('hex'), satoshis: output.value, height: 20, isspendable: 1}));
  const endpoint = {
    getAddressMempool: jest.fn().mockResolvedValue({result: []}),
    getAddressUtxos: jest.fn().mockResolvedValue({result: entries}),
    getRawTransaction: jest.fn().mockResolvedValue({result: tx.toHex()}),
  };
  const subject = {address: SUBJECT, txid: 'ff'.repeat(32), vout: 0};
  return {tx, entries, endpoint, subject, read: () => readIdentityFunds({endpoint, systemId: SYSTEM, subject, call: task => task()})};
};

describe('identity currency output accounting', () => {
  test('counts native and multiple reserve currencies exactly beyond JavaScript integer precision', () => {
    const actual = identityOutputAmounts(payment({[SYSTEM]: '12345', [TOKEN]: '9007199254740993', [OTHER]: '7'}), SYSTEM, SUBJECT);
    expect(stringify(actual)).toEqual({[SYSTEM]: '12345', [TOKEN]: '9007199254740993', [OTHER]: '7'});
  });

  test('includes reserve-only outputs even when native value is zero', () => {
    expect(stringify(identityOutputAmounts(payment({[TOKEN]: '1'}), SYSTEM, SUBJECT)))
      .toEqual({[SYSTEM]: '0', [TOKEN]: '1'});
  });

  test('only accepts a transparent payment when it belongs to the expected address', () => {
    const output = payment({[SYSTEM]: '99'}, WALLET);
    expect(stringify(identityOutputAmounts(output, SYSTEM, WALLET))).toEqual({[SYSTEM]: '99'});
    expect(() => identityOutputAmounts(output, SYSTEM, SUBJECT)).toThrow(/destination/);
  });

  test.each([true, false])('accepts canonical public-key funding only for its owner (compressed=%s)', compressed => {
    const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 31), networks.verus);
    key.compressed = compressed;
    const publicKey = key.getPublicKeyBuffer();
    const output = {value: 12345, script: Buffer.concat([Buffer.from([publicKey.length]), publicKey, Buffer.from([0xac])])};
    expect(stringify(identityOutputAmounts(output, SYSTEM, key.getAddress()))).toEqual({[SYSTEM]: '12345'});
    expect(() => identityOutputAmounts(output, SYSTEM, SUBJECT)).toThrow(/destination/);
    expect(() => identityOutputAmounts({...output, script: Buffer.concat([Buffer.from([33]), Buffer.alloc(33), Buffer.from([0xac])])}, SYSTEM, key.getAddress())).toThrow();
  });

  test.each([
    ['negative native value', () => ({...payment(), value: -1})],
    ['fractional native value', () => ({...payment(), value: 0.5})],
    ['unsafe native value', () => ({...payment(), value: Number.MAX_SAFE_INTEGER + 1})],
    ['wrong destination', () => payment({[TOKEN]: '50'}, OTHER)],
    ['alternate master authority', () => edit(payment(), parsed => {
      parsed.masterOptCC.m = new BN(1); parsed.masterOptCC.n = new BN(1);
      parsed.masterOptCC.destinations = [new TxDestination(IdentityID.fromAddress(OTHER))];
    })],
    ['multisignature output', () => edit(payment(), parsed => {
      parsed.paramsOptCC.m = new BN(2); parsed.paramsOptCC.n = new BN(2);
      parsed.paramsOptCC.destinations.push(new TxDestination(IdentityID.fromAddress(OTHER)));
    })],
    ['stakeguard output', () => edit(payment(), parsed => { parsed.paramsOptCC.evalCode = new BN(EVALS.EVAL_STAKEGUARD); })],
    ['reserve-transfer output', () => edit(payment({[TOKEN]: '50'}), parsed => { parsed.paramsOptCC.evalCode = new BN(EVALS.EVAL_RESERVE_TRANSFER); })],
    ['unexpected native output data', () => edit(payment(), parsed => { parsed.paramsOptCC.vData = [Buffer.from('01', 'hex')]; })],
    ['native currency duplicated in reserve map', () => replaceReserve([[SYSTEM, '5'], [TOKEN, '7']])],
    ['negative reserve amount', () => replaceReserve([[TOKEN, '-1'], [OTHER, '7']])],
    ['excessive reserve amount', () => replaceReserve([[TOKEN, '5000000000000000001']])],
    ['invalid token version', () => edit(payment({[TOKEN]: '50'}), parsed => {
      const token = new TokenOutput(); token.fromBuffer(parsed.paramsOptCC.vData[0]);
      token.version = new BN(2); parsed.paramsOptCC.vData = [token.toBuffer()];
    })],
    ['trailing reserve bytes', () => edit(payment({[TOKEN]: '50'}), parsed => {
      parsed.paramsOptCC.vData[0] = Buffer.concat([parsed.paramsOptCC.vData[0], Buffer.from('00', 'hex')]);
    })],
    ['trailing script bytes', () => ({...payment(), script: Buffer.concat([payment().script, Buffer.from('00', 'hex')])})],
  ])('rejects %s instead of losing or miscounting funds', (_label, output) => {
    expect(() => identityOutputAmounts(output(), SYSTEM, SUBJECT)).toThrow();
  });

  test('adds exact values and rejects an aggregate beyond the supported amount range', () => {
    const values = new Map([[TOKEN, new BigNumber('4000000000000000000')]]);
    addIdentityAmounts(values, new Map([[TOKEN, new BigNumber(3)]]));
    expect(values.get(TOKEN).toFixed(0)).toBe('4000000000000000003');
    expect(() => addIdentityAmounts(values, new Map([[TOKEN, new BigNumber('1000000000000000000')]]))).toThrow(/range/);
  });
});

describe('complete identity fund snapshots', () => {
  test('verifies raw prevouts and ignores forged advertised script, value and currency metadata', async () => {
    const f = fixture([payment({[SYSTEM]: '123', [TOKEN]: '9007199254740993'}), payment({[OTHER]: '77'})]);
    Object.assign(f.entries[0], {script: '00', satoshis: 999999, currencyvalues: {[TOKEN]: 0}});
    const actual = await f.read();
    expect(stringify(actual.balances)).toEqual({[SYSTEM]: '123', [TOKEN]: '9007199254740993', [OTHER]: '77'});
    expect(actual.utxos[0].script).toBe(f.tx.outs[0].script.toString('hex'));
    expect(actual.utxos[0].satoshis).toBe(123);
    expect(actual.utxos).toHaveLength(2);
    expect(f.endpoint.getRawTransaction).toHaveBeenCalledTimes(1);
  });

  test.each([false, 0])('omits only canonical zero-valued metadata with spendable=%s', async isspendable => {
    const identity = Identity.fromJson({version: 3, flags: 0, name: 'other', parent: SYSTEM, systemid: SYSTEM,
      primaryaddresses: [WALLET], minimumsignatures: 1, recoveryauthority: SUBJECT, revocationauthority: SUBJECT, timelock: 0});
    const metadata = [
      {value: 0, script: IdentityScript.fromIdentity(identity).toBuffer()},
      {value: 0, script: IdentityReservationScript.fromReservation(new NameReservation({name: 'alice', salt: Buffer.alloc(32, 8)}), SYSTEM).toBuffer()},
    ];
    const f = fixture([...metadata, payment({[TOKEN]: '23'})]);
    f.entries.slice(0, 2).forEach(entry => { entry.isspendable = isspendable; });
    const actual = await f.read();
    expect(actual.utxos.map(input => input.outputIndex)).toEqual([2]);
    expect(stringify(actual.balances)).toEqual({[SYSTEM]: '0', [TOKEN]: '23'});
  });

  test('refuses currency-bearing metadata rather than skipping its value', async () => {
    const reservation = IdentityReservationScript.fromReservation(new NameReservation({name: 'alice', salt: Buffer.alloc(32, 8)}), SYSTEM);
    const f = fixture([{value: 5, script: reservation.toBuffer()}]);
    f.entries[0].isspendable = 0;
    await expect(f.read()).rejects.toThrow();
  });

  test('refuses an unknown zero-native output rather than assuming it has no reserve funds', async () => {
    const unknown = edit(payment({[TOKEN]: '12'}), parsed => { parsed.paramsOptCC.evalCode = new BN(EVALS.EVAL_RESERVE_TRANSFER); });
    const f = fixture([unknown]);
    f.entries[0].isspendable = 0;
    await expect(f.read()).rejects.toThrow(/unsupported/);
  });

  test('keeps locked or unavailable ordinary funds in the inventory for explicit policy handling', async () => {
    const f = fixture([payment({[TOKEN]: '12'})]);
    f.entries[0].isspendable = 0;
    const actual = await f.read();
    expect(actual.utxos[0].isspendable).toBe(0);
    expect(stringify(actual.balances)).toEqual({[SYSTEM]: '0', [TOKEN]: '12'});
  });

  test('requires a fresh mempool response for every snapshot and stops if transactions are pending', async () => {
    const f = fixture([payment()]);
    await f.read();
    f.endpoint.getAddressMempool.mockResolvedValue({result: [{txid: '01'.repeat(32), satoshis: 0, currencyvalues: {[TOKEN]: 1}}]});
    await expect(f.read()).rejects.toThrow(/pending/);
    expect(f.endpoint.getAddressMempool).toHaveBeenCalledTimes(2);
    expect(f.endpoint.getAddressUtxos).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['duplicate indexed outpoints', f => { f.entries.push({...f.entries[0]}); }],
    ['unconfirmed indexed outputs', f => { f.entries[0].height = 0; }],
    ['negative output index', f => { f.entries[0].outputIndex = -1; }],
    ['missing output index', f => { f.entries[0].outputIndex = 99; }],
    ['mismatched raw transaction hash', f => { f.entries[0].txid = '01'.repeat(32); }],
    ['malformed raw bytes', f => { f.endpoint.getRawTransaction.mockResolvedValue({result: 'nothex'}); }],
    ['RPC errors', f => { f.endpoint.getRawTransaction.mockResolvedValue({error: {message: 'Unavailable'}}); }],
    ['malformed mempool response', f => { f.endpoint.getAddressMempool.mockResolvedValue({result: {}}); }],
    ['malformed UTXO response', f => { f.endpoint.getAddressUtxos.mockResolvedValue({result: {}}); }],
  ])('rejects %s', async (_label, tamper) => {
    const f = fixture([payment()]);
    tamper(f);
    await expect(f.read()).rejects.toThrow();
  });

  test('snapshot order is stable, but adding token-only funds changes the approved inventory', async () => {
    const f = fixture([payment(), payment({[TOKEN]: '90'})]);
    const first = await f.read();
    f.entries.reverse();
    const reordered = await f.read();
    expect(reordered.snapshot).toBe(first.snapshot);
    f.entries.pop();
    const fewer = await f.read();
    expect(fewer.snapshot).not.toBe(first.snapshot);
  });
});
