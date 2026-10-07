const mockCreateProfileFromSeed = jest.fn();
const mockOpenLoadingModal = jest.fn();
const mockCloseLoadingModal = jest.fn();
const mockCreateAlert = jest.fn();
const mockDispatch = jest.fn();
const mockState = {
  authentication: {accounts: []},
  coins: {activeCoinList: []},
};

jest.mock('react-redux', () => ({useDispatch: () => mockDispatch}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));
jest.mock('../../profile/createProfileFromSeed', () => ({
  createProfileFromSeed: (...args) => mockCreateProfileFromSeed(...args),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  openLoadingModal: (...args) => mockOpenLoadingModal(...args),
  closeLoadingModal: () => mockCloseLoadingModal(),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: (...args) => mockCreateAlert(...args),
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({children}) => children,
    Screen: ({children}) => children({navigation: {}}),
  }),
}));
jest.mock('../../../containers/Onboard/CreateProfile/Forms/ChooseName', () => 'ChooseName');
jest.mock('../../../containers/Onboard/CreateProfile/Forms/CreatePassword', () => 'CreatePassword');
jest.mock('../../../containers/Onboard/CreateProfile/Forms/UseBiometrics', () => 'UseBiometrics');
jest.mock('../../../containers/CreateWallet/CreateWallet', () => 'CreateWallet');
jest.mock('../../../containers/CreateWallet/Forms/CreateSeed/CreateSeed', () => 'CreateSeed');
jest.mock('../../../containers/CreateWallet/Forms/ImportWallet/ImportWallet', () => 'ImportWallet');
jest.mock('../../../containers/CreateWallet/Forms/WalletIntro', () => 'WalletIntro');

const React = require('react');
const {act, create} = require('react-test-renderer');
const CreateProfile = require('../../../containers/Onboard/CreateProfile/CreateProfile').default;
const CreateWallet = jest.requireActual('../../../containers/CreateWallet/CreateWallet').default;

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
  });

  const renderProfile = () => {
    act(() => { renderer = create(<CreateProfile navigation={{}} />); });
    act(() => {
      renderer.root.findByType('ChooseName').props.setProfileName('Import fixture');
      renderer.root.findByType('CreatePassword').props.setPassword('fixture password');
    });
    return renderer.root.findByType('CreateWallet').props.createProfile;
  };

  it('starts only one creation for repeated callbacks before the next render', async () => {
    const pending = deferred();
    mockCreateProfileFromSeed.mockReturnValue(pending.promise);
    const submit = renderProfile();
    let first;
    act(() => {
      first = submit('seed fixture', false, true);
      submit('seed fixture', false, true);
      submit('seed fixture', false, true);
    });

    expect(mockCreateProfileFromSeed).toHaveBeenCalledTimes(1);
    expect(mockCreateProfileFromSeed).toHaveBeenCalledWith(expect.objectContaining({
      profileName: 'Import fixture', password: 'fixture password',
      seed: 'seed fixture', includeDlightSeed: true,
    }));
    expect(mockOpenLoadingModal).toHaveBeenCalledTimes(1);
    expect(mockCloseLoadingModal).not.toHaveBeenCalled();

    await act(async () => { pending.resolve(); await first; });
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledWith('Profile created!', expect.any(String));
    expect(mockCloseLoadingModal).toHaveBeenCalledTimes(1);

    // A queued callback can outlive completion while navigation is changing.
    await act(async () => { await submit('seed fixture', false, true); });
    expect(mockCreateProfileFromSeed).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
  });

  it('allows a corrected seed to be retried after a failed attempt', async () => {
    const pending = deferred();
    mockCreateProfileFromSeed.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({});
    const submit = renderProfile();
    let first;
    act(() => { first = submit('invalid seed', false, false); });
    await act(async () => {
      pending.reject(new Error('Invalid seed'));
      await first;
    });
    expect(mockCloseLoadingModal).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledWith('Error', 'Invalid seed');

    await act(async () => { await submit('corrected seed', false, false); });
    expect(mockCreateProfileFromSeed).toHaveBeenCalledTimes(2);
    expect(mockCreateProfileFromSeed).toHaveBeenLastCalledWith(expect.objectContaining({
      seed: 'corrected seed',
    }));
    expect(mockCloseLoadingModal).toHaveBeenCalledTimes(2);
  });

  it.each(['generated seed', 'text import', 'NFC import'])(
    'keeps the %s completion promise pending through profile creation',
    async path => {
      const pending = deferred();
      const createProfile = jest.fn(() => pending.promise);
      act(() => { renderer = create(<CreateWallet navigation={{}} createProfile={createProfile} />); });
      act(() => {
        renderer.root.findByType('WalletIntro').props.setNewSeed('generated seed');
        renderer.root.findByType('ImportWallet').props.setImportedSeed('typed seed');
      });

      let result;
      if (path === 'generated seed') {
        result = renderer.root.findByType('CreateSeed').props.onComplete(true);
        expect(createProfile).toHaveBeenCalledWith('generated seed', false, true);
      } else if (path === 'text import') {
        result = renderer.root.findByType('ImportWallet').props.onComplete();
        expect(createProfile).toHaveBeenCalledWith('typed seed', false, false);
      } else {
        result = renderer.root.findByType('ImportWallet').props.onComplete('NFC seed', {useSeedAsZ: true});
        expect(createProfile).toHaveBeenCalledWith('NFC seed', false, true);
      }
      expect(result).toBe(pending.promise);
      pending.resolve();
      await result;
    },
  );
});
