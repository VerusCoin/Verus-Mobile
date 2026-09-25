jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  Clipboard: {setString: jest.fn()},
  Image: 'Image',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  Text: 'Text',
  Divider: 'Divider',
  List: {Section: 'Section', Accordion: 'Accordion', Item: 'Item'},
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../styles', () => ({__esModule: true, default: {}, verusIdObjectDataStyles: {}}));
jest.mock('../../../images/customIcons', () => ({}));
jest.mock('../../../components/AnimatedSuccessCheckmark', () => 'Checkmark');
jest.mock('../../linking', () => ({openUrl: jest.fn()}));
jest.mock('../../verusid/getVerusIdStatus', () => ({getVerusIdStatus: () => 'Active'}));
jest.mock('../../vdxf/vdxfTypeLabels', () => ({getVDXFKeyLabel: () => null}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {ContentMultiMapRemoveKey} = require('verus-typescript-primitives');
const VerusIdObjectData = require('../../../components/VerusIdObjectData').default;
const {VERUSID_CMM_INFO, VERUSID_CMM_DATA} = require('../../constants/verusidObjectData');

const KEY = 'iExistingContentKey';
const ROW_KEY = `${VERUSID_CMM_DATA.key}:${KEY}`;
const OLD_VALUES = '2 items (old-one, old-two)';
const identity = {
  name: 'Example',
  identityaddress: 'iExample',
  systemid: 'iSystem',
  primaryaddresses: [],
  contentmultimap: {[KEY]: ['old-one', 'old-two']},
};
const displayProps = {
  verusId: {identity},
  friendlyNames: {},
  hideUnchanged: true,
  showChangeBadges: true,
};

const text = node => node.findAllByType('Text').map(item => item.children.join('')).join(' ');
const cards = renderer => renderer.root.findAllByType('TouchableOpacity');
const renderUpdates = updates => {
  let renderer;
  act(() => {
    renderer = create(
      <VerusIdObjectData
        {...displayProps}
        updates={updates}
      />,
    );
  });
  return renderer;
};
const appendEntry = {data: 'new-one', rawData: ['new-one']};
const removalEntry = action => ({
  data: 'Remove requested values',
  rawData: [{[ContentMultiMapRemoveKey.vdxfid]: {version: 1, action, entrykey: KEY}}],
  removeMeta: {action, entryKey: KEY, entryLabel: 'Existing key', valueHash: '11'.repeat(32)},
});
const styleOf = node => Object.assign({}, ...[node.props.style].flat().filter(Boolean));

describe('identity content update review', () => {
  it.each([undefined, {}, {[VERUSID_CMM_INFO.key]: {}}])(
    'shows no content changes for omitted or empty updates (%p)', updates => {
      const renderer = renderUpdates(updates);
      expect(cards(renderer)).toHaveLength(0);
      renderer.unmount();
    },
  );

  it('shows existing values separately from values being appended', () => {
    const renderer = renderUpdates({[VERUSID_CMM_INFO.key]: {[ROW_KEY]: appendEntry}});
    const [card] = cards(renderer);

    expect(text(card)).toContain(`Existing ${OLD_VALUES}`);
    expect(text(card)).toContain('Add value new-one');
    expect(text(card)).not.toContain('Will remove');
    renderer.unmount();
  });

  it('refreshes review rows when only the requested updates change', () => {
    const renderer = renderUpdates({});
    const update = entries => act(() => renderer.update(
      <VerusIdObjectData {...displayProps} updates={{[VERUSID_CMM_INFO.key]: entries}} />,
    ));
    expect(cards(renderer)).toHaveLength(0);

    update({[ROW_KEY]: appendEntry});
    expect(cards(renderer)).toHaveLength(1);
    expect(text(cards(renderer)[0])).toContain('Add value new-one');

    update({[`${ROW_KEY}:remove:0`]: removalEntry(3)});
    expect(cards(renderer)).toHaveLength(1);
    expect(text(cards(renderer)[0])).toContain('Will remove');
    expect(text(cards(renderer)[0])).not.toContain('Add value');

    update({});
    expect(cards(renderer)).toHaveLength(0);
    renderer.unmount();
  });

  it.each([1, 2])('keeps all current values neutral for selective removal action %i', action => {
    const renderer = renderUpdates({
      [VERUSID_CMM_INFO.key]: {[`${ROW_KEY}:remove:0`]: removalEntry(action)},
    });
    const [card] = cards(renderer);
    const oldValues = card.findAllByType('Text').find(item => item.children.join('') === OLD_VALUES);

    expect(text(card)).toContain(`Current ${OLD_VALUES}`);
    expect(text(card)).toContain('matching value');
    expect(styleOf(oldValues).textDecorationLine).toBeUndefined();
    renderer.unmount();
  });

  it('strikes all current values when the entire key is removed', () => {
    const renderer = renderUpdates({
      [VERUSID_CMM_INFO.key]: {[`${ROW_KEY}:remove:0`]: removalEntry(3)},
    });
    const [card] = cards(renderer);
    const oldValues = card.findAllByType('Text').find(item => item.children.join('') === OLD_VALUES);

    expect(text(card)).toContain('All current values under Existing key');
    expect(styleOf(oldValues).textDecorationLine).toBe('line-through');
    renderer.unmount();
  });

  it('keeps removal and append rows for the same key visible together', () => {
    const renderer = renderUpdates({
      [VERUSID_CMM_INFO.key]: {
        [`${ROW_KEY}:remove:0`]: removalEntry(1),
        [ROW_KEY]: appendEntry,
      },
    });
    const renderedCards = cards(renderer);

    expect(renderedCards).toHaveLength(2);
    expect(renderedCards.some(card => text(card).includes('Will remove'))).toBe(true);
    expect(renderedCards.some(card => text(card).includes('Add value new-one'))).toBe(true);
    expect(renderedCards.every(card => text(card).includes(OLD_VALUES))).toBe(true);
    renderer.unmount();
  });

  it('shows clear-map scope without inventing a single-key current preview', () => {
    const renderer = renderUpdates({
      [VERUSID_CMM_INFO.key]: {
        [`${VERUSID_CMM_DATA.key}:clear-map:remove:0`]: {
          ...removalEntry(4),
          removeMeta: {action: 4},
          displayTitle: 'Current identity content',
        },
      },
    });
    const [card] = cards(renderer);

    expect(text(card)).toContain('Will clear');
    expect(text(card)).toContain('All current content keys and values');
    expect(text(card)).not.toContain(OLD_VALUES);
    renderer.unmount();
  });

  it('treats remove-shaped data under an ordinary key as an appended value', () => {
    const renderer = renderUpdates({
      [VERUSID_CMM_INFO.key]: {
        [ROW_KEY]: {data: 'Stored remove object', rawData: removalEntry(3).rawData},
      },
    });
    const [card] = cards(renderer);

    expect(text(card)).toContain('Add value');
    expect(text(card)).toContain(`Existing ${OLD_VALUES}`);
    expect(text(card)).not.toContain('Will remove');
    renderer.unmount();
  });
});
