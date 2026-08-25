import BN from 'bn.js';
import {
  AuthenticationRequestDetails,
  AuthenticationRequestOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {
  assertAuthenticationRequestNotExpired,
  performAfterAuthenticationExpiryCheck,
  signAfterAuthenticationExpiryCheck,
  validateAuthenticationRequestVDXFObject,
} from '../../deeplink/validator/authenticationRequestValidator';

const requestForExpiry = expiryTime => {
  const detail = new AuthenticationRequestOrdinalVDXFObject({
    data: new AuthenticationRequestDetails({
      expiryTime: new BN(expiryTime),
    }),
  });

  return {
    detail,
    request: {
      getDetails: () => detail,
    },
  };
};

describe('authentication request expiry validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a request whose expiry is in the future', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const {request} = requestForExpiry(1_700_000_001);

    expect(() => validateAuthenticationRequestVDXFObject(request, 0)).not.toThrow();
  });

  it('rejects a request whose expiry is in the past', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const {request} = requestForExpiry(1_699_999_999);

    expect(() => validateAuthenticationRequestVDXFObject(request, 0)).toThrow(
      'Authentication request has expired',
    );
  });

  it('treats an expiry at the current second as expired', () => {
    const {detail} = requestForExpiry(1_700_000_000);

    expect(() =>
      assertAuthenticationRequestNotExpired(detail.data, 1_700_000_000),
    ).toThrow('Authentication request has expired');
  });

  it('allows authentication requests without an expiry', () => {
    const details = new AuthenticationRequestDetails();

    expect(() =>
      assertAuthenticationRequestNotExpired(details, 1_700_000_000),
    ).not.toThrow();
  });

  it('revalidates expiry in the same turn as signing and never signs an expired request', () => {
    const {detail} = requestForExpiry(1_700_000_001);
    const request = {details: [detail]};
    const signResponse = jest.fn(() => 'signed-response');

    expect(() =>
      signAfterAuthenticationExpiryCheck(
        request,
        signResponse,
        1_700_000_001,
      ),
    ).toThrow('Authentication request has expired');
    expect(signResponse).not.toHaveBeenCalled();
  });

  it('signs when every authentication detail is still valid', () => {
    const {detail} = requestForExpiry(1_700_000_002);
    const request = {details: [detail]};
    const signResponse = jest.fn(() => 'signed-response');

    expect(
      signAfterAuthenticationExpiryCheck(
        request,
        signResponse,
        1_700_000_001,
      ),
    ).toBe('signed-response');
    expect(signResponse).toHaveBeenCalledTimes(1);
  });

  it('does not deliver a response if the request expires after signing', () => {
    const {detail} = requestForExpiry(1_700_000_002);
    const request = {details: [detail]};
    const signResponse = jest.fn(() => 'signed-response');
    const deliverResponse = jest.fn();

    expect(
      signAfterAuthenticationExpiryCheck(
        request,
        signResponse,
        1_700_000_001,
      ),
    ).toBe('signed-response');

    expect(() =>
      performAfterAuthenticationExpiryCheck(
        request,
        deliverResponse,
        1_700_000_002,
      ),
    ).toThrow('Authentication request has expired');
    expect(deliverResponse).not.toHaveBeenCalled();
  });
});
