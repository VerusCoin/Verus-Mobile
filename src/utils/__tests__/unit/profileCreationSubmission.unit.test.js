const mockCreateProfileFromSeed = jest.fn();
const mockShowWalletSetup = jest.fn();
const mockFinishWalletSetup = jest.fn();
const mockFailWalletSetup = jest.fn();
const mockCloseWalletSetup = jest.fn();
const mockCreateAlert = jest.fn();
const mockDispatch = jest.fn();
const mockState = {
  authentication: {accounts: []},
  coins: {activeCoinList: []},
};

jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useDispatch: () => mockDispatch}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));
jest.mock('../../profile/createProfileFromSeed', () => ({
  createProfileFromSeed: (...args) => mockCreateProfileFromSeed(...args),
  getStartingCoinIds: () => [],
}));
// The wallet setup screen is an overlay that waits for its own paint.
jest.mock('../../../components/WalletSetup/walletSetupStore', () => ({
  showWalletSetup: (...args) => mockShowWalletSetup(...args),
  reportWalletSetupStep: jest.fn(),
  finishWalletSetup: (...args) => mockFinishWalletSetup(...args),
  failWalletSetup: (...args) => mockFailWalletSetup(...args),
  closeWalletSetup: (...args) => mockCloseWalletSetup(...args),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: (...args) => mockCreateAlert(...args),
}));
jest.mock('../../keychain/keychain', () => ({
  getSupportedBiometryType: jest.fn(() => Promise.resolve({biometry: null})),
}));
jest.mock('../../../containers/Onboard/CreateProfile/Forms/ChooseName', () => 'ChooseName');
jest.mock('../../../containers/Onboard/CreateProfile/Forms/CreatePassword', () => ({
  __esModule: true,
  default: 'CreatePassword',
  PasswordInfoButton: 'PasswordInfoButton',
}));
jest.mock('../../../containers/Onboard/CreateProfile/Forms/UseBiometrics', () => 'UseBiometrics');
jest.mock('../../../containers/CreateWallet/Forms/CreateSeed/Forms/SeedIntro', () => 'SeedIntro');
jest.mock('../../../containers/CreateWallet/Forms/CreateSeed/Forms/ShieldedAddressSetup', () => 'ShieldedAddressSetup');
jest.mock('../../../containers/CreateWallet/Forms/CreateSeed/Forms/SeedWords', () => ({
  __esModule: true,
  default: 'SeedWords',
  WORDS_PER_STEP: 6,
}));
jest.mock('../../../containers/CreateWallet/Forms/ImportWallet/Forms/ImportNfc', () => 'ImportNfc');
jest.mock('../../../containers/CreateWallet/Forms/ImportWallet/Forms/ImportSeed', () => 'ImportSeed');
jest.mock('../../../containers/CreateWallet/Forms/ImportWallet/Forms/ImportText', () => 'ImportText');
jest.mock('../../../components/ScanSeed', () => 'ScanSeed');

const React = require('react');
const {act, create} = require('react-test-renderer');
const CreateProfile = require('../../../containers/Onboard/CreateProfile/CreateProfile').default;

const VALID_24_WORD_SEED = `${'abandon '.repeat(23)}art`;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
};

