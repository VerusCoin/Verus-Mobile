import { BN } from 'bn.js';
import {
  AppEncryptionRequestDetails,
  CompactIAddressObject,
  SaplingPaymentAddress,
  toBase58Check,
  toIAddress,
} from 'verus-typescript-primitives';
import {
  checkedNativeIndex,
  validateAppEncryptionRequestDetails,
} from '../../deeplink/validator/appEncryptionRequestValidator';

const recipient = new SaplingPaymentAddress({d: Buffer.alloc(11, 1), pkD: Buffer.alloc(32, 2)});

describe('app encryption request validator', () => {
  it.each([false, true])('requires an encrypted reply address (returnESK = %s)', async returnESK => {
    const details = new AppEncryptionRequestDetails({
      derivationNumber: new BN(0),
      flags: returnESK ? AppEncryptionRequestDetails.FLAG_RETURN_ESK : new BN(0),
    });

    await expect(
      validateAppEncryptionRequestDetails({}, details, 0),
    ).rejects.toThrow('must specify encryptResponseToAddress');
  });

  it.each([false, true])('accepts an encrypted reply address (returnESK = %s)', async returnESK => {
    const details = new AppEncryptionRequestDetails({
      derivationNumber: new BN(0),
      encryptResponseToAddress: recipient,
      flags: returnESK ? AppEncryptionRequestDetails.FLAG_RETURN_ESK : new BN(0),
    });

    await expect(
      validateAppEncryptionRequestDetails({}, details, 0),
    ).resolves.toBeUndefined();
  });

  it('rejects an invalid encrypted reply address', async () => {
    const details = new AppEncryptionRequestDetails({
      encryptResponseToAddress: new SaplingPaymentAddress({d: Buffer.alloc(10), pkD: Buffer.alloc(32)}),
    });

    await expect(validateAppEncryptionRequestDetails({}, details, 0))
      .rejects.toThrow('Invalid encryptResponseToAddress');
  });

  it.each(['0', '2147483647'])('accepts native boundary index %s', value => {
    expect(checkedNativeIndex(new BN(value))).toBe(Number(value));
  });

  it.each(['-1', '2147483648', '9007199254740993'])(
    'rejects native index %s before conversion',
    value => {
      const index = new BN(value);
      const toNumber = jest.spyOn(index, 'toNumber');

      expect(() => checkedNativeIndex(index)).toThrow('0 to 2147483647');
      expect(toNumber).not.toHaveBeenCalled();
    },
  );

  it.each(['derivationNumber', 'secondaryDerivationNumber'])(
    'validates %s independently',
    async field => {
      const details = new AppEncryptionRequestDetails({ [field]: new BN(-1) });

      await expect(
        validateAppEncryptionRequestDetails({}, details, 0),
      ).rejects.toThrow('0 to 2147483647');
    },
  );

  it('accepts an unregistered nested identity without a lookup', async () => {
    const details = new AppEncryptionRequestDetails({
      encryptResponseToAddress: recipient,
      derivationID: CompactIAddressObject.fromAddress(toIAddress('unregistered-test-target@')),
    });

    // No request signature/system or network is needed for local syntax checks.
    await expect(
      validateAppEncryptionRequestDetails({}, details, 0),
    ).resolves.toBeUndefined();
    expect(details.secondaryDerivationNumber.toNumber()).toBe(0);
  });

  it.each(['not-an-address', toBase58Check(Buffer.alloc(20, 1), 60)])(
    'rejects malformed or non-identity nested target %s',
    async address => {
      const details = new AppEncryptionRequestDetails({
        encryptResponseToAddress: recipient,
        derivationID: CompactIAddressObject.fromAddress(address),
      });

      await expect(
        validateAppEncryptionRequestDetails({}, details, 0),
      ).rejects.toThrow('Invalid derivationID');
    },
  );
});
