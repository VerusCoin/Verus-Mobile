import {Buffer} from 'buffer';
import {ECPair, IdentitySignature, networks} from '@bitgo/utxo-lib';
import {VerusIdInterface} from 'verusid-ts-client';
import {
  AppEncryptionRequestDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AuthenticationRequestDetails,
  AuthenticationRequestOrdinalVDXFObject,
  BigNumber,
  CompactAddressObject,
  DataDescriptor,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  RecipientConstraint,
  SaplingPaymentAddress,
  VerifiableSignatureData,
  toIAddress,
} from 'verus-typescript-primitives';
import store from '../../../store';
import {getIdentity} from '../../api/channels/verusid/callCreators';
import {getSignatureInfo} from '../../api/channels/vrpc/requests/getSignatureInfo';
import {verifyGenericRequest} from '../../api/channels/vrpc/requests/verifyGenericRequest';
import {requestPrivKey} from '../../auth/authBox';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import VrpcProvider from '../../vrpc/vrpcInterface';
import {signGenericResponse} from '../../api/channels/vrpc/requests/signGenericResponse';
import {
  assertAppEncryptionAuthorization,
  assertSignedRequestAuthorization,
  withAppEncryptionSigningKeys,
} from '../../deeplink/validator/appEncryptionAuthorization';

jest.mock('../../../store', () => ({__esModule: true, default: {getState: jest.fn()}}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getSignatureInfo', () => ({getSignatureInfo: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/verifyGenericRequest', () => ({verifyGenericRequest: jest.fn()}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getBasicCoinObj: jest.fn()}}));
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {initEndpoint: jest.fn(), getVerusIdInterface: jest.fn()},
}));

const systemID = toIAddress('VRSC', 'VRSC');
const signerID = toIAddress('app', 'VRSC');
const userID = toIAddress('user', 'VRSC');
const scopeID = toIAddress('scope', 'VRSC');
const otherSystemID = toIAddress('otherchain', 'VRSC');
const selectedIdentity = {identityID: userID, systemID};
const keyA = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 1), networks.verus);
const keyB = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 2), networks.verus);
const addressA = keyA.getAddress();
const addressB = keyB.getAddress();
const signingHeight = 12345;
const record = key => ({
  pubKey: key.getPublicKeyBuffer().toString('hex'),
  encryptedPrivKey: 'encrypted key',
  addresses: [key.getAddress()],
});
const identity = (addresses, minimumsignatures = 1) => ({
  result: {status: 'active', blockheight: signingHeight - 1, identity: {primaryaddresses: addresses, minimumsignatures, flags: 0}},
});
const request = (scope = null) => ({
  isSigned: () => true,
  isTestnet: () => false,
  hasAppOrDelegatorID: () => scope != null,
  appOrDelegatorID: {toIAddress: () => scope},
  signature: {
    identityID: {toIAddress: () => signerID},
    systemID: {toIAddress: () => systemID},
    signatureAsVch: Buffer.from('signed request'),
  },
  details: [new AppEncryptionRequestOrdinalVDXFObject({data: new AppEncryptionRequestDetails()})],
});
const authentication = recipientConstraints => new AuthenticationRequestOrdinalVDXFObject({
  data: new AuthenticationRequestDetails({recipientConstraints}),
});
const encryptionEnvelope = () => new GenericRequest({
  createdAt: new BigNumber(1000),
  appOrDelegatorID: CompactAddressObject.fromIAddress(scopeID),
  signature: new VerifiableSignatureData({
    systemID: CompactAddressObject.fromIAddress(systemID),
    identityID: CompactAddressObject.fromIAddress(signerID),
  }),
  details: [
    authentication(),
    new AppEncryptionRequestOrdinalVDXFObject({data: new AppEncryptionRequestDetails({
      encryptResponseToAddress: new SaplingPaymentAddress({d: Buffer.alloc(11, 1), pkD: Buffer.alloc(32, 2)}),
    })}),
  ],
});

