const mockAlert = jest.fn();
const mockBeginNfc = jest.fn();
const mockEndNfc = jest.fn();
const mockReadBackup = jest.fn();
const mockDecodeBackup = jest.fn();
const mockActivateKeepAwake = jest.fn();
const mockDeactivateKeepAwake = jest.fn();

jest.mock('react-native', () => ({
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
    jest.resetAllMocks();
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
    const scan = button('Scan NFC Backup').props.onPress;
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
    const scan = button('Scan NFC Backup').props.onPress;
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
    expect(renderer.root.findAllByType('ActivityIndicator')).toHaveLength(1);
    expect(mockDeactivateKeepAwake).not.toHaveBeenCalled();
    await act(async () => {await scan();});
    expect(mockBeginNfc).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith('fixture seed', {useSeedAsZ: true});

    await act(async () => {created.resolve(); await pending;});
    expect(renderer.root.findAllByType('ActivityIndicator')).toHaveLength(0);
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
  });

  it('blocks repeated decrypts and competing scans until profile creation completes', async () => {
    const staleScan = await prepareEncryptedImport();
    const created = deferred();
    const started = deferred();
    props.onComplete.mockImplementationOnce(() => {started.resolve(); return created.promise;});
    const decrypt = button('Decrypt and Import').props.onPress;
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
    expect(button('Decrypt and Import').props.disabled).toBe(true);
    expect(button('Scan Different Card').props.disabled).toBe(true);
    expect(button('Back').props.disabled).toBe(true);

    await act(async () => {created.resolve(); await pending;});
    expect(button('Decrypt and Import').props.disabled).toBe(false);
  });

  it('allows a corrected password retry after decryption fails', async () => {
    await prepareEncryptedImport();
    mockDecodeBackup.mockImplementationOnce(() => {throw new Error('wrong password');});

    await act(async () => {await button('Decrypt and Import').props.onPress();});
    expect(mockAlert).toHaveBeenCalledWith('Error', 'wrong password');
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(button('Decrypt and Import').props.disabled).toBe(false);

    act(() => renderer.root.findByType('TextInput').props.onChangeText('correct password'));
    await act(async () => {await button('Decrypt and Import').props.onPress();});
    expect(mockDecodeBackup).toHaveBeenLastCalledWith({
      walletBackupOrdinal: {encrypted: true}, password: 'correct password',
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it('releases the import gate after a failed NFC read or profile creation', async () => {
    mockReadBackup.mockRejectedValueOnce(new Error('card removed'));
    await act(async () => {await button('Scan NFC Backup').props.onPress();});
    expect(mockAlert).toHaveBeenCalledWith('NFC Import Failed', 'card removed');
    expect(props.onComplete).not.toHaveBeenCalled();

    props.onComplete.mockRejectedValueOnce(new Error('setup failed'));
    await act(async () => {await button('Scan NFC Backup').props.onPress();});
    expect(mockAlert).toHaveBeenCalledWith('Error', 'setup failed');

    await act(async () => {await button('Scan NFC Backup').props.onPress();});
    expect(mockReadBackup).toHaveBeenCalledTimes(3);
    expect(props.onComplete).toHaveBeenCalledTimes(2);
    expect(mockActivateKeepAwake).toHaveBeenCalledTimes(2);
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(2);
  });
});
