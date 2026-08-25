import {
  AppEncryptionRequestDetails,
  CompactAddressObject,
  DataDescriptor,
  DataResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {buildEncryptedAppEncryptionResponseDetail} from '../../deeplink/handlers/appEncryptionRequestHandler';

const REQUEST_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';

describe('app encryption encrypted response wrapper', () => {
  it('wraps encrypted app-encryption data in DataResponseDetails', () => {
    const requestDetail = new AppEncryptionRequestDetails({
      requestID: CompactAddressObject.fromIAddress(REQUEST_ID),
    });
    const encryptedDescriptor = new DataDescriptor({
      flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
      objectdata: Buffer.from('aabbcc', 'hex'),
      epk: Buffer.from('ddeeff', 'hex'),
    });

    const responseDetail = buildEncryptedAppEncryptionResponseDetail(
      requestDetail,
      encryptedDescriptor,
    );

    expect(responseDetail).toBeInstanceOf(DataResponseOrdinalVDXFObject);
    expect(responseDetail.data.requestID.toIAddress()).toBe(REQUEST_ID);
    expect(responseDetail.data.data).toBe(encryptedDescriptor);
  });
});
