let mockState;
const mockRenderRevoke = jest.fn(() => null);
const mockRenderRecover = jest.fn(() => null);
const mockGetIdentity = jest.fn();
const mockDeriveKeyPair = jest.fn();
const mockDecryptKey = jest.fn();
const mockBuild = jest.fn();
jest.mock('react-native', () => ({Alert: {alert: jest.fn()}, Dimensions: {get: () => ({height: 800})}}));
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('react-redux', () => ({useDispatch: () => jest.fn(), useSelector: selector => selector(mockState)}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: (...args) => mockGetIdentity(...args), getFriendlyNameMap: async () => ({})}));
jest.mock('../../identityUpdate/verifiedSubmission', () => ({
  captureIdentityUpdateContext: options => options,
  assertIdentityUpdateContext: context => {
    if (context.modalRequestId !== mockState.sendModal.requestId) throw Object.assign(new Error('Dialog replaced'), {code: 'SESSION_CHANGED'});
  },
  validateIdentityUpdateContext: jest.fn(async () => 100),
}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({createRevokeIdentityTx: (...args) => mockBuild(...args), createRecoverIdentityTx: (...args) => mockBuild(...args)}));
jest.mock('../../keys', () => ({deriveKeyPair: (...args) => mockDeriveKeyPair(...args)}));
jest.mock('../../seedCrypt', () => ({decryptkey: (...args) => mockDecryptKey(...args)}));
jest.mock('../../CoinData/CoinsList', () => ({coinsList: {VRSC: {id: 'VRSC'}}}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findSystemCoinObj: () => ({display_name: 'Verus'})}}));
jest.mock('../../vrpc/fundRawTransactionError', () => ({showFundRawTransactionErrorAlert: () => false}));
jest.mock('../../math', () => ({satsToCoins: value => value.dividedBy(1e8)}));
jest.mock('../../../components/SendModal/RevokeIdentity/RevokeIdentityForm/RevokeIdentityForm.render', () => ({RevokeIdentityFormRender: (...args) => mockRenderRevoke(...args)}));
jest.mock('../../../components/SendModal/RecoverIdentity/RecoverIdentityForm/RecoverIdentityForm.render', () => ({RecoverIdentityFormRender: (...args) => mockRenderRecover(...args)}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Alert} = require('react-native');
const Revoke = require('../../../components/SendModal/RevokeIdentity/RevokeIdentityForm/RevokeIdentityForm').default;
const Recover = require('../../../components/SendModal/RecoverIdentity/RecoverIdentityForm/RecoverIdentityForm').default;
const constants = require('../../constants/sendModal');
const cases = [[Revoke, mockRenderRevoke, 'active'], [Recover, mockRenderRecover, 'revoked']];
const subject = status => ({result: {status, identity: {identityaddress: 'target-id', recoveryauthority: 'authority-id', revocationauthority: 'authority-id'}}});
const authority = {result: {status: 'active', identity: {identityaddress: 'authority-id', primaryaddresses: ['controlled-address'], minimumsignatures: 1}}};
const props = () => ({setLoading: jest.fn(), setModalHeight: jest.fn(), navigation: {navigate: jest.fn()}, updateSendFormData: jest.fn()});
beforeEach(() => {
  jest.clearAllMocks();
  mockState = {authentication: {instanceKey: 'instance-before', signedIn: false, activeAccount: null}, sendModal: {requestId: 'modal-original', data: {
    [constants.SEND_MODAL_IDENTITY_TO_REVOKE_FIELD]: 'target@',
    [constants.SEND_MODAL_IDENTITY_TO_RECOVER_FIELD]: 'target@',
    [constants.SEND_MODAL_SYSTEM_ID]: 'system-id',
    [constants.SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: 'encrypted-before',
    [constants.SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD]: 'new-primary-address',
  }}};
  mockDecryptKey.mockImplementation((_, seed) => seed);
  mockDeriveKeyPair.mockResolvedValue({addresses: ['controlled-address']});
  mockBuild.mockResolvedValue({fundingApproval: {nativeFee: '10000'}});
});

it.each(cases)('%p opts into signed-out review and uses the current imported seed', async (Form, render, status) => {
  mockGetIdentity.mockResolvedValueOnce(subject(status)).mockResolvedValueOnce(authority);
  const componentProps = props();
  let view;
  act(() => { view = create(<Form {...componentProps} />); });
  mockState = {...mockState, authentication: {...mockState.authentication, instanceKey: 'instance-current'}, sendModal: {...mockState.sendModal, data: {
    ...mockState.sendModal.data, [constants.SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: 'encrypted-current',
  }}};
  act(() => view.update(<Form {...componentProps} />));
  await act(async () => render.mock.calls.at(-1)[0].submitData());
  expect(mockDecryptKey).toHaveBeenCalledWith('instance-current', 'encrypted-current');
  expect(componentProps.navigation.navigate).toHaveBeenCalledWith(constants.SEND_MODAL_FORM_STEP_CONFIRM,
    expect.objectContaining({updateContext: expect.objectContaining({modalRequestId: 'modal-original', allowSignedOut: true})}));
  expect(componentProps.setLoading).toHaveBeenLastCalledWith(false);
  expect(Alert.alert).not.toHaveBeenCalled();
  view.unmount();
});

it.each(cases)('%p clears loading when its still-open request is cancelled', async (Form, render) => {
  mockGetIdentity.mockRejectedValueOnce(Object.assign(new Error('Session changed'), {code: 'SESSION_CHANGED'}));
  const componentProps = props();
  let view;
  act(() => { view = create(<Form {...componentProps} />); });
  await act(async () => render.mock.calls.at(-1)[0].submitData());
  expect(componentProps.setLoading.mock.calls).toEqual([[true], [false]]);
  expect(mockDecryptKey).not.toHaveBeenCalled();
  expect(mockBuild).not.toHaveBeenCalled();
  expect(componentProps.navigation.navigate).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  view.unmount();
});

it.each(cases)('%p stops a pending lookup when another modal replaces the request', async (Form, render, status) => {
  let release;
  mockGetIdentity.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const componentProps = props();
  let view;
  act(() => { view = create(<Form {...componentProps} />); });
  let pending;
  act(() => { pending = render.mock.calls.at(-1)[0].submitData(); });
  mockState = {...mockState, sendModal: {...mockState.sendModal, requestId: 'modal-replacement'}};
  await act(async () => { release(subject(status)); await pending; });
  expect(mockGetIdentity).toHaveBeenCalledTimes(1);
  expect(mockDecryptKey).not.toHaveBeenCalled();
  expect(mockBuild).not.toHaveBeenCalled();
  expect(componentProps.navigation.navigate).not.toHaveBeenCalled();
  expect(componentProps.setLoading).not.toHaveBeenCalledWith(false);
  expect(Alert.alert).not.toHaveBeenCalled();
  view.unmount();
});
