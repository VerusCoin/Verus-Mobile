import {Buffer} from 'buffer';
import {BN} from 'bn.js';
import {ECPair, networks} from '@bitgo/utxo-lib';
import {
  AppEncryptionRequestDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AuthenticationRequestDetails,
  AuthenticationRequestOrdinalVDXFObject,
  CompactIAddressObject,
  GenericRequest,
  SaplingPaymentAddress,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import store from '../../../store';
import {getIdentity} from '../../api/channels/verusid/callCreators';
import {getSignatureInfo} from '../../api/channels/vrpc/requests/getSignatureInfo';
import {verifyGenericRequest} from '../../api/channels/vrpc/requests/verifyGenericRequest';
import {requestPrivKey} from '../../auth/authBox';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import {validateGenericRequest} from '../../deeplink/validator/envelopeValidator';

jest.mock('../../../store', () => ({__esModule: true, default: {getState: jest.fn()}}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getSignatureInfo', () => ({getSignatureInfo: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/verifyGenericRequest', () => ({verifyGenericRequest: jest.fn()}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getBasicCoinObj: jest.fn()}}));
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {initEndpoint: jest.fn()},
}));

const compact = name => CompactIAddressObject.fromFQN(`${name}@`, 'VRSC');
const system = compact('VRSC');
const signer = compact('user');
const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 1), networks.verus);
const recipient = new SaplingPaymentAddress({d: Buffer.alloc(11, 1), pkD: Buffer.alloc(32, 2)});
const request = (details = {}, signed = true) => new GenericRequest({
  signature: signed ? new VerifiableSignatureData({
    systemID: system,
    identityID: signer,
    signatureAsVch: Buffer.from('signed request'),
  }) : undefined,
  appOrDelegatorID: compact('app-scope'),
  details: [
    new AuthenticationRequestOrdinalVDXFObject({data: new AuthenticationRequestDetails()}),
    new AppEncryptionRequestOrdinalVDXFObject({data: new AppEncryptionRequestDetails({
      encryptResponseToAddress: recipient,
      ...details,
    })}),
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  store.getState.mockReturnValue({
    authentication: {
      sessionEpoch: 1,
      activeAccount: {
        accountHash: 'profile',
        testnetOverrides: {},
        keys: {VRSC: {vrpc: {
          pubKey: key.getPublicKeyBuffer().toString('hex'),
          encryptedPrivKey: 'encrypted key',
        }}},
      },
    },
  });
  CoinDirectory.getBasicCoinObj.mockReturnValue({
    id: 'VRSC',
    system_id: system.toIAddress(),
    testnet: false,
    vrpc_endpoints: ['https://example.com'],
    bitgojs_network_key: 'verus',
  });
  getIdentity.mockResolvedValue({result: {
    status: 'active',
    blockheight: 12344,
    identity: {primaryaddresses: [key.getAddress()], minimumsignatures: 1, flags: 0},
  }});
  verifyGenericRequest.mockResolvedValue(true);
  getSignatureInfo.mockResolvedValue({height: 12345});
  requestPrivKey.mockResolvedValue(key.toWIF());
});

describe('app encryption envelope validation before key access', () => {
  it.each([false, true])('rejects a missing recipient before ownership proof (returnESK = %s)', async returnESK => {
    const value = request({
      encryptResponseToAddress: undefined,
      derivationID: compact('channel'),
      flags: returnESK ? AppEncryptionRequestDetails.FLAG_RETURN_ESK : new BN(0),
    });

    await expect(validateGenericRequest(value)).rejects.toThrow('must specify encryptResponseToAddress');
    expect(requestPrivKey).not.toHaveBeenCalled();
    expect(getSignatureInfo).not.toHaveBeenCalled();
  });

  it.each([
    ['derivationNumber', '-1'],
    ['derivationNumber', '2147483648'],
    ['secondaryDerivationNumber', '-1'],
    ['secondaryDerivationNumber', '2147483648'],
  ])('rejects invalid %s %s before ownership proof', async (field, value) => {
    await expect(validateGenericRequest(request({[field]: new BN(value)})))
      .rejects.toThrow('0 to 2147483647');
    expect(requestPrivKey).not.toHaveBeenCalled();
    expect(getSignatureInfo).not.toHaveBeenCalled();
  });

  it('allows a single-stage spending-key request after validating its fields and proving ownership', async () => {
    await expect(validateGenericRequest(request({flags: AppEncryptionRequestDetails.FLAG_RETURN_ESK})))
      .resolves.toBeUndefined();
    expect(requestPrivKey).toHaveBeenCalledTimes(1);
    expect(verifyGenericRequest.mock.invocationCallOrder[0])
      .toBeLessThan(requestPrivKey.mock.invocationCallOrder[0]);
  });

  it('proves full ownership with a usable private key after validating valid fields and the signature', async () => {
    // Keep the envelope and authorization real so this checks their ordering.
    await expect(validateGenericRequest(request())).resolves.toBeUndefined();
    expect(requestPrivKey).toHaveBeenCalledTimes(1);
    expect(verifyGenericRequest.mock.invocationCallOrder[0])
      .toBeLessThan(requestPrivKey.mock.invocationCallOrder[0]);
  });

  it('rejects a valid explicit-scope envelope whose signer had an outside authority at signing time', async () => {
    const shared = {
      result: {status: 'active', blockheight: 12344, identity: {
        primaryaddresses: [key.getAddress(), ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 2), networks.verus).getAddress()],
        minimumsignatures: 1,
        flags: 0,
      }},
    };
    const lookup = getIdentity.getMockImplementation();
    getIdentity.mockImplementation((chain, identityID, height) => height == null ? lookup(chain, identityID) : shared);

    await expect(validateGenericRequest(request())).rejects.toThrow(/fully control every signing authority/);
    expect(verifyGenericRequest).toHaveBeenCalled();
    expect(getIdentity).toHaveBeenCalledWith(system.toIAddress(), signer.toIAddress(), 12345);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });

  it.each([false, true])('rejects an unsigned or invalid signature before key access (signed = %s)', async signed => {
    verifyGenericRequest.mockResolvedValue(false);

    await expect(validateGenericRequest(request({}, signed))).rejects.toThrow(/signature/);
    expect(requestPrivKey).not.toHaveBeenCalled();
  });
});
