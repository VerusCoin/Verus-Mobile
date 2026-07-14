import {
  DataDescriptor,
  DataPacketRequestDetails,
  DataPacketRequestOrdinalVDXFObject,
  UserDataRequestDetails,
  UserDataRequestOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {validateDataPacketRequestVDXFObject} from '../../deeplink/validator/dataPacketRequestValidator';
import {validateUserDataRequestVDXFObject} from '../../deeplink/validator/userDataRequestValidator';

const requestForDetail = (detail, signed = true) => ({
  getDetails: () => detail,
  isSigned: () => signed,
});

describe('generic data request validators', () => {
  it('accepts full credential user data requests', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).not.toThrow();
  });

  it('rejects unsupported user data request modes', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.PARTIAL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('Only full credential data requests');
  });

  it('rejects unsigned user data requests', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail, false), 0),
    ).toThrow('require a signed GenericRequest');
  });

  it('accepts data packet requests with string and descriptor signable objects', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        signableObjects: [
          'message',
          new DataDescriptor({objectdata: Buffer.from('descriptor')}),
        ],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).not.toThrow();
  });

  it('rejects unsupported data packet signable objects', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        signableObjects: [{}],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('Unsupported data packet signable object type');
  });
});
