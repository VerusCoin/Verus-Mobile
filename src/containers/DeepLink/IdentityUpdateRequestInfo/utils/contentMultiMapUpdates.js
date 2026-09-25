import {ContentMultiMapRemoveKey, fromBase58Check} from 'verus-typescript-primitives';

// The daemon executes removal objects only under the special outer remove key.
export const extractContentMultiMapRemoveMeta = (value, outerKey) => {
  // A CMM value can hold several VDXF objects. The daemon reads only the first
  // object when interpreting a removal instruction and ignores trailing bytes.
  value = Array.isArray(value) ? value[0] : value;
  if (outerKey !== ContentMultiMapRemoveKey.vdxfid ||
      value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.keys(value)[0] !== ContentMultiMapRemoveKey.vdxfid) return null;
  const topLevel = value[ContentMultiMapRemoveKey.vdxfid];
  if (topLevel == null || typeof topLevel !== 'object' || Array.isArray(topLevel)) return null;
  const nested = topLevel[ContentMultiMapRemoveKey.vdxfid];
  const payload = nested != null && typeof nested === 'object' && !Array.isArray(nested)
    ? nested : topLevel;
  const action = Number(payload.action);
  if (Number(payload.version ?? 1) !== 1 || ![1, 2, 3, 4].includes(action)) return null;
  if (action !== 4) {
    try {
      const {version, hash} = fromBase58Check(payload.entrykey);
      if (version !== 102 || !hash.some(byte => byte !== 0)) return null;
    } catch (e) {
      return null;
    }
    if (action !== 3 && (typeof payload.valuehash !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(payload.valuehash) || /^0+$/.test(payload.valuehash))) return null;
  }
  return {
    action,
    entryKey: action === 4 ? null : payload.entrykey,
    valueHash: action <= 2 ? payload.valuehash : null,
  };
};

export const splitContentMultiMapUpdates = (key, updates) => {
  const values = Array.isArray(updates) ? updates : updates == null ? [] : [updates];
  if (key !== ContentMultiMapRemoveKey.vdxfid) {
    return {removeEntries: [], nonRemoveUpdates: values};
  }
  return {
    removeEntries: values.map((update, index) => ({
      update, index, removeMeta: extractContentMultiMapRemoveMeta(update, key),
    })).filter(entry => entry.removeMeta != null),
    // Invalid instructions under this key are ignored by the daemon, not added.
    nonRemoveUpdates: [],
  };
};