let state;
let signer;
let historicalSigner;
let selected;

beforeEach(() => {
  jest.clearAllMocks();
  state = {
    authentication: {
      sessionEpoch: 1,
      activeAccount: {accountHash: 'profile', testnetOverrides: {}, keys: {VRSC: {vrpc: record(keyA)}}},
    },
  };
  signer = identity([addressA]);
  historicalSigner = null;
  selected = identity([addressA]);
  store.getState.mockImplementation(() => state);
  CoinDirectory.getBasicCoinObj.mockImplementation(id => ({
    id: id === systemID ? 'VRSC' : id,
    system_id: id === otherSystemID ? otherSystemID : systemID,
    testnet: false,
    vrpc_endpoints: ['https://example.com'],
    bitgojs_network_key: 'verus',
  }));
  getIdentity.mockImplementation(async (_, id, height) => id === signerID
    ? (height == null ? signer : historicalSigner || signer)
    : selected);
  getSignatureInfo.mockResolvedValue({height: signingHeight});
  verifyGenericRequest.mockResolvedValue(true);
  requestPrivKey.mockImplementation(async (_, channel) => (channel === 'electrum' ? keyB : keyA).toWIF());
});

describe('app encryption authorization', () => {
  it.each([false, true])('rejects an unsigned or invalid signature before key access (signed=%s)', async signed => {
    verifyGenericRequest.mockResolvedValue(false);

    await expect(assertAppEncryptionAuthorization({...request(scopeID), isSigned: () => signed}, selectedIdentity))
      .rejects.toThrow(/signature/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('allows an external signer as the implicit scope and verifies before reading selected signing keys', async () => {
    signer = identity([addressB]);

    await expect(assertAppEncryptionAuthorization(request(), selectedIdentity))
      .resolves.toMatchObject({appScopeID: signerID});
    expect(verifyGenericRequest.mock.invocationCallOrder[0]).toBeLessThan(requestPrivKey.mock.invocationCallOrder[0]);
    expect(getSignatureInfo).not.toHaveBeenCalled();
  });

  it('validates an implicit signed scope without requiring a profile', async () => {
    state.authentication.activeAccount = null;

    await expect(assertSignedRequestAuthorization(request())).resolves.toMatchObject({appScopeID: signerID});
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('accepts explicit scope for a fully controlled multisig signer and selected identity', async () => {
    state.authentication.activeAccount.keys.VRSC.electrum = record(keyB);
    signer = identity([addressA, addressB], 2);
    selected = identity([addressA, addressB], 2);

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity))
      .resolves.toMatchObject({appScopeID: scopeID});
    expect(requestPrivKey).toHaveBeenCalledTimes(2);
  });

  it('rejects a shared 1-of-2 signer even when the wallet can meet its threshold', async () => {
    signer = identity([addressA, addressB], 1);

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity))
      .rejects.toThrow(/fully control every signing authority/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('rejects historical shared control after the identity becomes solely wallet controlled', async () => {
    historicalSigner = identity([addressA, addressB], 1);

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity))
      .rejects.toThrow(/fully control every signing authority/);
    expect(getIdentity).toHaveBeenCalledWith(systemID, signerID, signingHeight);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('verifies the historical signer and separately checks its current ownership', async () => {
    historicalSigner = identity([addressA]);
    signer = identity([addressB]);
    state.authentication.activeAccount.keys.VRSC.electrum = record(keyB);
    const value = request(scopeID);

    await expect(assertAppEncryptionAuthorization(value, selectedIdentity))
      .resolves.toMatchObject({appScopeID: scopeID});
    expect(getSignatureInfo).toHaveBeenCalledWith(systemID, signerID, value.signature.signatureAsVch.toString('base64'));
    expect(getIdentity).toHaveBeenCalledWith(systemID, signerID, signingHeight);
    expect(verifyGenericRequest).toHaveBeenCalledWith(expect.objectContaining({system_id: systemID}), value, historicalSigner.result, false);
    expect(verifyGenericRequest).not.toHaveBeenCalledWith(expect.anything(), value, signer.result, false);
    expect(requestPrivKey).toHaveBeenCalledTimes(2);
  });

  it('still requires current signer ownership when its historical keys are wallet controlled', async () => {
    historicalSigner = identity([addressA]);
    signer = identity([addressB]);

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity))
      .rejects.toThrow(/fully control/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 0, -1, 1.5, '12345', 0x80000000])
    ('rejects invalid signing height %s without falling back to current authority', async height => {
      getSignatureInfo.mockResolvedValue({height});

      await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toThrow();
      expect(verifyGenericRequest).not.toHaveBeenCalled();
      expect(requestPrivKey).not.toHaveBeenCalled();
    });

  it.each(['rpc error', 'missing identity'])('rejects unavailable historical authority (%s)', async failure => {
    historicalSigner = failure === 'rpc error'
      ? {error: {message: 'History unavailable'}}
      : {result: {status: 'active'}};

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toThrow();
    expect(verifyGenericRequest).not.toHaveBeenCalled();
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it.each([undefined, null, -1, 1.5, '12344', signingHeight + 1])
    ('rejects an unverified historical identity update height %s', async blockheight => {
      historicalSigner = identity([addressA]);
      historicalSigner.result.blockheight = blockheight;

      await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity))
        .rejects.toThrow(/authority at the request signing height/);
      expect(verifyGenericRequest).not.toHaveBeenCalled();
      expect(requestPrivKey).not.toHaveBeenCalled();
    });

  it('proves every historical key even when one signature satisfies the identity threshold', async () => {
    state.authentication.activeAccount.keys.VRSC.electrum = record(keyB);
    signer = identity([addressA, addressB], 1);

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity))
      .resolves.toMatchObject({appScopeID: scopeID});
    expect(requestPrivKey).toHaveBeenCalledTimes(2);
  });

  it('rejects an unusable historical key even after the signature threshold has been met', async () => {
    state.authentication.activeAccount.keys.VRSC.electrum = record(keyB);
    signer = identity([addressA, addressB], 1);
    requestPrivKey.mockResolvedValue(keyA.toWIF());

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toThrow(/cannot use/);
    expect(requestPrivKey).toHaveBeenCalledTimes(2);
  });

  it('rejects a cryptographically valid attacker request signed during shared historical authority', async () => {
    const sdk = new VerusIdInterface('VRSC', 'https://example.com');
    historicalSigner = identity([addressA, addressB], 1);
    const value = encryptionEnvelope();
    await sdk.signGenericRequest(value, keyB.toWIF(), historicalSigner.result, signingHeight);

    // The attacker really can sign under the old 1-of-2 record. A later
    // ownership transfer must not turn that signature into a wallet export.
    await expect(sdk.verifyGenericRequest(value, historicalSigner.result, systemID, 1000)).resolves.toBe(true);
    await expect(sdk.verifyGenericRequest(value, signer.result, systemID, 1000)).resolves.toBe(false);
    getSignatureInfo.mockImplementation((chain, id, signature) => sdk.getSignatureInfo(id, signature, chain));
    verifyGenericRequest.mockImplementation((coin, envelope, authority) =>
      sdk.verifyGenericRequest(envelope, authority, coin.system_id, 1000));

    await expect(assertAppEncryptionAuthorization(value, selectedIdentity))
      .rejects.toThrow(/fully control every signing authority/);
    expect(getIdentity).toHaveBeenCalledWith(systemID, signerID, signingHeight);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('rejects a valid signature at a nonexistent future block through the real SDK', async () => {
    const sdk = new VerusIdInterface('VRSC', 'https://example.com');
    const futureHeight = signingHeight + 100;
    const value = encryptionEnvelope();
    await sdk.signGenericRequest(value, keyA.toWIF(), signer.result, futureHeight);
    await expect(sdk.verifyGenericRequest(value, signer.result, systemID, 1000)).resolves.toBe(true);
    sdk.interface.getBlock = jest.fn(async () => ({error: {message: 'Block height out of range'}}));
    getSignatureInfo.mockImplementation((chain, id, signature) => sdk.getSignatureInfo(id, signature, chain));
    verifyGenericRequest.mockImplementation((coin, envelope, authority) =>
      sdk.verifyGenericRequest(envelope, authority, coin.system_id));

    // A plausible identity update height is insufficient: verification also
    // requires the signed block to exist, before any wallet key is opened.
    await expect(assertAppEncryptionAuthorization(value, selectedIdentity)).rejects.toThrow('Block height out of range');
    expect(getIdentity).toHaveBeenCalledWith(systemID, signerID, futureHeight);
    expect(sdk.interface.getBlock).toHaveBeenCalledWith(futureHeight.toString());
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('rejects a tampered signing height through the real SDK despite matching historical authority', async () => {
    const sdk = new VerusIdInterface('VRSC', 'https://example.com');
    const value = encryptionEnvelope();
    await sdk.signGenericRequest(value, keyA.toWIF(), signer.result, signingHeight);
    await expect(sdk.verifyGenericRequest(value, signer.result, systemID, 1000)).resolves.toBe(true);
    const signature = new IdentitySignature(networks.verus);
    signature.fromBuffer(value.signature.signatureAsVch, 0, systemID, signerID);
    signature.blockHeight++;
    value.signature.signatureAsVch = signature.toBuffer();
    sdk.interface.getBlock = jest.fn(async () => ({result: {time: 1000}}));
    getSignatureInfo.mockImplementation((chain, id, signatureBytes) => sdk.getSignatureInfo(id, signatureBytes, chain));
    verifyGenericRequest.mockImplementation((coin, envelope, authority) =>
      sdk.verifyGenericRequest(envelope, authority, coin.system_id));

    await expect(assertAppEncryptionAuthorization(value, selectedIdentity)).rejects.toThrow('Failed to verify request signature');
    expect(getIdentity).toHaveBeenCalledWith(systemID, signerID, signingHeight + 1);
    expect(sdk.interface.getBlock).toHaveBeenCalledWith((signingHeight + 1).toString());
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it.each([userID, signerID])('checks the selected chain even when the selected ID is %s', async identityID => {
    getIdentity.mockImplementation(async chain => chain === otherSystemID ? identity([addressB]) : signer);

    await expect(assertAppEncryptionAuthorization(request(), {identityID, systemID: otherSystemID}))
      .rejects.toThrow(/fully control/);
    expect(getIdentity).toHaveBeenCalledWith(otherSystemID, identityID);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('accepts a controlled selection on another chain without checking its record on the request chain', async () => {
    signer = identity([addressB]);
    getIdentity.mockImplementation(async chain => chain === otherSystemID ? selected : signer);

    await expect(assertAppEncryptionAuthorization(request(), {identityID: signerID, systemID: otherSystemID}))
      .resolves.toMatchObject({appScopeID: signerID});
    expect(getIdentity).toHaveBeenCalledWith(otherSystemID, signerID);
    expect(VrpcProvider.initEndpoint).toHaveBeenCalledWith(otherSystemID, 'https://example.com');
  });

  it.each(['unsupported', 'network'])('rejects a selected chain that is %s before key access', async condition => {
    const lookup = CoinDirectory.getBasicCoinObj.getMockImplementation();
    CoinDirectory.getBasicCoinObj.mockImplementation(id => id === otherSystemID
      ? {...lookup(id), testnet: condition === 'network', vrpc_endpoints: condition === 'unsupported' ? [] : ['https://example.com']}
      : lookup(id));

    await expect(assertAppEncryptionAuthorization(request(), {identityID: userID, systemID: otherSystemID}))
      .rejects.toThrow(/chain|network/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it.each([
    RecipientConstraint.requiredIDFromAddress(scopeID),
    RecipientConstraint.requiredSystemFromAddress(otherSystemID),
    RecipientConstraint.requiredParentFromAddress(scopeID),
  ])('enforces a signed identity constraint before private-key access ($type)', async constraint => {
    const value = request(scopeID);
    value.details.unshift(authentication([constraint]));
    selected.result.identity.parent = systemID;

    await expect(assertAppEncryptionAuthorization(value, selectedIdentity)).rejects.toThrow(/authentication constraints/);
    expect(verifyGenericRequest).toHaveBeenCalled();
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('accepts the permitted identity, chain, and immediate parent using the fresh record', async () => {
    const value = request();
    value.details.unshift(authentication([
      RecipientConstraint.requiredIDFromAddress(scopeID),
      RecipientConstraint.requiredIDFromAddress(userID),
      RecipientConstraint.requiredSystemFromAddress(systemID),
      RecipientConstraint.requiredParentFromAddress(scopeID),
    ]));
    selected.result.identity.parent = scopeID;

    await expect(assertAppEncryptionAuthorization(value, selectedIdentity)).resolves.toMatchObject({appScopeID: signerID});
    expect(getIdentity).toHaveBeenCalledWith(systemID, userID);
    selected.result.identity.parent = systemID;
    requestPrivKey.mockClear();

    await expect(assertAppEncryptionAuthorization(value, selectedIdentity)).rejects.toThrow(/authentication constraints/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('rejects unknown signed constraints before opening explicit-scope signing keys', async () => {
    const value = request(scopeID);
    value.details.unshift(authentication([new RecipientConstraint({type: 99})]));

    await expect(assertSignedRequestAuthorization(value)).rejects.toThrow(/Unsupported authentication/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it.each(['threshold', 'watch-only', 'duplicate primary', 'duplicate key', 'delegate', 'selected'])
    ('rejects insufficient %s signing control before key access', async condition => {
      if (condition === 'threshold') signer = identity([addressA, addressB], 2);
      if (condition === 'watch-only') delete state.authentication.activeAccount.keys.VRSC.vrpc.encryptedPrivKey;
      if (condition === 'duplicate primary') signer = identity([addressA, addressA], 2);
      if (condition === 'duplicate key') {
        state.authentication.activeAccount.keys.VRSC.electrum = record(keyA);
        signer = identity([addressA, addressB], 2);
      }
      if (condition === 'delegate') signer = identity([addressB]);
      if (condition === 'selected') selected = identity([addressB]);

      await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toThrow(/fully control/);
      expect(requestPrivKey).not.toHaveBeenCalled();
    });

  it('does not authorize an external signer just because its explicit scope matches', async () => {
    signer = identity([addressB]);

    await expect(assertAppEncryptionAuthorization(request(signerID), selectedIdentity)).rejects.toThrow(/fully control/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('rejects malformed explicit scope without falling back to the signer', async () => {
    await expect(assertAppEncryptionAuthorization(request('invalid'), selectedIdentity)).rejects.toThrow();
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('rejects unusable private keys despite matching public metadata', async () => {
    requestPrivKey.mockResolvedValue(keyB.toWIF());

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toThrow(/cannot use/);
  });

  it.each(['zz', '0'])('rejects a public key with a malformed hex suffix %s before key access', async suffix => {
    state.authentication.activeAccount.keys.VRSC.vrpc.pubKey += suffix;

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toThrow(/fully control/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('ignores unsupported and empty wallet coin records', async () => {
    const lookup = CoinDirectory.getBasicCoinObj.getMockImplementation();
    CoinDirectory.getBasicCoinObj.mockImplementation(id => id === 'unsupported' ? null : lookup(id));
    state.authentication.activeAccount.keys.unsupported = {vrpc: record(keyB)};
    state.authentication.activeAccount.keys.empty = null;

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).resolves.toMatchObject({appScopeID: scopeID});
  });

  it.each(['profile', 'epoch', 'network', 'approval'])('rejects a changed %s while verifying', async change => {
    let active = true;
    const assertActive = () => {
      if (!active) throw new Error('Approval changed');
    };
    verifyGenericRequest.mockImplementation(async () => {
      if (change === 'profile') state.authentication.activeAccount.accountHash = 'other';
      if (change === 'epoch') state.authentication.sessionEpoch++;
      if (change === 'network') state.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
      if (change === 'approval') active = false;
      return true;
    });

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity, {assertActive})).rejects.toThrow(/changed/i);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it('passes session scope to signing key access and rejects a profile change during it', async () => {
    requestPrivKey.mockImplementation(async () => {
      state.authentication.sessionEpoch++;
      return keyA.toWIF();
    });

    await expect(assertAppEncryptionAuthorization(request(scopeID), selectedIdentity)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(requestPrivKey).toHaveBeenCalledWith('VRSC', 'vrpc', {
      sessionScope: {sessionScoped: true, accountHash: 'profile', sessionEpoch: 1},
    });
  });

  it('does not call the signing callback after a profile change during key access', async () => {
    const signKey = jest.fn();
    requestPrivKey.mockImplementation(async () => {
      state.authentication.sessionEpoch++;
      return keyA.toWIF();
    });

    await expect(withAppEncryptionSigningKeys(request(), selectedIdentity, {}, signKey))
      .rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(signKey).not.toHaveBeenCalled();
  });

  it('propagates signing failures instead of treating an unsigned key as complete', async () => {
    await expect(withAppEncryptionSigningKeys(request(), selectedIdentity, {}, () => {
      throw new Error('Signing failed');
    })).rejects.toThrow('Signing failed');
  });

  it.each([systemID, otherSystemID])('signs a multisig response on its selected chain %s that the real SDK verifies', async selectedSystemID => {
    state.authentication.activeAccount.keys.VRSC.electrum = record(keyB);
    selected = identity([addressA, addressB], 2);
    const sdk = new VerusIdInterface('VRSC', 'https://example.com');
    const height = 12345;
    sdk.getCurrentHeight = jest.fn(async () => height);
    VrpcProvider.getVerusIdInterface.mockReturnValue(sdk);
    const response = new GenericResponse({
      createdAt: new BigNumber(1000),
      details: [new DataResponseOrdinalVDXFObject({data: new DataResponseDetails({
        data: new DataDescriptor({objectdata: Buffer.from('encrypted channel response')}),
      })})],
      signature: new VerifiableSignatureData({
        systemID: CompactAddressObject.fromIAddress(selectedSystemID),
        identityID: CompactAddressObject.fromIAddress(userID),
      }),
    });
    const signed = await signGenericResponse(CoinDirectory.getBasicCoinObj(selectedSystemID), response, {
      request: request(),
      assertActive: () => {},
    });

    expect(getIdentity).toHaveBeenCalledWith(selectedSystemID, userID);
    expect(VrpcProvider.initEndpoint).toHaveBeenCalledWith(selectedSystemID, 'https://example.com');
    expect(VrpcProvider.getVerusIdInterface).toHaveBeenCalledWith(selectedSystemID);
    await expect(sdk.verifyGenericResponse(signed, selected.result, selectedSystemID, 1000)).resolves.toBe(true);
    expect(sdk.getCurrentHeight).toHaveBeenCalledTimes(1);
    const signatures = new IdentitySignature(networks.verus);
    signatures.fromBuffer(signed.signature.signatureAsVch, 0, selectedSystemID, userID);
    expect(signatures.blockHeight).toBe(height);
    expect(signatures.signatures).toHaveLength(2);

    // A response with only one of the same valid signatures remains incomplete.
    signatures.signatures.pop();
    signed.signature.signatureAsVch = signatures.toBuffer();
    await expect(sdk.verifyGenericResponse(signed, selected.result, selectedSystemID, 1000)).resolves.toBe(false);
  });
});
