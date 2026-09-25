import {ContentMultiMap, ContentMultiMapRemoveKey, DATA_TYPE_STRING} from 'verus-typescript-primitives';
import {
  extractContentMultiMapRemoveMeta,
  splitContentMultiMapUpdates,
} from '../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/contentMultiMapUpdates';

const removeKey = ContentMultiMapRemoveKey.vdxfid;
const targetKey = DATA_TYPE_STRING.vdxfid;
const hash = 'ab'.repeat(32);
const removal = action => ({[removeKey]: {
  version: 1, action, entrykey: targetKey, valuehash: hash,
}});

describe('identity content update operations', () => {
  it.each([undefined, null, []])('does not infer deletion from absent/empty values: %s', values => {
    expect(splitContentMultiMapUpdates(targetKey, values)).toEqual({removeEntries: [], nonRemoveUpdates: []});
  });

  it('keeps ordinary values and duplicates as additions', () => {
    const values = [{[targetKey]: 'new'}, {[targetKey]: 'new'}];
    expect(splitContentMultiMapUpdates(targetKey, values)).toEqual({removeEntries: [], nonRemoveUpdates: values});
  });

  it('treats a removal-shaped value under an ordinary outer key as added data', () => {
    const values = [removal(4)];
    expect(splitContentMultiMapUpdates(targetKey, values)).toEqual({removeEntries: [], nonRemoveUpdates: values});
    expect(extractContentMultiMapRemoveMeta(values[0], targetKey)).toBeNull();
  });

  it.each([1, 2, 3, 4])('recognizes action %s in the parsed transaction delta', action => {
    const map = ContentMultiMap.fromJson({[removeKey]: [removal(action)]});
    const parsed = new ContentMultiMap();
    parsed.fromBuffer(map.toBuffer(), 0, true);
    const {removeEntries, nonRemoveUpdates} = splitContentMultiMapUpdates(removeKey, parsed.toJson()[removeKey]);
    expect(nonRemoveUpdates).toEqual([]);
    expect(removeEntries).toHaveLength(1);
    expect(removeEntries[0].removeMeta).toEqual({
      action,
      entryKey: action === 4 ? null : targetKey,
      valueHash: action <= 2 ? hash : null,
    });
  });

  it('keeps every removal and same-key addition separate regardless of source key order', () => {
    const additions = [{[targetKey]: 'new'}];
    const removals = [removal(1), removal(3), removal(4)];
    for (const entries of [
      [[removeKey, removals], [targetKey, additions]],
      [[targetKey, additions], [removeKey, removals]],
    ]) {
      const operations = entries.map(([key, values]) => splitContentMultiMapUpdates(key, values));
      expect(operations.flatMap(x => x.removeEntries).map(x => x.removeMeta.action)).toEqual([1, 3, 4]);
      expect(operations.flatMap(x => x.nonRemoveUpdates)).toEqual(additions);
    }
  });

  it.each([true, false])('executes removal only when it is the first object in a value (first: %s)', removeFirst => {
    const remove = removal(4);
    const extra = {[targetKey]: 'extra data'};
    const value = removeFirst ? {...remove, ...extra} : {...extra, ...remove};
    const map = ContentMultiMap.fromJson({[removeKey]: [value]});
    const parsed = new ContentMultiMap();
    parsed.fromBuffer(map.toBuffer(), 0, true);
    const operations = splitContentMultiMapUpdates(removeKey, parsed.toJson()[removeKey]);
    expect(operations.removeEntries).toHaveLength(removeFirst ? 1 : 0);
    if (removeFirst) expect(operations.removeEntries[0].removeMeta.action).toBe(4);
    expect(operations.nonRemoveUpdates).toEqual([]);
  });

  it.each([
    {version: 1, action: 0},
    {version: 1, action: 5},
    {version: 2, action: 4},
    {version: 1, action: 3, entrykey: 'invalid'},
    {version: 1, action: 1, entrykey: targetKey, valuehash: '00'.repeat(32)},
    {version: 1, action: 2, entrykey: targetKey, valuehash: 'ab'},
  ])('does not present invalid deletion instructions as additions or removals: %s', payload => {
    expect(splitContentMultiMapUpdates(removeKey, [{[removeKey]: payload}]))
      .toEqual({removeEntries: [], nonRemoveUpdates: []});
  });
});
