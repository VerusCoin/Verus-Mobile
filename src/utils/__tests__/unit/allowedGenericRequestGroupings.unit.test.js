import {
  AUTHENTICATION_REQUEST_VDXF_KEY,
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  DATA_PACKET_REQUEST_VDXF_KEY,
  PROVISION_IDENTITY_DETAILS_VDXF_KEY,
  USER_DATA_REQUEST_VDXF_KEY,
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY,
} from 'verus-typescript-primitives';
import { validateGenericRequestGroupings } from '../../deeplink/validator/allowedGenericRequestGroupings';

const mockDetail = (iAddressKey) => ({
  getIAddressKey: () => iAddressKey,
});

describe('validateGenericRequestGroupings', () => {
  it('allows authentication requests with provisioning details', () => {
    const details = [
      mockDetail(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid),
      mockDetail(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid),
    ];

    expect(() => validateGenericRequestGroupings(details)).not.toThrow();
  });

  it('rejects authentication requests combined with unsupported detail types', () => {
    const details = [
      mockDetail(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid),
      mockDetail(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid),
      mockDetail(VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid),
    ];

    expect(() => validateGenericRequestGroupings(details)).toThrow(
      /can only appear with/
    );
  });

  it('rejects mutually-exclusive data packet and user data combinations', () => {
    const details = [
      mockDetail(DATA_PACKET_REQUEST_VDXF_KEY.vdxfid),
      mockDetail(USER_DATA_REQUEST_VDXF_KEY.vdxfid),
    ];

    expect(() => validateGenericRequestGroupings(details)).toThrow(
      /cannot appear together/
    );
  });

  it('rejects repeated provisioning details', () => {
    const details = [
      mockDetail(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid),
      mockDetail(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid),
      mockDetail(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid),
      mockDetail(APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid),
    ];

    expect(() => validateGenericRequestGroupings(details)).toThrow(
      /at most 1 time\(s\)/
    );
  });
});