describe('profile creation submissions', () => {
  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProfileFromSeed.mockReset();
    mockShowWalletSetup.mockResolvedValue();
    mockFinishWalletSetup.mockResolvedValue();
    mockFailWalletSetup.mockReturnValue(true);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
  });

  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
  const find = type => renderer.root.findByType(type);
  const mount = (params = {}) => {
    act(() => { renderer = create(<CreateProfile navigation={{goBack: jest.fn(), canGoBack: () => true}} route={{params}} />); });
  };
  const enterNameAndPassword = async () => {
    act(() => { find('ChooseName').props.setProfileName('Import fixture'); });
    act(() => { find('ChooseName').props.onNext(); });
    act(() => { find('CreatePassword').props.setPassword('fixture password'); });
    await act(async () => { await find('CreatePassword').props.onNext(); });
  };
  // A new wallet reaches the shielded address step through the phrase steps.
  const reachShieldedStep = async () => {
    mount();
    await enterNameAndPassword();
    act(() => { find('SeedIntro').props.onNext('seed fixture'); });
    act(() => { find('SeedWords').props.onComplete(); });
    return () => find('ShieldedAddressSetup').props.onComplete;
  };
  // A typed import reaches the creation call from the text step.
  const reachTextImport = async () => {
    mount({setupPath: 'import', importMethod: 'text'});
    await enterNameAndPassword();
    return seed => {
      act(() => { find('ImportText').props.setImportedSeed(seed); });
      return find('ImportText').props.onComplete;
    };
  };

  it('starts only one creation for repeated callbacks before the next render', async () => {
    const pending = deferred();
    mockCreateProfileFromSeed.mockReturnValue(pending.promise);
    const submit = (await reachShieldedStep())();
    let first;
    act(() => {
      first = submit(true);
      submit(true);
      submit(true);
    });
    await flush();

    expect(mockCreateProfileFromSeed).toHaveBeenCalledTimes(1);
    expect(mockCreateProfileFromSeed).toHaveBeenCalledWith(expect.objectContaining({
      profileName: 'Import fixture', password: 'fixture password',
      seed: 'seed fixture', includeDlightSeed: true,
    }));
    expect(mockShowWalletSetup).toHaveBeenCalledTimes(1);
    expect(mockFinishWalletSetup).not.toHaveBeenCalled();

    await act(async () => { pending.resolve(); await first; });
    expect(mockFinishWalletSetup).toHaveBeenCalledTimes(1);
    expect(mockFinishWalletSetup).toHaveBeenCalledWith({landOnHome: true});
    expect(mockFailWalletSetup).not.toHaveBeenCalled();

    // A queued callback can outlive completion while navigation is changing.
    await act(async () => { await submit(true); });
    expect(mockCreateProfileFromSeed).toHaveBeenCalledTimes(1);
    expect(mockFinishWalletSetup).toHaveBeenCalledTimes(1);
  });

  it('allows a corrected seed to be retried after a failed attempt', async () => {
    const pending = deferred();
    mockCreateProfileFromSeed.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({});
    const enterSeed = await reachTextImport();
    let first;
    const submitInvalid = enterSeed('invalid seed');
    act(() => { first = submitInvalid(); });
    await flush();
    await act(async () => {
      pending.reject(new Error('Invalid seed'));
      await first;
    });
    // The failure stays on the setup screen; Back returns to the seed step.
    expect(mockFailWalletSetup).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Import fixture was not created',
      message: 'The wallet could not be set up.',
    }));
    expect(mockFinishWalletSetup).not.toHaveBeenCalled();
    act(() => mockFailWalletSetup.mock.calls[0][0].onSecondary());
    expect(mockCloseWalletSetup).toHaveBeenCalledTimes(1);

    const submitCorrected = enterSeed('corrected seed');
    await act(async () => { await submitCorrected(); });
    expect(mockCreateProfileFromSeed).toHaveBeenCalledTimes(2);
    expect(mockCreateProfileFromSeed).toHaveBeenLastCalledWith(expect.objectContaining({
      seed: 'corrected seed',
    }));
    expect(mockFinishWalletSetup).toHaveBeenCalledTimes(1);
  });

  it.each(['generated seed', 'text import', 'NFC import'])(
    'keeps the %s completion promise pending through profile creation',
    async path => {
      const pending = deferred();
      mockCreateProfileFromSeed.mockReturnValue(pending.promise);

      let result;
      if (path === 'generated seed') {
        const submit = (await reachShieldedStep())();
        act(() => { result = submit(true); });
        await flush();
        expect(mockCreateProfileFromSeed).toHaveBeenCalledWith(expect.objectContaining({
          seed: 'seed fixture', testProfile: false, includeDlightSeed: true,
        }));
      } else if (path === 'text import') {
        const enterSeed = await reachTextImport();
        const submit = enterSeed('typed seed');
        act(() => { result = submit(); });
        await flush();
        expect(mockCreateProfileFromSeed).toHaveBeenCalledWith(expect.objectContaining({
          seed: 'typed seed', testProfile: false, includeDlightSeed: false,
        }));
      } else {
        // An NFC card is read first. A valid phrase then offers the shielded address.
        mount({setupPath: 'import', importMethod: 'nfc'});
        act(() => { find('ImportNfc').props.onComplete(VALID_24_WORD_SEED, {useSeedAsZ: true}); });
        await enterNameAndPassword();
        const submit = find('ShieldedAddressSetup').props.onComplete;
        act(() => { result = submit(true); });
        await flush();
        expect(mockCreateProfileFromSeed).toHaveBeenCalledWith(expect.objectContaining({
          seed: VALID_24_WORD_SEED, testProfile: false, includeDlightSeed: true,
        }));
      }
      let settled = false;
      result.then(() => { settled = true; });
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(settled).toBe(false);
      expect(mockFinishWalletSetup).not.toHaveBeenCalled();
      await act(async () => { pending.resolve(); await result; });
      expect(settled).toBe(true);
      expect(mockFinishWalletSetup).toHaveBeenCalledTimes(1);
    },
  );
});
