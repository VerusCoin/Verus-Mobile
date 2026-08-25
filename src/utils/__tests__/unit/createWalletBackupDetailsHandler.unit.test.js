const mockGetState = jest.fn();
const mockGetWalletBackupCompletionKey = jest.fn();
const mockHasCompletedWalletBackupRequest = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: mockGetState,
  },
}));

jest.mock('../../walletBackup/walletBackupCompletionStorage', () => ({
  getWalletBackupCompletionKey: mockGetWalletBackupCompletionKey,
  hasCompletedWalletBackupRequest: mockHasCompletedWalletBackupRequest,
}));

const {
  CreateWalletBackupDetails,
  CreateWalletBackupDetailsOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
} = require('verus-typescript-primitives');
const {
  handleCreateWalletBackupDetailsVDXFObject,
} = require('../../deeplink/handlers/createWalletBackupDetailsHandler');

const buildBackupDetail = () =>
  new CreateWalletBackupDetailsOrdinalVDXFObject({
    data: new CreateWalletBackupDetails({
      backupType: CreateWalletBackupDetails.NFC_NDEF_BACKUP,
    }),
  });

const buildSpendableKeyDetail = () =>
  new SpendableKeyDetailsOrdinalVDXFObject({
    data: new SpendableKeyDetails(),
  });

const buildRequest = ({details, testnet = true}) =>
  new GenericRequest({
    details,
    flags: testnet ? GenericRequest.FLAG_IS_TESTNET : GenericRequest.BASE_FLAGS,
  });

describe('create wallet backup details handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWalletBackupCompletionKey.mockReturnValue('completion-key');
    mockHasCompletedWalletBackupRequest.mockResolvedValue(false);
    mockGetState.mockReturnValue({
      authentication: {
        activeAccount: {
          accountHash: 'active-account-hash',
        },
        accounts: [
          {
            id: 'test-profile',
            testnetOverrides: {
              VRSC: true,
            },
          },
        ],
      },
      deeplink: {
        passthrough: {
          fromNfc: true,
        },
      },
    });
  });

  it('preempts combined NFC backup and spendable key requests when a matching profile exists', async () => {
    const backupDetail = buildBackupDetail();
    const request = buildRequest({
      details: [backupDetail, buildSpendableKeyDetail()],
      testnet: true,
    });

    const result = await handleCreateWalletBackupDetailsVDXFObject(
      request,
      new GenericResponse(),
      0,
    );

    expect(result.displayProps.showSpendableKeyBackupChoice).toBe(true);
  });

  it('does not preempt non-NFC requests', async () => {
    mockGetState.mockReturnValue({
      authentication: {
        activeAccount: {
          accountHash: 'active-account-hash',
        },
        accounts: [
          {
            id: 'test-profile',
            testnetOverrides: {
              VRSC: true,
            },
          },
        ],
      },
      deeplink: {
        passthrough: null,
      },
    });

    const backupDetail = buildBackupDetail();
    const request = buildRequest({
      details: [backupDetail, buildSpendableKeyDetail()],
      testnet: true,
    });

    const result = await handleCreateWalletBackupDetailsVDXFObject(
      request,
      new GenericResponse(),
      0,
    );

    expect(result.displayProps.showSpendableKeyBackupChoice).toBe(false);
  });

  it('does not preempt combined NFC requests without a matching profile', async () => {
    mockGetState.mockReturnValue({
      authentication: {
        activeAccount: {
          accountHash: 'active-account-hash',
        },
        accounts: [
          {
            id: 'mainnet-profile',
            testnetOverrides: {},
          },
        ],
      },
      deeplink: {
        passthrough: {
          fromNfc: true,
        },
      },
    });

    const backupDetail = buildBackupDetail();
    const request = buildRequest({
      details: [backupDetail, buildSpendableKeyDetail()],
      testnet: true,
    });

    const result = await handleCreateWalletBackupDetailsVDXFObject(
      request,
      new GenericResponse(),
      0,
    );

    expect(result.displayProps.showSpendableKeyBackupChoice).toBe(false);
  });
});
