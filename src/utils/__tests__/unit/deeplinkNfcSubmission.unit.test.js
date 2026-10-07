const mockDispatch = jest.fn();
const mockRead = jest.fn();
const mockCancel = jest.fn();
const mockOpenLoading = jest.fn();
const mockCloseLoading = jest.fn();
const mockAlert = jest.fn();
const mockResolveAlert = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {dispatch: mockDispatch},
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: mockAlert,
  resolveAlert: mockResolveAlert,
}));
jest.mock('../../../actions/actions/loadingModal/dispatchers/loadingModal', () => ({
  openLoadingModal: mockOpenLoading,
  closeLoadingModal: mockCloseLoading,
}));
jest.mock('../../walletBackup/walletBackupNfc', () => ({
  readDeeplinkUriFromNfc: mockRead,
  cancelWalletBackupNfcRequest: mockCancel,
  NFC_DEEPLINK_WALLET_BACKUP_DETECTED: 'NFC_DEEPLINK_WALLET_BACKUP_DETECTED',
}));

const {readDeeplinkFromNfc} = require('../../../actions/actions/deeplink/dispatchers/deeplinkNfc');
const {setDeeplinkUrl} = require('../../../actions/actions/deeplink/creators/deeplink');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {resolve = done; reject = fail;});
  return {promise, resolve, reject};
};

describe('NFC deeplink submission', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCancel.mockResolvedValue();
    mockAlert.mockResolvedValue(false);
  });

  it('shares one native read and dispatches one deeplink for same-tick repeat presses', async () => {
    const scan = deferred();
    mockRead.mockReturnValue(scan.promise);

    const first = readDeeplinkFromNfc();
    const repeated = readDeeplinkFromNfc();
    expect(repeated).toBe(first);
    await Promise.resolve();
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();

    scan.resolve('verus://fixture');
    await Promise.all([first, repeated]);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(setDeeplinkUrl('verus://fixture', {fromNfc: true}));
    expect(mockCloseLoading).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('cancels once, waits for cleanup before retry, and ignores stale cancel callbacks', async () => {
    const scan = deferred();
    const cleanup = deferred();
    mockRead.mockImplementationOnce(({onStatus}) => {
      onStatus('Tap card');
      return scan.promise;
    });
    mockCancel.mockReturnValueOnce(cleanup.promise);
    const first = readDeeplinkFromNfc();
    await Promise.resolve();
    const cancel = mockOpenLoading.mock.calls[0][2];

    cancel();
    cancel();
    scan.reject(new Error('Cancelled'));
    await Promise.resolve();
    expect(readDeeplinkFromNfc()).toBe(first);
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCloseLoading).toHaveBeenCalledTimes(1);

    cleanup.resolve();
    await first;
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();

    const retryScan = deferred();
    mockRead.mockReturnValueOnce(retryScan.promise);
    const retry = readDeeplinkFromNfc();
    await Promise.resolve();
    cancel();
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockRead).toHaveBeenCalledTimes(2);
    retryScan.resolve('verus://retry');
    await retry;
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('shows one failure prompt and permits a fresh scan after it is dismissed', async () => {
    const alert = deferred();
    const alertShown = deferred();
    mockRead.mockRejectedValueOnce(new Error('Read failed'));
    mockAlert.mockImplementationOnce(() => {
      alertShown.resolve();
      return alert.promise;
    });

    const first = readDeeplinkFromNfc();
    await alertShown.promise;
    expect(readDeeplinkFromNfc()).toBe(first);
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();

    alert.resolve(false);
    await first;
    mockRead.mockResolvedValueOnce('verus://retry');
    await readDeeplinkFromNfc();
    expect(mockRead).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps one backup-detected prompt and continues only the original caller once', async () => {
    const alert = deferred();
    const alertShown = deferred();
    const originalContinue = jest.fn();
    const duplicateContinue = jest.fn();
    mockRead.mockRejectedValueOnce(Object.assign(new Error('Wallet backup'), {
      code: 'NFC_DEEPLINK_WALLET_BACKUP_DETECTED',
    }));
    mockAlert.mockImplementationOnce(() => {
      alertShown.resolve();
      return alert.promise;
    });
    mockResolveAlert.mockImplementation(result => alert.resolve(result));

    const first = readDeeplinkFromNfc({onWalletBackupDetected: originalContinue});
    await alertShown.promise;
    expect(readDeeplinkFromNfc({onWalletBackupDetected: duplicateContinue})).toBe(first);
    const continueButton = mockAlert.mock.calls[0][2].find(button => button.text === 'Continue');
    continueButton.onPress();
    continueButton.onPress();
    await first;

    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(originalContinue).toHaveBeenCalledTimes(1);
    expect(duplicateContinue).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
