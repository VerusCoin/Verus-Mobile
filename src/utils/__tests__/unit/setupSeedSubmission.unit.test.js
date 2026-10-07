const mockParseDlightSeed = jest.fn();
const mockAlert = jest.fn();
const mockGetKey = jest.fn();

jest.mock('react-native', () => ({
  Alert: {alert: mockAlert},
  Keyboard: {dismiss: jest.fn()},
  Platform: {OS: 'android'},
  ScrollView: 'ScrollView',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  View: 'View',
  TextInput: 'NativeTextInput',
}));
jest.mock('react-native-paper', () => ({
  Button: 'Button', Text: 'Text', TextInput: 'TextInput',
}));
jest.mock('react-native-elements', () => ({Input: 'Input'}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../globals/colors', () => ({}));
jest.mock('../../../components/Modal', () => 'Modal');
jest.mock('../../../components/StandardButton', () => 'StandardButton');
jest.mock('../../../components/ScanSeed', () => 'ScanSeed');
jest.mock('../../../components/AnimatedActivityIndicator', () => 'AnimatedActivityIndicator');
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));
jest.mock('../../keyGenerator/keyGenerator', () => ({getKey: mockGetKey}));
jest.mock('../../constants/constants', () => ({DEFAULT_SEED_PHRASE_LENGTH: 24}));
jest.mock('../../keys', () => ({
  parseDlightSeed: mockParseDlightSeed,
  isSeedPhrase: () => true,
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {DLIGHT_PRIVATE} = require('../../constants/intervalConstants');
const SetupSeedModal = require('../../../components/SetupSeedModal/SetupSeedModal').default;
const ImportSeed = require('../../../components/SetupSeedModal/ImportSeed/ImportSeed').default;
const CreateSeed = require('../../../components/SetupSeedModal/CreateSeed/CreateSeed').default;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {resolve = done; reject = fail;});
  return {promise, resolve, reject};
};

describe('seed setup submission sessions', () => {
  let renderer;
  let props;
  const generatedSeed = Array(24).fill('word').join(' ');

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetKey.mockResolvedValue(generatedSeed);
    mockParseDlightSeed.mockResolvedValue({});
    props = {
      visible: true,
      importOnly: true,
      channel: DLIGHT_PRIVATE,
      setSeed: jest.fn(),
      cancel: jest.fn(),
    };
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = null;
  });

  const mount = async () => {
    await act(async () => {renderer = create(React.createElement(SetupSeedModal, props));});
  };
  const setVisible = visible => {
    props = {...props, visible};
    act(() => renderer.update(React.createElement(SetupSeedModal, props)));
  };
  const importForm = () => renderer.root.findByType(ImportSeed).instance;
  const setImportedSeed = seed => {
    act(() => importForm().setState({seed}));
  };
  const importButton = () => renderer.root.findAllByType('Button')
    .find(button => button.props.children === 'Import');

  it('validates once for rapid taps and submits the captured validated seed once', async () => {
    await mount();
    setImportedSeed('first seed');
    const parsed = deferred();
    mockParseDlightSeed.mockReturnValueOnce(parsed.promise);
    let pending;
    await act(async () => {
      pending = importForm().verifySeed();
      await importForm().verifySeed();
    });
    expect(mockParseDlightSeed).toHaveBeenCalledTimes(1);
    expect(importButton().props.disabled).toBe(true);

    setImportedSeed('edited while validating');
    await act(async () => {parsed.resolve(); await pending;});
    await act(async () => {await importForm().verifySeed();});
    expect(props.setSeed).toHaveBeenCalledTimes(1);
    expect(props.setSeed).toHaveBeenCalledWith('first seed', DLIGHT_PRIVATE);
    expect(props.cancel).toHaveBeenCalledTimes(1);
    expect(mockParseDlightSeed).toHaveBeenCalledTimes(1);
  });

  it('releases failed validation so a corrected seed can be submitted', async () => {
    await mount();
    setImportedSeed('invalid seed');
    mockParseDlightSeed.mockRejectedValueOnce(new Error('invalid'));
    await act(async () => {await importForm().verifySeed();});
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(props.setSeed).not.toHaveBeenCalled();
    expect(importButton().props.disabled).toBe(false);

    setImportedSeed('corrected seed');
    await act(async () => {await importForm().verifySeed();});
    expect(mockParseDlightSeed).toHaveBeenCalledTimes(2);
    expect(props.setSeed).toHaveBeenCalledWith('corrected seed', DLIGHT_PRIVATE);
  });

  it.each(['resolve', 'reject'])('ignores an old validation that later %ss after cancel and reopen', async settle => {
    await mount();
    setImportedSeed('old seed');
    const oldParse = deferred();
    const newParse = deferred();
    mockParseDlightSeed.mockReturnValueOnce(oldParse.promise).mockReturnValueOnce(newParse.promise);
    let oldPending;
    await act(async () => {oldPending = importForm().verifySeed();});
    act(() => renderer.root.findByType('Modal').props.onRequestClose());
    await act(async () => {await importForm().verifySeed();});
    expect(mockParseDlightSeed).toHaveBeenCalledTimes(1);

    setVisible(false);
    setVisible(true);
    setImportedSeed('new seed');
    let newPending;
    await act(async () => {newPending = importForm().verifySeed();});
    expect(mockParseDlightSeed).toHaveBeenCalledTimes(2);
    await act(async () => {oldParse[settle](new Error('old result')); await oldPending;});
    expect(props.setSeed).not.toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();
    expect(importButton().props.disabled).toBe(true);

    await act(async () => {newParse.resolve(); await newPending;});
    expect(props.setSeed).toHaveBeenCalledTimes(1);
    expect(props.setSeed).toHaveBeenCalledWith('new seed', DLIGHT_PRIVATE);
    expect(props.cancel).toHaveBeenCalledTimes(2);
  });

  it('invalidates pending validation when the parent hides the modal', async () => {
    await mount();
    setImportedSeed('old seed');
    const parsed = deferred();
    mockParseDlightSeed.mockReturnValueOnce(parsed.promise);
    let pending;
    await act(async () => {pending = importForm().verifySeed();});
    setVisible(false);
    await act(async () => {parsed.resolve(); await pending;});
    expect(props.setSeed).not.toHaveBeenCalled();
    expect(props.cancel).not.toHaveBeenCalled();

    setVisible(true);
    await act(async () => {await importForm().verifySeed();});
    expect(props.setSeed).toHaveBeenCalledTimes(1);
  });

  it('invalidates validation when switching back to seed creation', async () => {
    props.importOnly = false;
    await mount();
    act(() => renderer.root.findByType(CreateSeed).props.importSeed());
    setImportedSeed('old seed');
    const parsed = deferred();
    mockParseDlightSeed.mockReturnValueOnce(parsed.promise);
    let pending;
    await act(async () => {pending = importForm().verifySeed();});
    act(() => renderer.root.findByType(ImportSeed).props.onBack());
    await act(async () => {parsed.resolve(); await pending;});
    expect(props.setSeed).not.toHaveBeenCalled();
    expect(props.cancel).not.toHaveBeenCalled();
    expect(renderer.root.findByType(CreateSeed).props.submittingSeed).toBe(false);
  });

  it('allows wrong-word retry and submits generated seeds once per visible session', async () => {
    props.importOnly = false;
    await mount();
    const form = renderer.root.findByType(CreateSeed).instance;
    act(() => form.setState({formStep: 4, wordGuesses: ['wrong', 'word', 'word']}));
    act(() => form.verifySeed());
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(props.setSeed).not.toHaveBeenCalled();

    act(() => form.setState({wordGuesses: ['word', 'word', 'word']}));
    act(() => {form.verifySeed(); form.verifySeed();});
    expect(props.setSeed).toHaveBeenCalledTimes(1);
    expect(props.setSeed).toHaveBeenCalledWith(generatedSeed, DLIGHT_PRIVATE);

    setVisible(false);
    setVisible(true);
    act(() => {form.verifySeed(); form.verifySeed();});
    expect(props.setSeed).toHaveBeenCalledTimes(2);
    expect(props.cancel).toHaveBeenCalledTimes(2);
  });
});
