jest.mock('react-native', () => ({
  Pressable: 'Pressable', View: 'View', ScrollView: 'ScrollView',
  StyleSheet: {create: value => value},
}));
jest.mock('react-native-paper', () => ({Text: 'Text'}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {PartialSignData} = require('verus-typescript-primitives');
const ContentStep = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/steps/ContentStep').default;
const {buildContentMultiMapRemoveUi} = require('../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/contentMultiMapRemoveUi');
const {VERUSID_CMM_DATA, VERUSID_CMM_INFO, VERUSID_PRIVATE_INFO, VERUSID_PRIVATE_ADDRESS} = require('../../constants/verusidObjectData');

const KEY = 'iCompleteUnrecognizedContentKeyAddress';
const ROW_KEY = `${VERUSID_CMM_DATA.key}:${KEY}`;
const identity = {identity: {privateaddress: 'zsCurrentAddressInFullWithoutAnyShortening', contentmultimap: {[KEY]: ['existing value']}}};
const textContent = node => typeof node === 'string' ? node : (node.children || []).map(textContent).join(' ');
const flattenStyle = style => Array.isArray(style) ? Object.assign({}, ...style.map(flattenStyle)) : style;
let views;
const mount = props => {
  let view;
  act(() => { view = create(<ContentStep subjectIdentity={identity} {...props} />); });
  views.push(view);
  return view;
};
const additions = entry => ({[VERUSID_CMM_INFO.key]: {[ROW_KEY]: {contentKey: KEY, ...entry}}});
beforeEach(() => { views = []; });
afterEach(() => act(() => views.forEach(view => view.unmount())));

test('shows complete partial-sign-data content on first render without opening the inspector', () => {
  const message = `Read every part of this request. ${'long content '.repeat(60)}End of message.`;
  const onPress = jest.fn();
  const view = mount({displayUpdates: additions({
    data: 'Partial sign data', signData: PartialSignData.fromCLIJson({message}), onPress,
  })});
  expect(textContent(view.root)).toContain(message);
  expect(textContent(view.root)).toContain(KEY);
  expect(textContent(view.root)).toContain('Add content');
  expect(textContent(view.root)).toContain('Public');
  expect(textContent(view.root)).toContain('Message');
  expect(onPress).not.toHaveBeenCalled();
  expect(view.root.findAllByType('ScrollView')).toHaveLength(0);
  view.root.findAllByType('Text').forEach(node => {
    expect(node.props.numberOfLines).toBeUndefined();
    expect(node.props.allowFontScaling).toBe(true);
  });
  expect(view.root.findAllByType('Text').find(node => textContent(node) === message).props.selectable).toBe(true);
  const action = view.root.findByType('Pressable');
  expect(action.props.accessibilityRole).toBe('button');
  expect(action.props.accessibilityLabel).toContain('technical details');
  expect(flattenStyle(action.props.style({pressed: false})).minHeight).toBeGreaterThanOrEqual(44);
  act(() => action.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('renders every added value, including nested fields and the full raw content key', () => {
  const view = mount({displayUpdates: additions({rawData: [
    {profile: {name: 'Alice Example', statement: 'I do not want to associate this statement with my identity.'}},
    {terms: ['First term', 'Second term'], approved: false},
  ]}), cmmDataKeys: {[KEY]: {label: 'Profile'}}});
  const text = textContent(view.root);
  ['Value 1 of 2', 'Value 2 of 2', 'Alice Example', 'I do not want to associate this statement with my identity.',
    'First term', 'Second term', 'false', 'Profile', 'profile › name', 'profile › statement', KEY]
    .forEach(value => expect(text).toContain(value));
});

test('keeps encrypted uploads separate from public additions and shows the full recipient', () => {
  const recipient = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
  const upload = PartialSignData.fromCLIJson({message: 'Encrypted upload body', encrypttoaddress: recipient});
  const view = mount({displayUpdates: {[VERUSID_CMM_INFO.key]: {
    upload: {contentKey: KEY, isEncrypted: true, signData: upload},
    public: {contentKey: 'iPublicKey', rawData: ['Public addition body']},
    credential: {contentKey: 'iCredentialKey', isEncryptedKey: true, rawData: [{opaque: 'aabb'}]},
  }}});
  const cards = view.root.findAllByProps({testID: 'identity-content-change'});
  expect(cards).toHaveLength(3);
  expect(textContent(cards[0])).toContain('Encrypted upload');
  expect(textContent(cards[0])).toContain('Encrypted upload body');
  expect(textContent(cards[0])).toContain(recipient);
  expect(textContent(cards[0]).indexOf('Encrypted upload body'))
    .toBeLessThan(textContent(cards[0]).indexOf('This upload will be encrypted'));
  expect(textContent(cards[1])).toContain('Public');
  expect(textContent(cards[1])).toContain('Public addition body');
  expect(textContent(cards[2])).toContain('Encrypted credential');
  expect(textContent(cards[2])).toContain('will be encrypted before it is added');
  expect(textContent(view.root)).not.toContain('Private request');
});

test.each([1, 2, 3, 4])('explains removal action %s inline with its scope, limitations and untruncated hash', action => {
  const hash = 'abcd'.repeat(16);
  const removeMeta = {action, entryKey: KEY, valueHash: hash};
  const removalUi = buildContentMultiMapRemoveUi({
    removeMeta, fallbackKey: KEY, currentContentMultiMap: identity.identity.contentmultimap,
    getKeyLabel: () => 'Profile',
  });
  const view = mount({displayUpdates: additions({removeMeta, removalUi, data: removalUi.summary})});
  const text = textContent(view.root);
  expect(text).toContain(removalUi.detailBody);
  expect(text).toContain(removalUi.effectNote);
  expect(text).toContain(removalUi.historyNote);
  expect(text).toContain(hash);
  if (action === 4) {
    expect(text).toContain('All identity content keys and values');
    expect(text).not.toContain('Target content key');
  } else {
    expect(text).toContain(KEY);
    expect(text).toContain('Target content key');
  }
});

test('keeps additions and removals in the same request visible together and explains their interaction', () => {
  const view = mount({displayUpdates: {[VERUSID_CMM_INFO.key]: {
    [ROW_KEY]: {contentKey: KEY, rawData: ['new value']},
    [`${ROW_KEY}:remove:0`]: {contentKey: KEY, removeMeta: {action: 3, entryKey: KEY}, data: 'Remove earlier values'},
  }}});
  const text = textContent(view.root);
  expect(text).toContain('new value');
  expect(text).toContain('Remove earlier values');
  expect(text).toContain('A removal can also affect values added in the same update.');
  expect(view.root.findAllByProps({testID: 'identity-content-change'})).toHaveLength(2);
});

test('shows the actual removal target and all supplied trailing removal data', () => {
  const view = mount({displayUpdates: additions({
    contentKey: 'iRemovalOperationKey', removeMeta: {action: 3, entryKey: KEY},
    data: 'Remove earlier values', rawData: [{removal: {action: 3, entrykey: KEY}, extra: 'Also published alongside the removal'}],
  })});
  const text = textContent(view.root);
  expect(text).toContain('Also published alongside the removal');
  expect(text).toContain(KEY);
  expect(text).not.toContain('iRemovalOperationKey');
});

test('shows unrecognized removal-key data without claiming it adds or removes current content', () => {
  const view = mount({displayUpdates: additions({
    unrecognizedRemoval: true,
    displayTitle: 'Unrecognized removal data',
    data: 'Unrecognized removal data',
    rawData: [{message: 'This statement will still be recorded.', metadata: {unfamiliarField: 'Also recorded'}}],
  })});
  const text = textContent(view.root);

  expect(text).toContain('Included data');
  expect(text).toContain('Unrecognized removal data');
  expect(text).toContain('This data uses the removal key but is not a recognized removal instruction. It will still be recorded in the update transaction.');
  expect(text).toContain('This statement will still be recorded.');
  expect(text).toContain('Also recorded');
  expect(text).toContain(KEY);
  expect(text).not.toContain('Add content');
  expect(text).not.toContain('Remove content');
});

test('does not describe ignored removal-key data as additions in a removal-only request', () => {
  const view = mount({displayUpdates: {[VERUSID_CMM_INFO.key]: {
    [`${ROW_KEY}:remove:0`]: {
      contentKey: KEY, removeMeta: {action: 3, entryKey: KEY}, data: 'Remove earlier values',
    },
    [`${ROW_KEY}:unrecognized`]: {
      contentKey: KEY, unrecognizedRemoval: true,
      displayTitle: 'Unrecognized removal data', rawData: [{message: 'Recorded data'}],
    },
  }}});
  const text = textContent(view.root);

  expect(text).toContain('Remove earlier values');
  expect(text).toContain('Recorded data');
  expect(text).toContain('Included data');
  expect(text).not.toContain('This request adds and removes content.');
  expect(view.root.findAllByProps({testID: 'identity-content-change'})).toHaveLength(2);
});

test('shows complete current and requested private addresses', () => {
  const requested = 'zsRequestedAddressInFullWithoutAnyShortening';
  const view = mount({displayUpdates: {[VERUSID_PRIVATE_INFO.key]: {
    [VERUSID_PRIVATE_ADDRESS.key]: {data: 'zsRequested…', rawData: requested},
  }}});
  expect(textContent(view.root)).toContain(identity.identity.privateaddress);
  expect(textContent(view.root)).toContain(requested);
  expect(textContent(view.root)).toContain('Current address');
  expect(textContent(view.root)).toContain('Requested address');
  expect(textContent(view.root)).not.toContain('zsRequested…');
});

test('warns about opaque data while retaining its full bytes inline', () => {
  const view = mount({displayUpdates: additions({rawData: [Buffer.from([0, 255, 0, 255])]})});
  const text = textContent(view.root);
  expect(text).toContain('00ff00ff');
  expect(text).toMatch(/cannot|binary|encoded|not.*readable/i);
  expect(text).toContain('On-chain history persists');
});

test.each([undefined, {}, {[VERUSID_CMM_INFO.key]: {}}])('omits the section when there are no content changes (%p)', displayUpdates => {
  expect(mount({displayUpdates}).toJSON()).toBeNull();
});
