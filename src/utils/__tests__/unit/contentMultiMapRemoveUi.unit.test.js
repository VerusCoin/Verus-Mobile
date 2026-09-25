import {buildContentMultiMapRemoveUi} from '../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/contentMultiMapRemoveUi';

const buildRemoveUi = (action, overrides = {}) => buildContentMultiMapRemoveUi({
  removeMeta: {action, entryKey: 'target', valueHash: '0123456789abcdef'},
  currentContentMultiMap: {target: ['first', 'second'], other: 'third'},
  getKeyLabel: key => key === 'target' ? 'Vdxf Profile' : key,
  definedKeyVdxfId: 'metadata',
  ...overrides,
});

describe('content multimap removal review', () => {
  it('describes action 1 as one hash-matching instance, without inferring a match from the value count', () => {
    const ui = buildRemoveUi(1);
    expect(ui.summary).toBe('Remove one current matching value under VDXF Profile');
    expect(ui.detailBody).toContain('whose hash matches the requested hash, if any');
    expect(ui.effectNote).toContain('If a matching value is found, one instance is removed');
    expect(ui.effectNote).toContain('Other values are not removed');
    expect(ui.valueHashNote).toContain('0123456789...');
    expect(ui.currentValueCount).toBe(2);
  });

  it('describes action 2 as removing all matching values, conditionally', () => {
    const ui = buildRemoveUi(2);
    expect(ui.summary).toBe('Remove all current matching values under VDXF Profile');
    expect(ui.detailBody).toContain('whose hash matches the requested hash, if any');
    expect(ui.effectNote).toContain('If matching values are found, all of them are removed');
    expect(ui.effectNote).toContain('Nonmatching values are not removed');
  });

  it('describes action 3 as removing prior values under the target key without promising an empty result', () => {
    const ui = buildRemoveUi(3);
    expect(ui.targetKey).toBe('target');
    expect(ui.currentValueCount).toBe(2);
    expect(ui.detailBody).toContain('all values under VDXF Profile accumulated before it is processed');
    expect(ui.effectNote).toContain('may also add values under this key');
    expect(ui.effectNote).toContain('may still contain content afterward');
  });

  it('describes action 4 as clearing prior content and counts all keys and scalar or array values', () => {
    const ui = buildRemoveUi(4);
    expect(ui.targetKey).toBeNull();
    expect(ui.currentKeyCount).toBe(2);
    expect(ui.currentValueCount).toBe(3);
    expect(ui.detailBody).toContain('all identity content keys and values accumulated before it is processed');
    expect(ui.effectNote).toContain('may not be empty afterward');
    expect(ui.highRiskWarning).toContain('may also add content');
  });

  it.each([0, 5, -1, undefined, '1'])('does not present unknown action %s as removal of one value', action => {
    expect(buildRemoveUi(action)).toBeNull();
  });

  it('does not build a removal review without removal metadata', () => {
    expect(buildRemoveUi(1, {removeMeta: null})).toBeNull();
  });

  it.each([1, 2, 3])('reports no current target values for action %s even when other keys have content', action => {
    const ui = buildRemoveUi(action, {currentContentMultiMap: {other: ['unrelated']}});
    expect(ui.currentValueCount).toBe(0);
    expect(ui.isNoOp).toBe(true);
    expect(ui.emptyStateNote).toContain('No current values were found under this key');
  });

  it('reports an empty map for action 4', () => {
    const ui = buildRemoveUi(4, {currentContentMultiMap: {}});
    expect(ui.isNoOp).toBe(true);
    expect(ui.currentKeyCount).toBe(0);
    expect(ui.currentValueCount).toBe(0);
    expect(ui.emptyStateNote).toContain('No current content was found');
  });

  it.each([1, 2, 3, 4])('preserves the history note for action %s', action => {
    expect(buildRemoveUi(action).historyNote)
      .toBe('Earlier on-chain versions may still be publicly retrievable.');
  });

  it('uses the fallback target and retains the metadata consequence note', () => {
    const ui = buildRemoveUi(3, {
      removeMeta: {action: 3},
      fallbackKey: 'metadata',
      currentContentMultiMap: {metadata: 'definition'},
    });
    expect(ui.targetKey).toBe('metadata');
    expect(ui.currentValueCount).toBe(1);
    expect(ui.isMetadataTarget).toBe(true);
    expect(ui.metadataNote).toContain('harder for apps to label or interpret');
  });
});
