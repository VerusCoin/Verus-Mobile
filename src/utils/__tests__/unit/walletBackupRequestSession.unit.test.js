let mockState;
const mockAlert = jest.fn();
const mockRequestPassword = jest.fn();
const mockRequestSeeds = jest.fn();
const mockBuildBackup = jest.fn();
const mockBeginNfc = jest.fn();
const mockEndNfc = jest.fn();
const mockWriteBackup = jest.fn();
const mockMarkComplete = jest.fn();
const mockGetKey = jest.fn();
const mockCreateProfile = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockState},
}));
jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  Keyboard: {dismiss: jest.fn()},
  Platform: {OS: 'android'},
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  ...jest.requireActual('react-native-paper'),
  Portal: 'Portal',
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  Checkbox: {Item: 'CheckboxItem'},
  Menu: Object.assign(({children}) => children, {Item: 'MenuItem'}),
  Text: 'Text',
  TextInput: Object.assign(
    props => require('react').createElement('TextInput', props),
    {Icon: 'TextInputIcon', Affix: 'TextInputAffix'},
  ),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useDispatch: () => jest.fn(),
  useSelector: selector => selector(mockState),
}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  closeLoadingModal: jest.fn(),
  openLoadingModal: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/dlight/dispatchers/AlertManager', () => ({
  canEnableBiometry: jest.fn(),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: mockAlert,
  resolveAlert: jest.fn(),
}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({
  openAuthenticateUserModal: jest.fn(),
}));
jest.mock('../../../globals/colors', () => ({}));
jest.mock('../../constants/constants', () => ({
  MIN_PASS_LENGTH: 8,
  MIN_PASS_SCORE: 3,
  PASS_SCORE_LIMIT: 5,
}));
jest.mock('../../auth/scorePassword', () => () => 5);
jest.mock('../../auth/authBox', () => ({
  requestPassword: mockRequestPassword,
  requestSeeds: mockRequestSeeds,
}));
jest.mock('../../keyGenerator/keyGenerator', () => ({getKey: mockGetKey}));
jest.mock('../../keepAwake/keepAwake', () => ({withKeepAwake: fn => fn()}));
jest.mock('../../keychain/keychain', () => ({
  getSupportedBiometryType: async () => ({biometry: false}),
}));
jest.mock('../../profile/createProfileFromSeed', () => ({
  createProfileFromSeed: mockCreateProfile,
}));
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {initEndpoint: jest.fn()}}));
jest.mock('../../walletBackup/walletBackup', () => ({
  WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS: [
    {label: 'Medium', iterations: 300000},
  ],
  WALLET_BACKUP_ENCRYPTION_ITERS_MEDIUM: 300000,
  isValid24WordBip39Mnemonic: () => true,
  buildWalletBackupOrdinal: mockBuildBackup,
}));
jest.mock('../../walletBackup/walletBackupCompletionStorage', () => ({
  getWalletBackupCompletionKey: (_request, _index, accountHash) => accountHash,
  markWalletBackupRequestComplete: mockMarkComplete,
}));
jest.mock('../../walletBackup/walletBackupNfc', () => ({
  ...jest.requireActual('../../walletBackup/walletBackupNfc'),
  beginWalletBackupNfcSession: mockBeginNfc,
  endWalletBackupNfcSession: mockEndNfc,
  writeWalletBackupToNfc: mockWriteBackup,
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {ELECTRUM} = require('../../constants/intervalConstants');
const {captureSessionScope} = require('../../../actions/actions/updates/sessionRequests');
const WalletBackupRequestInfo = require('../../../containers/DeepLink/WalletBackupRequestInfo/WalletBackupRequestInfo').default;

const account = name => ({id: name, accountHash: name, testnetOverrides: {}});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => {resolve = done;});
  return {promise, resolve};
};

describe('wallet backup account isolation', () => {
  let renderer;
  let props;
  let consoleError;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockState = {
      authentication: {
        signedIn: true,
        activeAccount: account('A'),
        accounts: [account('A'), account('B')],
        sessionEpoch: 1,
      },
      coins: {activeCoinList: []},
      deeplink: {requestId: 1},
      modal: {stack: []},
    };
    mockAlert.mockResolvedValue(true);
    mockRequestPassword.mockResolvedValue('profile password');
    mockRequestSeeds.mockImplementation(async () => ({
      [ELECTRUM]: `seed for ${mockState.authentication.activeAccount.accountHash}`,
    }));
    mockBuildBackup.mockImplementation(async ({mnemonic}) => ({mnemonic}));
    mockBeginNfc.mockResolvedValue(true);
    mockEndNfc.mockResolvedValue();
    mockWriteBackup.mockImplementation(async (_backup, {beforeWrite}) => {
      beforeWrite();
      return {written: true};
    });
    mockMarkComplete.mockResolvedValue();
    mockGetKey.mockResolvedValue('generated seed');
    mockCreateProfile.mockResolvedValue();
    props = {
      request: {isTestnet: () => false},
      detailIndex: 0,
      next: jest.fn().mockResolvedValue(),
      // The wallet password was typed in an earlier step of this session.
      walletPasswordTypedScope: captureSessionScope(mockState, 'A'),
    };
    await act(async () => {
      renderer = create(React.createElement(WalletBackupRequestInfo, props));
    });
  });

  afterEach(() => {
    act(() => renderer.unmount());
    consoleError.mockRestore();
  });

  const rawText = node => typeof node === 'string' ? node : (node.children || []).map(rawText).join('');
  const hostButton = label => renderer.root.findAllByType('Button').find(button => button.props.children === label);
  const writeBackupButton = () => hostButton('Write to NFC card');
  const writeBackup = () => writeBackupButton().props.onPress();
  // A failed card step offers Try again, and a written card offers Done.
  const retryBackup = () => hostButton('Try again').props.onPress();
  const finishBackup = () => hostButton('Done').props.onPress();

  const switchAccount = name => {
    mockState = {
      ...mockState,
      authentication: {
        ...mockState.authentication,
        activeAccount: account(name),
        sessionEpoch: mockState.authentication.sessionEpoch + 1,
      },
    };
    act(() => renderer.update(React.createElement(WalletBackupRequestInfo, props)));
  };

  const expectAborted = () => {
    expect(mockWriteBackup).not.toHaveBeenCalled();
    expect(mockMarkComplete).not.toHaveBeenCalled();
    expect(props.next).not.toHaveBeenCalled();
    expect(rawText(renderer.root)).toContain('Backup not written');
    expect(rawText(renderer.root)).toContain('Account changed before the backup was written.');
    expect(mockEndNfc).toHaveBeenCalled();
  };

  it('writes and completes a backup for the unchanged approving account', async () => {
    await act(async () => {await writeBackup();});

    expect(mockWriteBackup).toHaveBeenCalledWith(
      {mnemonic: 'seed for A'},
      expect.objectContaining({beforeWrite: expect.any(Function)}),
    );
    expect(mockMarkComplete).toHaveBeenCalledWith('A');
    expect(props.next).not.toHaveBeenCalled();
    await act(async () => {await finishBackup();});
    expect(props.next).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('shows one unencrypted confirmation for repeated taps and allows retry after cancellation', async () => {
    act(() => renderer.root.findAll(node => node.props.title === 'Encrypt backup' && typeof node.props.onValueChange === 'function')[0]
      .props.onValueChange(false));
    const confirmation = deferred();
    mockAlert.mockReturnValueOnce(confirmation.promise);
    const submit = writeBackupButton().props.onPress;
    let pending;

    await act(async () => {
      pending = submit();
      await submit();
    });
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert.mock.calls[0][0]).toBe('Back up without a password?');
    expect(mockBeginNfc).not.toHaveBeenCalled();
    expect(mockEndNfc).not.toHaveBeenCalled();

    await act(async () => {confirmation.resolve(false); await pending;});
    expect(mockWriteBackup).not.toHaveBeenCalled();
    expect(props.next).not.toHaveBeenCalled();

    await act(async () => {await writeBackup();});
    expect(mockAlert).toHaveBeenCalledTimes(2);
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    await act(async () => {await finishBackup();});
    expect(props.next).toHaveBeenCalledTimes(1);
  });

  it('writes and completes once through NFC setup, writing, navigation, and late repeat callbacks', async () => {
    const session = deferred();
    const writing = deferred();
    const writeStarted = deferred();
    const navigation = deferred();
    const navigationStarted = deferred();
    mockBeginNfc.mockReturnValueOnce(session.promise);
    mockWriteBackup.mockImplementationOnce((_backup, {beforeWrite}) => {
      beforeWrite();
      writeStarted.resolve();
      return writing.promise;
    });
    props.next.mockImplementationOnce(() => {
      navigationStarted.resolve();
      return navigation.promise;
    });
    const submit = writeBackupButton().props.onPress;
    let pending;

    await act(async () => {
      pending = submit();
      await submit();
    });
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockRequestPassword).not.toHaveBeenCalled();
    expect(mockEndNfc).not.toHaveBeenCalled();

    await act(async () => {session.resolve(true); await writeStarted.promise;});
    await act(async () => {await submit();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    expect(mockMarkComplete).not.toHaveBeenCalled();
    expect(mockEndNfc).not.toHaveBeenCalled();

    await act(async () => {writing.resolve({written: true}); await pending;});
    expect(mockMarkComplete).toHaveBeenCalledTimes(1);
    expect(props.next).not.toHaveBeenCalled();
    let finishing;
    await act(async () => {finishing = finishBackup(); await navigationStarted.promise;});
    await act(async () => {await finishBackup();});
    expect(props.next).toHaveBeenCalledTimes(1);

    await act(async () => {navigation.resolve(); await finishing;});
    await act(async () => {await submit();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    expect(props.next).toHaveBeenCalledTimes(1);
  });

  it('holds the write guard through failed preparation cleanup, then allows a retry', async () => {
    const cleanup = deferred();
    const cleanupStarted = deferred();
    mockRequestPassword.mockRejectedValueOnce(new Error('Password cancelled'));
    mockEndNfc.mockImplementationOnce(() => {
      cleanupStarted.resolve();
      return cleanup.promise;
    });
    const submit = writeBackupButton().props.onPress;
    let pending;

    await act(async () => {pending = submit(); await cleanupStarted.promise;});
    await act(async () => {await submit();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockEndNfc).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup).not.toHaveBeenCalled();
    expect(props.next).not.toHaveBeenCalled();

    await act(async () => {cleanup.resolve(); await pending;});
    expect(rawText(renderer.root)).toContain('Backup not written');
    expect(rawText(renderer.root)).toContain('Password cancelled');
    await act(async () => {await retryBackup();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(2);
    expect(mockEndNfc).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    await act(async () => {await finishBackup();});
    expect(props.next).toHaveBeenCalledTimes(1);
  });

  it('allows retry if completion navigation fails instead of permanently latching the screen', async () => {
    props.next.mockRejectedValueOnce(new Error('Could not complete request'));
    await act(async () => {await writeBackup();});
    await act(async () => {await finishBackup();});
    expect(mockAlert).toHaveBeenCalledWith('Cannot finish request', 'Could not complete request');

    await act(async () => {await finishBackup();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    expect(props.next).toHaveBeenCalledTimes(2);
  });

  it('rejects an account change while preparing the NFC session', async () => {
    const nfc = deferred();
    const started = deferred();
    mockBeginNfc.mockImplementationOnce(() => {
      started.resolve();
      return nfc.promise;
    });
    let pending;
    await act(async () => {pending = writeBackup(); await started.promise;});
    switchAccount('B');
    await act(async () => {nfc.resolve(true); await pending;});

    expectAborted();
    expect(mockRequestPassword).not.toHaveBeenCalled();
    expect(mockRequestSeeds).not.toHaveBeenCalled();
  });

  it('rejects a changed session while retrieving the backup password', async () => {
    const password = deferred();
    const started = deferred();
    mockRequestPassword.mockImplementationOnce(() => {
      started.resolve();
      return password.promise;
    });
    let pending;
    await act(async () => {pending = writeBackup(); await started.promise;});
    switchAccount('B');
    await act(async () => {password.resolve('other password'); await pending;});

    expectAborted();
    expect(mockRequestSeeds).not.toHaveBeenCalled();
  });

  it('rejects sign-out while the approving account is still in state', async () => {
    const nfc = deferred();
    const started = deferred();
    mockBeginNfc.mockImplementationOnce(() => {
      started.resolve();
      return nfc.promise;
    });
    let pending;
    await act(async () => {pending = writeBackup(); await started.promise;});
    mockState = {
      ...mockState,
      authentication: {...mockState.authentication, signedIn: false},
    };
    act(() => renderer.update(React.createElement(WalletBackupRequestInfo, props)));
    await act(async () => {nfc.resolve(true); await pending;});

    expectAborted();
    expect(mockRequestSeeds).not.toHaveBeenCalled();
  });

  it('does not cache preparation from a session that changed away and back', async () => {
    const backup = deferred();
    const started = deferred();
    mockBuildBackup.mockImplementationOnce(() => {
      started.resolve();
      return backup.promise;
    });
    let pending;
    await act(async () => {pending = writeBackup(); await started.promise;});
    switchAccount('B');
    switchAccount('A');
    await act(async () => {backup.resolve({mnemonic: 'stale backup'}); await pending;});

    expectAborted();
    // The wallet password typed before the switch no longer belongs to this session.
    props = {...props, walletPasswordTypedScope: captureSessionScope(mockState, 'A')};
    act(() => renderer.update(React.createElement(WalletBackupRequestInfo, props)));
    await act(async () => {await retryBackup();});
    expect(mockBuildBackup).toHaveBeenCalledTimes(2);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup.mock.calls[0][0]).toEqual({mnemonic: 'seed for A'});
    expect(mockMarkComplete).toHaveBeenCalledWith('A');
  });
});
