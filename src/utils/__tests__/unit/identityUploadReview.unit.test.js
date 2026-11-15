import {
  BigNumber as BN,
  ContentMultiMap,
  DataByteVectorKey,
  DataStringKey,
  Identity,
  IdentityUpdateRequestDetails,
  VdxfUniValue,
  toIAddress,
} from 'verus-typescript-primitives';
import {identityToDisplayJson} from '../../identityUpdate/identityDisplay';
import {cloneIdentityUpdateRequest} from '../../identityUpdate/cloneRequest';
import {identityUploadToDisplayJson} from '../../identityUpdate/uploadDisplay';

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const identity = () => Identity.fromJson({
  version: 3, flags: 0, timelock: 0, name: 'binary-review', parent: SYSTEM_ID, systemid: SYSTEM_ID,
  primaryaddresses: ['RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU'], minimumsignatures: 1,
  recoveryauthority: toIAddress('binary-review', 'VRSC'), revocationauthority: toIAddress('binary-review', 'VRSC'),
  contentmap: {}, contentmultimap: {},
});

it.each([false, true])('keeps binary upload bytes and recipient reviewable without CLI JSON (MMR: %s)', mmr => {
  const recipient = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
  const value = {[DataByteVectorKey.vdxfid]: '00ff0180'};
  const request = IdentityUpdateRequestDetails.fromCLIJson({name: 'binary-review', parent: SYSTEM_ID,
    contentmultimap: {[DataStringKey.vdxfid]: {data: {encrypttoaddress: recipient,
      ...(mmr ? {mmrdata: [{vdxfdata: value}]} : {vdxfdata: value})}}},
  });
  const upload = request.signDataMap.getByAddress(DataStringKey.vdxfid);
  const before = upload.toBuffer();
  expect(() => upload.toCLIJson()).toThrow();
  expect(identityUploadToDisplayJson(upload)).toMatchObject({
    binarydata: before.toString('hex'), encrypttoaddress: recipient,
  });
  expect(upload.toBuffer()).toEqual(before);
});

it('retains readable message uploads in the data inspector', () => {
  const {PartialSignData} = require('verus-typescript-primitives');
  expect(identityUploadToDisplayJson(PartialSignData.fromCLIJson({message: 'readable upload'})))
    .toMatchObject({message: 'readable upload'});
});

it('reviews scalar fields and exact binary-only VDXF without dropping or changing content', () => {
  const current = identity();
  const binary = new VdxfUniValue({values: [{[DataByteVectorKey.vdxfid]: Buffer.from([0, 127, 255])}]});
  const text = VdxfUniValue.fromJson({[DataStringKey.vdxfid]: 'readable content'});
  current.contentMultiMap = ContentMultiMap.fromJson({});
  current.contentMultiMap.kvContent.setByAddress(DataByteVectorKey.vdxfid, [binary]);
  current.contentMultiMap.kvContent.setByAddress(DataStringKey.vdxfid, [text]);
  const before = current.toBuffer();
  expect(() => current.toJson()).toThrow();

  const display = identityToDisplayJson(current);
  expect(display.primaryaddresses).toEqual(['RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU']);
  expect(display.contentmultimap[DataByteVectorKey.vdxfid]).toEqual([binary.toBuffer().toString('hex')]);
  expect(display.contentmultimap[DataStringKey.vdxfid]).toEqual([{[DataStringKey.vdxfid]: 'readable content'}]);
  expect(current.toBuffer()).toEqual(before);
});

it('normalizes request and upload flags before cloning without a JSON roundtrip', () => {
  const request = IdentityUpdateRequestDetails.fromCLIJson({
    name: 'binary-review', parent: SYSTEM_ID,
    contentmultimap: {[DataStringKey.vdxfid]: {data: {message: 'keep these bytes'}}},
  });
  const upload = request.signDataMap.getByAddress(DataStringKey.vdxfid);
  request.flags = new BN(0);
  upload.flags = new BN(0);
  request.toJson = () => { throw new Error('No JSON cloning'); };
  const copy = cloneIdentityUpdateRequest(request);
  expect(copy.containsSignData()).toBe(true);
  expect(copy.signDataMap.getByAddress(DataStringKey.vdxfid).containsData()).toBe(true);
  expect(copy.signDataMap.getByAddress(DataStringKey.vdxfid).data).toEqual(upload.data);
  expect(request.flags.isZero()).toBe(true);
  expect(upload.flags.isZero()).toBe(true);
});

it('preserves a binary-only partial identity through request cloning', () => {
  const request = IdentityUpdateRequestDetails.fromCLIJson({name: 'binary-review', parent: SYSTEM_ID, contentmultimap: {}});
  const {FqnVdxfUniValue} = require('verus-typescript-primitives');
  const binary = new VdxfUniValue({values: [{[DataByteVectorKey.vdxfid]: Buffer.from([1, 2, 255])}]});
  request.identity.contentMultiMap.kvContent.setByAddress(DataByteVectorKey.vdxfid, [FqnVdxfUniValue.fromVdxfUniValue(binary)]);
  const before = request.toBuffer();
  expect(() => request.identity.toJson()).toThrow();
  const copy = cloneIdentityUpdateRequest(request);
  expect(copy.toBuffer()).toEqual(before);
  expect(identityToDisplayJson(copy.identity).contentmultimap[DataByteVectorKey.vdxfid]).toHaveLength(1);
});

it('preserves the meaning of a testnet compact-FQN request ID through binary cloning', () => {
  const {CompactIAddressObject} = require('verus-typescript-primitives');
  const request = IdentityUpdateRequestDetails.fromCLIJson({name: 'binary-review', parent: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'});
  request.requestID = CompactIAddressObject.fromFQN('request@', 'VRSCTEST');
  request.toggleContainsRequestID();
  const copy = cloneIdentityUpdateRequest(request);
  expect(copy.requestID.rootSystemName).toBe('VRSCTEST');
  expect(copy.requestID.toIAddress()).toBe(request.requestID.toIAddress());
  expect(copy.toBuffer()).toEqual(request.toBuffer());
});

it('preserves the native upload map key semantics without reinterpreting keys for testnet', () => {
  const {CompactIAddressObject, KvMap} = require('verus-typescript-primitives');
  const request = IdentityUpdateRequestDetails.fromCLIJson({
    name: 'binary-review', parent: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
    contentmultimap: {[DataStringKey.vdxfid]: {data: {message: 'unchanged content'}}},
  });
  const upload = request.signDataMap.getByAddress(DataStringKey.vdxfid);
  request.signDataMap = new KvMap();
  request.signDataMap.set(CompactIAddressObject.fromFQN('vrsc::data.type.string', 'VRSC'), upload);
  const [nativeKey] = [...request.signDataMap.entries()][0];
  const before = request.toBuffer();
  const copy = cloneIdentityUpdateRequest(request, 'VRSCTEST');
  const [copiedKey, copiedUpload] = [...copy.signDataMap.entries()][0];
  expect(copiedKey.toIAddress()).toBe(nativeKey.toIAddress());
  expect(copiedKey.toBuffer()).toEqual(nativeKey.toBuffer());
  expect(copiedUpload.data).toEqual(upload.data);
  expect(copy.toBuffer()).toEqual(before);
});
