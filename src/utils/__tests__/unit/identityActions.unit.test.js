let mockState;
const mockNavigate = jest.fn();
const mockGetIdentity = jest.fn();

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
  Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
  StyleSheet: {create: value => value},
}));
jest.mock('react-redux', () => ({connect: () => Component => Component}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 34})}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../components/SemiModal', () => 'SemiModal');
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('../../../actions/actionCreators', () => ({setServiceLoading: jest.fn(), setUserCoins: jest.fn()}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn(), resolveAlert: jest.fn()}));
jest.mock('../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager', () => ({updateVerusIdWallet: jest.fn()}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({clearChainLifecycle: jest.fn(), refreshActiveChainLifecycles: jest.fn()}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({openLinkIdentityModal: jest.fn()}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/verusid', () => ({unlinkVerusId: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: (...args) => mockGetIdentity(...args), getFriendlyNameMap: jest.fn()}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: jest.fn(), getBasicCoinObj: jest.fn()}}));
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/VerusIdServiceOverview.render', () => ({VerusIdServiceOverviewRender: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Platform} = require('react-native');
const {VerusIdServiceOverview} = require('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/VerusIdServiceOverview');
const IdentityActionsModal = require('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/IdentityActionsModal').default;

const iAddress = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const stateFor = (accountHash = 'alice', sessionEpoch = 1) => ({
  authentication: {activeAccount: {id: accountHash, accountHash}, sessionEpoch},
  coins: {activeCoinList: []},
});
const overview = () => {
  const instance = new VerusIdServiceOverview({
    activeAccount: mockState.authentication.activeAccount,
    sessionEpoch: mockState.authentication.sessionEpoch,
    navigation: {navigate: mockNavigate},
  });
  instance.setState = (update, callback) => {
    instance.state = {...instance.state, ...update};
    callback?.();
  };
  instance.openIdentityActionsModal('VRSCTEST', iAddress, 'alice.VRSCTEST@');
  return instance;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState = stateFor();
  Platform.OS = 'ios';
});

test.each([['transfer', 'IdentityTransfer'], ['modify', 'IdentityModify']])(
  '%s opens the correct identity screen after the native sheet has dismissed',
  (action, screen) => {
    const instance = overview();
    const selection = instance.state.identityActions;
    instance.closeIdentityActionsModal(selection, action);
    expect(instance.state.identityActionsVisible).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    // A second tap must not replace the intended action or trigger it early.
    instance.closeIdentityActionsModal(selection, 'unlink');
    instance.closeIdentityActionsModal(selection);
    expect(mockNavigate).not.toHaveBeenCalled();
    instance.finishIdentityAction(selection);
    instance.finishIdentityAction(selection);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('IdentityManagement', {
      screen, params: {chain: 'VRSCTEST', identityAddress: iAddress, displayName: 'alice.VRSCTEST@'},
    });
    expect(mockGetIdentity).not.toHaveBeenCalled();
  },
);

test('Android completes selection without waiting for the iOS-only dismissal callback', () => {
  Platform.OS = 'android';
  const instance = overview();
  instance.closeIdentityActionsModal(instance.state.identityActions, 'transfer');
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(instance.state.identityActions).toBeNull();
});

test.each(['details', 'unlink'])('%s retains the selected identity and original account scope', action => {
  const instance = overview();
  const selection = instance.state.identityActions;
  instance.openVerusIdDetailsModal = jest.fn();
  instance.tryUnlinkIdentity = jest.fn();
  instance.closeIdentityActionsModal(selection, action);
  expect(instance.openVerusIdDetailsModal).not.toHaveBeenCalled();
  expect(instance.tryUnlinkIdentity).not.toHaveBeenCalled();
  instance.finishIdentityAction(selection);
  if (action === 'details') {
    expect(instance.openVerusIdDetailsModal).toHaveBeenCalledWith('VRSCTEST', iAddress, selection.requestContext);
  } else {
    expect(instance.tryUnlinkIdentity).toHaveBeenCalledWith(iAddress, 'VRSCTEST', selection.requestContext);
  }
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('cancel closes the chooser without taking an identity action', () => {
  const instance = overview();
  const selection = instance.state.identityActions;
  instance.closeIdentityActionsModal(selection);
  instance.finishIdentityAction(selection);
  expect(instance.state.identityActions).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test.each(['transfer', 'modify', 'details', 'unlink'])(
  'an account change between choosing %s and native dismissal cancels the action', action => {
    const instance = overview();
    const selection = instance.state.identityActions;
    instance.openVerusIdDetailsModal = jest.fn();
    instance.tryUnlinkIdentity = jest.fn();
    instance.closeIdentityActionsModal(selection, action);
    mockState = stateFor('bob', 2);
    instance.finishIdentityAction(selection);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(instance.openVerusIdDetailsModal).not.toHaveBeenCalled();
    expect(instance.tryUnlinkIdentity).not.toHaveBeenCalled();
  },
);

test('a same-account logout and login invalidates an already-open action sheet', () => {
  const instance = overview();
  const selection = instance.state.identityActions;
  mockState = stateFor('alice', 3);
  instance.closeIdentityActionsModal(selection, 'transfer');
  instance.finishIdentityAction(selection);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('old dismissal callbacks cannot select an action from a newer sheet', () => {
  const instance = overview();
  const previousSelection = instance.state.identityActions;
  instance.closeIdentityActionsModal(previousSelection);
  instance.finishIdentityAction(previousSelection);
  instance.openIdentityActionsModal('VRSCTEST', 'iOther', 'bob@');
  const currentSelection = instance.state.identityActions;
  instance.closeIdentityActionsModal(currentSelection, 'modify');
  instance.finishIdentityAction(previousSelection);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(instance.state.identityActions).toBe(currentSelection);
  instance.finishIdentityAction(currentSelection);
  expect(mockNavigate).toHaveBeenCalledWith('IdentityManagement', {
    screen: 'IdentityModify', params: {chain: 'VRSCTEST', identityAddress: 'iOther', displayName: 'bob@'},
  });
});

test('account changes close both identity sheets and clear any pending action', () => {
  const instance = overview();
  const selection = instance.state.identityActions;
  instance.closeIdentityActionsModal(selection, 'transfer');
  const previousProps = instance.props;
  mockState = stateFor('bob', 2);
  instance.props = {...instance.props, activeAccount: mockState.authentication.activeAccount, sessionEpoch: 2};
  instance.componentDidUpdate(previousProps);
  expect(instance.state).toMatchObject({identityActions: null, identityActionsVisible: false, verusIdDetailsModalProps: null});
  instance.finishIdentityAction(selection);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('unmounting the service cancels an action awaiting native dismissal', () => {
  const instance = overview();
  const selection = instance.state.identityActions;
  instance.closeIdentityActionsModal(selection, 'transfer');
  instance.componentWillUnmount();
  instance.finishIdentityAction(selection);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('the sheet names its identity, exposes separate actions, and disables them while dismissing', () => {
  const onClose = jest.fn();
  const onDismiss = jest.fn();
  const onSelect = jest.fn();
  const props = {selection: {iAddress, chain: 'VRSCTEST', displayName: 'alice.VRSCTEST'}, onClose, onDismiss, onSelect};
  let view;
  act(() => {view = create(<IdentityActionsModal {...props} visible />);});
  const actions = view.root.findAllByType('Pressable');
  expect(actions.map(action => action.props.accessibilityLabel).filter(Boolean)).toEqual([
    'Close identity actions', 'Transfer identity, alice.VRSCTEST@', 'Modify identity, alice.VRSCTEST@',
    'View details, alice.VRSCTEST@', 'Unlink identity, alice.VRSCTEST@',
  ]);
  act(() => actions[1].props.onPress());
  expect(onSelect).toHaveBeenCalledWith('transfer');
  expect(onClose).not.toHaveBeenCalled();
  expect(view.root.findByType('SemiModal').props.onDismiss).toBe(onDismiss);
  expect(actions[0].props.style({pressed: false})[0]).toMatchObject({width: 44, height: 44});
  act(() => view.update(<IdentityActionsModal {...props} visible={false} />));
  view.root.findAllByType('Pressable').forEach(action => expect(action.props.disabled).toBe(true));
  act(() => view.unmount());
});
