import { BN } from 'bn.js';
import {
  AppEncryptionRequestDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  CompactIAddressObject,
  GenericRequest,
  GenericResponse,
  toIAddress,
} from 'verus-typescript-primitives';
import { GenericEnvelope } from 'verus-typescript-primitives/dist/vdxf/classes/envelope/GenericEnvelope';

const identity = name => CompactIAddressObject.fromAddress(toIAddress(`${name}@`));

describe('current app encryption payloads', () => {
  it.each([undefined, 0, 19])('round-trips secondary index %s and correlation', secondary => {
    const details = new AppEncryptionRequestDetails({
      derivationNumber: new BN(7),
      secondaryDerivationNumber: secondary == null ? undefined : new BN(secondary),
      derivationID: identity('nested-target'),
      requestID: identity('correlation'),
    });
    const serialized = details.toBuffer();
    const decoded = new AppEncryptionRequestDetails();

    expect(decoded.fromBuffer(serialized, 0)).toBe(serialized.length);
    expect(decoded.secondaryDerivationNumber.toNumber()).toBe(secondary || 0);
    expect(decoded.derivationNumber.toNumber()).toBe(7);
    expect(decoded.requestID.toIAddress()).toBe(details.requestID.toIAddress());
    expect(decoded.toBuffer()).toEqual(serialized);
    expect(AppEncryptionRequestDetails.fromJson(details.toJson()).toBuffer()).toEqual(serialized);
  });

  it('defaults omitted JSON secondary input to zero and serializes it explicitly', () => {
    const details = new AppEncryptionRequestDetails({ derivationID: identity('nested-target') });
    const json = details.toJson();
    delete json.secondaryderivationnumber;

    const decoded = AppEncryptionRequestDetails.fromJson(json);
    expect(decoded.secondaryDerivationNumber.toNumber()).toBe(0);
    expect(decoded.toJson().secondaryderivationnumber).toBe(0);
    expect(decoded.toBuffer().slice(-1)).toEqual(Buffer.from([0]));
  });

  it('omits an unused secondary index', () => {
    const details = new AppEncryptionRequestDetails({ secondaryDerivationNumber: new BN(19) });

    expect(details.toJson().secondaryderivationnumber).toBeUndefined();
    expect(details.toBuffer()).toEqual(new AppEncryptionRequestDetails().toBuffer());
  });

  it('requires the secondary byte in a scoped binary payload', () => {
    const details = new AppEncryptionRequestDetails({ derivationID: identity('nested-target') });

    expect(() => new AppEncryptionRequestDetails().fromBuffer(details.toBuffer().slice(0, -1), 0)).toThrow();
  });

  it.each([GenericEnvelope, GenericRequest, GenericResponse])(
    'uses the renamed app scope in %p binary and JSON',
    Envelope => {
      const envelope = new Envelope({
        appOrDelegatorID: identity('app-scope'),
        details: [new AppEncryptionRequestOrdinalVDXFObject({
          data: new AppEncryptionRequestDetails({
            derivationID: identity('nested-target'),
            secondaryDerivationNumber: new BN(9),
          }),
        })],
      });
      const decoded = new Envelope();
      const serialized = envelope.toBuffer();

      expect(decoded.fromBuffer(serialized, 0)).toBe(serialized.length);
      expect(decoded.hasAppOrDelegatorID()).toBe(true);
      expect(decoded.appOrDelegatorID.toIAddress()).toBe(envelope.appOrDelegatorID.toIAddress());
      expect(decoded.toJson().appOrDelegatorID).toEqual(envelope.appOrDelegatorID.toJson());
      expect(decoded.getDetails(0).data.secondaryDerivationNumber.toNumber()).toBe(9);
      expect(Envelope.FLAG_HAS_APP_OR_DELEGATOR_ID.toNumber()).toBe(64);
    },
  );
});
