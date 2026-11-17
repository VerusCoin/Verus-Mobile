const mockDispatch = jest.fn();
const mockRead = jest.fn();
const mockCancel = jest.fn();
const mockShowTap = jest.fn();
const mockCloseTap = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {dispatch: mockDispatch},
}));
jest.mock('../../../actions/actions/nfcTap/dispatchers/nfcTap', () => ({
  showNfcTap: mockShowTap,
  closeNfcTap: mockCloseTap,
}));
jest.mock('react-native-nfc-manager', () => ({NfcError: {}}));
jest.mock('../../walletBackup/walletBackupNfc', () => ({
  readDeeplinkUriFromNfc: mockRead,
  cancelWalletBackupNfcRequest: mockCancel,
  NFC_CANCELLED: 'NFC_CANCELLED',
  NFC_DEEPLINK_WALLET_BACKUP_DETECTED: 'NFC_DEEPLINK_WALLET_BACKUP_DETECTED',
  NFC_DISABLED: 'NFC_DISABLED',
  NFC_NO_VERUS_LINK: 'NFC_NO_VERUS_LINK',
  NFC_NO_WALLET_BACKUP: 'NFC_NO_WALLET_BACKUP',
  NFC_PHASE: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    DONE: 'done',
    RELEASE: 'release',
  },
  NFC_TAG_LOST: 'NFC_TAG_LOST',
  NFC_TIMEOUT: 'NFC_TIMEOUT',
}));

const {Platform} = require('react-native');
const {readDeeplinkFromNfc} = require('../../../actions/actions/deeplink/dispatchers/deeplinkNfc');
const {setDeeplinkUrl} = require('../../../actions/actions/deeplink/creators/deeplink');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {resolve = done; reject = fail;});
  return {promise, resolve, reject};
};

// Resolves with the first tap screen step of the given phase.
const stepShown = phase => {
  const shown = deferred();
  mockShowTap.mockImplementation(step => {
    if (step.phase === phase) shown.resolve(step);
  });
  return shown.promise;
};

const pressAction = (step, label) =>
  step.actions.find(action => action.label === label).onPress();

describe('NFC deeplink submission', () => {
  const platformOS = Platform.OS;

  beforeEach(() => {
    jest.resetAllMocks();
    mockCancel.mockResolvedValue();
  });

  afterEach(() => {
    Platform.OS = platformOS;
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
    expect(mockCloseTap).toHaveBeenCalledTimes(1);
    expect(mockShowTap).not.toHaveBeenCalledWith(expect.objectContaining({phase: 'failed'}));
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('cancels once, waits for cleanup before retry, and ignores stale cancel callbacks', async () => {
    // The in-app Cancel exists on Android; iOS uses the scan sheet's Cancel.
    Platform.OS = 'android';
    const scan = deferred();
    const cleanup = deferred();
    mockRead.mockReturnValueOnce(scan.promise);
    mockCancel.mockReturnValueOnce(cleanup.promise);
    const first = readDeeplinkFromNfc();
    await Promise.resolve();
    const cancel = mockShowTap.mock.calls[0][0].actions.find(action => action.cancel).onPress;

    cancel();
    cancel();
    scan.reject(new Error('Cancelled'));
    await Promise.resolve();
    expect(readDeeplinkFromNfc()).toBe(first);
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCloseTap).not.toHaveBeenCalled();

    cleanup.resolve();
    await first;
    expect(mockCloseTap).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockShowTap).not.toHaveBeenCalledWith(expect.objectContaining({phase: 'failed'}));

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

  it('shows one failure step and permits a fresh scan after it is closed', async () => {
    mockRead.mockRejectedValueOnce(new Error('Read failed'));
    const failedStep = stepShown('failed');

    const first = readDeeplinkFromNfc();
    const step = await failedStep;
    expect(readDeeplinkFromNfc()).toBe(first);
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(step.title).toBe('Card not read');
    expect(mockCancel).not.toHaveBeenCalled();

    pressAction(step, 'Cancel');
    pressAction(step, 'Cancel');
    await first;
    expect(mockCloseTap).toHaveBeenCalledTimes(1);

    mockRead.mockResolvedValueOnce('verus://retry');
    await readDeeplinkFromNfc();
    expect(mockRead).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps one backup-detected step and continues only the original caller once', async () => {
    const originalContinue = jest.fn();
    const duplicateContinue = jest.fn();
    mockRead.mockRejectedValueOnce(Object.assign(new Error('Wallet backup'), {
      code: 'NFC_DEEPLINK_WALLET_BACKUP_DETECTED',
    }));
    const noticeStep = stepShown('notice');

    const first = readDeeplinkFromNfc({onWalletBackupDetected: originalContinue});
    const step = await noticeStep;
    expect(readDeeplinkFromNfc({onWalletBackupDetected: duplicateContinue})).toBe(first);
    pressAction(step, 'Restore wallet');
    pressAction(step, 'Restore wallet');
    await first;

    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(originalContinue).toHaveBeenCalledTimes(1);
    expect(duplicateContinue).not.toHaveBeenCalled();
    expect(mockCloseTap).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
