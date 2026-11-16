const mockAlert = jest.fn();
const mockBeginNfc = jest.fn();
const mockEndNfc = jest.fn();
const mockReadBackup = jest.fn();
const mockDecodeBackup = jest.fn();
const mockActivateKeepAwake = jest.fn();
const mockDeactivateKeepAwake = jest.fn();
const mockBackListeners = new Set();

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  // The Android Back button. A listener that returns true consumes the press.
  BackHandler: {addEventListener: (_event, listener) => {
    mockBackListeners.add(listener);
    return {remove: () => mockBackListeners.delete(listener)};
  }},
  Keyboard: {dismiss: jest.fn()},
  SafeAreaView: 'SafeAreaView',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Button: 'Button',
  Text: 'Text',
  TextInput: Object.assign(
    props => require('react').createElement('TextInput', props),
    {Icon: 'TextInputIcon'},
  ),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-reanimated', () => ({...require('react-native-reanimated/mock'), useReducedMotion: () => true}));
jest.mock('react-native-svg', () => ({__esModule: true, default: 'Svg', Circle: 'Circle', G: 'G', Path: 'Path'}));
jest.mock('../../../components/SafeBottomActionStack', () => 'SafeBottomActionStack');
jest.mock('../../../components/WalletAvatar', () => 'WalletAvatar');
jest.mock('../../CoinData/Graphics', () => ({AssetCoinLogo: 'AssetCoinLogo'}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: mockAlert,
}));
jest.mock('../../../globals/colors', () => ({}));
jest.mock('../../walletBackup/walletBackup', () => ({
  isValid24WordBip39Mnemonic: () => true,
  walletBackupOrdinalToMnemonic: mockDecodeBackup,
  walletBackupRequiresPassword: backup => backup.encrypted,
}));
jest.mock('../../walletBackup/walletBackupNfc', () => ({
  ...jest.requireActual('../../walletBackup/walletBackupNfc'),
  beginWalletBackupNfcSession: mockBeginNfc,
  endWalletBackupNfcSession: mockEndNfc,
  readWalletBackupFromNfc: mockReadBackup,
}));
jest.mock('../../keepAwake/keepAwake', () => ({
  activateKeepAwake: mockActivateKeepAwake,
  deactivateKeepAwake: mockDeactivateKeepAwake,
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const ImportNfc = require('../../../containers/CreateWallet/Forms/ImportWallet/Forms/ImportNfc').default;
const NfcTapView = require('../../../components/NfcTap/NfcTapView').default;
const WalletSetupOverlay = require('../../../components/WalletSetup/WalletSetupOverlay').default;
const {closeWalletSetup, markWalletSetupShown, showWalletSetup} = require('../../../components/WalletSetup/walletSetupStore');

const deferred = () => {
  let resolve;
  const promise = new Promise(done => {resolve = done;});
  return {promise, resolve};
};

describe('NFC import submission', () => {
  let renderer;
  let props;
  let consoleError;

  beforeEach(() => {
    // Reset only this test's mocks; resetAllMocks would also clear the shared
    // native mocks (safe-area insets, AccessibilityInfo).
    [mockAlert, mockBeginNfc, mockEndNfc, mockReadBackup, mockDecodeBackup, mockActivateKeepAwake, mockDeactivateKeepAwake]
      .forEach(mock => mock.mockReset());
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockBeginNfc.mockResolvedValue(true);
    mockEndNfc.mockResolvedValue();
    mockReadBackup.mockResolvedValue({encrypted: false});
    mockDecodeBackup.mockReturnValue('fixture seed');
    props = {
      navigation: {goBack: jest.fn()},
      setImportedSeed: jest.fn(),
      onComplete: jest.fn().mockResolvedValue(),
    };
    act(() => {renderer = create(React.createElement(ImportNfc, props));});
  });

  afterEach(() => {
    act(() => renderer.unmount());
    consoleError.mockRestore();
  });

  const button = label => renderer.root.findAllByType('Button')
    .find(item => item.props.children === label);

  const prepareEncryptedImport = async () => {
    mockReadBackup.mockResolvedValueOnce({encrypted: true});
    const scan = button('Scan NFC backup').props.onPress;
    await act(async () => {await scan();});
    act(() => renderer.root.findByType('TextInput').props.onChangeText('backup password'));
    return scan;
  };

  it('runs one scan and remains busy through unencrypted profile creation', async () => {
    const read = deferred();
    const created = deferred();
    const started = deferred();
    mockReadBackup.mockReturnValueOnce(read.promise);
    props.onComplete.mockImplementationOnce(() => {started.resolve(); return created.promise;});
    const scan = button('Scan NFC backup').props.onPress;
    let pending;
    await act(async () => {
      pending = scan();
      await scan();
    });
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(mockReadBackup).toHaveBeenCalledTimes(1);

    await act(async () => {
      read.resolve({encrypted: false});
      await started.promise;
    });
    // The NFC tap step stays up while the profile is created.
    expect(renderer.root.findAllByType(NfcTapView)).toHaveLength(1);
    expect(mockDeactivateKeepAwake).not.toHaveBeenCalled();
    await act(async () => {await scan();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith('fixture seed', {useSeedAsZ: true});

    await act(async () => {created.resolve(); await pending;});
    expect(renderer.root.findAllByType(NfcTapView)).toHaveLength(0);
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
  });

  it('blocks repeated decrypts and competing scans until profile creation completes', async () => {
    const staleScan = await prepareEncryptedImport();
    const created = deferred();
    const started = deferred();
    props.onComplete.mockImplementationOnce(() => {started.resolve(); return created.promise;});
    const decrypt = button('Decrypt and import').props.onPress;
    let pending;
    await act(async () => {
      pending = decrypt();
      await decrypt();
      await staleScan();
      await started.promise;
    });
    expect(mockDecodeBackup).toHaveBeenCalledTimes(1);
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(button('Decrypt and import').props.disabled).toBe(true);
    expect(button('Scan different card').props.disabled).toBe(true);

    await act(async () => {created.resolve(); await pending;});
    expect(button('Decrypt and import').props.disabled).toBe(false);
  });

  it('covers the setup screen and consumes Back while the imported profile is created', async () => {
    // CreateProfile creates the profile from the NFC seed behind the root
    // wallet setup screen, which replaces the import screen's Back control.
    const created = deferred();
    const started = deferred();
    props.onComplete.mockImplementationOnce(async () => {
      const shown = showWalletSetup({walletName: 'Card wallet', walletAvatar: null, restoring: true, biometryName: null, coins: []});
      markWalletSetupShown();
      await shown;
      started.resolve();
      await created.promise;
    });
    let overlay;
    act(() => {overlay = create(React.createElement(WalletSetupOverlay));});
    expect(overlay.toJSON()).toBeNull();
    await prepareEncryptedImport();
    let pending;
    await act(async () => {
      pending = button('Decrypt and import').props.onPress();
      await started.promise;
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(overlay.root.findAll(node => node.props.accessibilityViewIsModal === true).length).toBeGreaterThan(0);
    expect(mockBackListeners.size).toBe(1);
    expect([...mockBackListeners].map(listener => listener())).toEqual([true]);
    expect(props.navigation.goBack).not.toHaveBeenCalled();

    await act(async () => {created.resolve(); await pending; closeWalletSetup();});
    expect(overlay.toJSON()).toBeNull();
    expect(mockBackListeners.size).toBe(0);
    act(() => overlay.unmount());
  });

  it('allows a corrected password retry after decryption fails', async () => {
    await prepareEncryptedImport();
    mockDecodeBackup.mockImplementationOnce(() => {throw new Error('wrong password');});

    await act(async () => {await button('Decrypt and import').props.onPress();});
    expect(mockAlert).toHaveBeenCalledWith('Error', 'wrong password');
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(button('Decrypt and import').props.disabled).toBe(false);

    act(() => renderer.root.findByType('TextInput').props.onChangeText('correct password'));
    await act(async () => {await button('Decrypt and import').props.onPress();});
    expect(mockDecodeBackup).toHaveBeenLastCalledWith({
      walletBackupOrdinal: {encrypted: true}, password: 'correct password',
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it('releases the import gate after a failed NFC read or profile creation', async () => {
    mockReadBackup.mockRejectedValueOnce(new Error('card removed'));
    await act(async () => {await button('Scan NFC backup').props.onPress();});
    // A failed read stays on the NFC tap step with Try again.
    expect(renderer.root.findAllByType(NfcTapView)[0].props.detail).toBe('card removed');
    expect(mockAlert).not.toHaveBeenCalled();
    expect(props.onComplete).not.toHaveBeenCalled();

    props.onComplete.mockRejectedValueOnce(new Error('setup failed'));
    await act(async () => {await button('Try again').props.onPress();});
    expect(mockAlert).toHaveBeenCalledWith('Error', 'setup failed');

    await act(async () => {await button('Scan NFC backup').props.onPress();});
    expect(mockReadBackup).toHaveBeenCalledTimes(3);
    expect(props.onComplete).toHaveBeenCalledTimes(2);
    expect(mockActivateKeepAwake).toHaveBeenCalledTimes(2);
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(2);
  });
});
