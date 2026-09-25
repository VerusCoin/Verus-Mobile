let mockState;
const mockAlert = jest.fn();
const mockRequestPassword = jest.fn();
const mockRequestSeeds = jest.fn();
const mockBuildBackup = jest.fn();
const mockBeginNfc = jest.fn();
const mockEndNfc = jest.fn();
const mockWriteBackup = jest.fn();
const mockMarkComplete = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockState},
}));
jest.mock('react-native', () => ({
  Keyboard: {dismiss: jest.fn()},
  Platform: {OS: 'android'},
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  Checkbox: {Item: 'CheckboxItem'},
  Menu: Object.assign(({children}) => children, {Item: 'MenuItem'}),
  Text: 'Text',
  TextInput: Object.assign(({children}) => children, {Icon: 'TextInputIcon'}),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: selector => selector(mockState),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0}),
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
jest.mock('../../keyGenerator/keyGenerator', () => ({}));
jest.mock('../../keepAwake/keepAwake', () => ({withKeepAwake: fn => fn()}));
jest.mock('../../keychain/keychain', () => ({
  getSupportedBiometryType: async () => ({biometry: false}),
}));
jest.mock('../../profile/createProfileFromSeed', () => ({}));
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
  beginWalletBackupNfcSession: mockBeginNfc,
  endWalletBackupNfcSession: mockEndNfc,
  writeWalletBackupToNfc: mockWriteBackup,
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {ELECTRUM} = require('../../constants/intervalConstants');
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
    props = {
      request: {isTestnet: () => false},
      detailIndex: 0,
      next: jest.fn().mockResolvedValue(),
    };
    await act(async () => {
      renderer = create(React.createElement(WalletBackupRequestInfo, props));
    });
  });

  afterEach(() => {
    act(() => renderer.unmount());
    consoleError.mockRestore();
  });

  const writeBackup = () => renderer.root.findAllByType('Button')
    .find(button => button.props.children === 'Write NFC Backup').props.onPress();

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
    expect(mockAlert).toHaveBeenCalledWith(
      'Backup Failed',
      expect.stringContaining('Account changed before the backup was written.'),
    );
    expect(mockEndNfc).toHaveBeenCalled();
  };

  it('writes and completes a backup for the unchanged approving account', async () => {
    await act(async () => {await writeBackup();});

    expect(mockWriteBackup).toHaveBeenCalledWith(
      {mnemonic: 'seed for A'},
      expect.objectContaining({beforeWrite: expect.any(Function)}),
    );
    expect(mockMarkComplete).toHaveBeenCalledWith('A');
    expect(props.next).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
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
    await act(async () => {await writeBackup();});
    expect(mockBuildBackup).toHaveBeenCalledTimes(2);
    expect(mockWriteBackup).toHaveBeenCalledTimes(1);
    expect(mockWriteBackup.mock.calls[0][0]).toEqual({mnemonic: 'seed for A'});
    expect(mockMarkComplete).toHaveBeenCalledWith('A');
  });
});
