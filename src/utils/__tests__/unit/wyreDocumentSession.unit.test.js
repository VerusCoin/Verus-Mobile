let mockState;
const mockDispatch = jest.fn();
const mockModifyServiceStoredDataForUser = jest.fn();
const mockRequestServiceStoredData = jest.fn();
const mockUploadDocument = jest.fn();
const mockFollowupPaymentMethod = jest.fn();

jest.mock('react', () => {
  class Component {
    constructor(props) {
      this.props = props;
      this.state = {};
    }

    setState(update, callback) {
      const next = typeof update === 'function' ? update(this.state) : update;
      this.state = {...this.state, ...next};
      if (callback) callback();
    }
  }

  return {__esModule: true, default: {}, Component};
});

jest.mock('react-redux', () => ({connect: () => Component => Component}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: mockDispatch,
    getState: jest.fn(() => mockState),
  },
}));

jest.mock('../../../actions/actionCreators', () => ({
  expireServiceData: jest.fn(),
  setServiceLoading: jest.fn(),
}));

jest.mock('../../../actions/actionDispatchers', () => ({
  conditionallyUpdateService: jest.fn(),
}));

jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: jest.fn(),
  resolveAlert: jest.fn(),
}));

jest.mock('../../auth/authBox', () => ({
  requestPersonalData: jest.fn(),
  requestServiceStoredData: mockRequestServiceStoredData,
}));

jest.mock('../../../actions/actions/services/dispatchers/services', () => ({
  modifyServiceStoredDataForUser: mockModifyServiceStoredDataForUser,
}));

jest.mock('../../services/WyreProvider', () => ({
  __esModule: true,
  default: {
    followupPaymentMethod: mockFollowupPaymentMethod,
    uploadDocument: mockUploadDocument,
    updateAccount: jest.fn(),
  },
}));

jest.mock('../../personal/displayUtils', () => ({}));
jest.mock('../../services/translationUtils', () => ({}));
jest.mock('../../linking', () => ({openUrl: jest.fn()}));
jest.mock('react-native', () => ({Linking: {openURL: jest.fn()}}));

jest.mock(
  '../../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAccountData/WyreServiceAccountData.render',
  () => ({WyreServiceAccountDataRender: jest.fn()}),
);

jest.mock(
  '../../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceEditPaymentMethod/WyreServiceEditPaymentMethod.render',
  () => ({WyreServiceEditPaymentMethodRender: jest.fn()}),
);

const {
  mapWyreDocumentIds,
} = require('../../../actions/actions/services/dispatchers/wyre/wyre');
const {
  WyreServiceAccountData,
} = require('../../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAccountData/WyreServiceAccountData');
const {
  WyreServiceEditPaymentMethod,
} = require('../../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceEditPaymentMethod/WyreServiceEditPaymentMethod');

const stateFor = (accountHash, sessionEpoch) => ({
  authentication: {
    activeAccount: {accountHash},
    sessionEpoch,
  },
});

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

describe('Wyre document session isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = stateFor('account-a', 1);
  });

  it('captures document-upload origin before confirmation and rejects account B', async () => {
    const confirmation = deferred();
    const instance = new WyreServiceAccountData({dispatch: mockDispatch});
    instance.state.params.wyreFieldData = {fieldType: 'DOCUMENT'};
    instance.canSubmitDataToWyre = jest.fn(() => confirmation.promise);
    instance.submitDataToWyre = jest.fn(submit => submit());

    const submission = instance.submitOption({
      field: 'DOCUMENT_FIELD',
      uris: ['file://document.jpg'],
    });
    mockState = stateFor('account-b', 2);
    confirmation.resolve(true);

    await expect(submission).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockUploadDocument).not.toHaveBeenCalled();
  });

  it('captures payment follow-up origin before confirmation and rejects account B', async () => {
    const confirmation = deferred();
    const instance = new WyreServiceEditPaymentMethod({
      dispatch: mockDispatch,
      route: {params: {paymentMethodId: 'payment-1'}},
      wyrePaymentMethods: {
        mapping: {'payment-1': {id: 'payment-1'}},
      },
    });
    instance.canSubmitDataToWyre = jest.fn(() => confirmation.promise);
    instance.submitDataToWyre = jest.fn(submit => submit());

    const submission = instance.submitOption(
      {id: 'payment-1'},
      ['file://followup.jpg'],
    );
    mockState = stateFor('account-b', 2);
    confirmation.resolve(true);

    await expect(submission).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockFollowupPaymentMethod).not.toHaveBeenCalled();
  });

  it('does not modify account B if the account changes while mapping documents', async () => {
    const serviceData = deferred();
    mockRequestServiceStoredData.mockReturnValueOnce(serviceData.promise);
    const requestContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: 'account-a',
        sessionEpoch: 1,
      },
    };
    const mapping = mapWyreDocumentIds(
      'DOCUMENT_FIELD',
      ['document-1'],
      ['file://document.jpg'],
      ['hash-1'],
      requestContext,
    );

    expect(mockRequestServiceStoredData).toHaveBeenCalled();
    mockState = stateFor('account-b', 2);
    serviceData.resolve({});

    await expect(mapping).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockModifyServiceStoredDataForUser).not.toHaveBeenCalled();
  });
});
