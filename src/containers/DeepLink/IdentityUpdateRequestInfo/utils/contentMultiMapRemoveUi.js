/*
  contentMultiMapRemoveUi 
  - Builds user-facing labels and detail text for content multimap remove actions.
  - Keeps current identity visibility separate from historical on-chain availability.
*/

export const normalizeContentMultiMapValues = value => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const getTotalCurrentValueCount = currentContentMultiMap => {
  if (!currentContentMultiMap || typeof currentContentMultiMap !== 'object') return 0;

  return Object.values(currentContentMultiMap).reduce(
    (count, value) => count + normalizeContentMultiMapValues(value).length,
    0,
  );
};

const formatDisplayLabel = label => {
  if (typeof label !== 'string') return label;
  if (label.startsWith('Vdxf ')) return `VDXF${label.slice(4)}`;
  return label;
};

export const buildContentMultiMapRemoveUi = ({
  removeMeta,
  fallbackKey,
  currentContentMultiMap,
  getKeyLabel,
  definedKeyVdxfId,
}) => {
  if (!removeMeta) return null;

  const currentMap =
    currentContentMultiMap && typeof currentContentMultiMap === 'object'
      ? currentContentMultiMap
      : {};
  const targetKey = removeMeta.action === 4 ? null : (removeMeta.entryKey || fallbackKey);
  const rawTargetLabel = targetKey ? getKeyLabel(targetKey) : 'Current identity content';
  const targetLabel = formatDisplayLabel(rawTargetLabel);
  const currentValueCount = targetKey
    ? normalizeContentMultiMapValues(currentMap[targetKey]).length
    : getTotalCurrentValueCount(currentMap);
  const currentKeyCount = Object.keys(currentMap).length;
  const isNoOp = removeMeta.action === 4 ? currentKeyCount === 0 : currentValueCount === 0;
  const isMetadataTarget = targetKey === definedKeyVdxfId;
  const historyNote = 'Earlier on-chain versions may still be publicly retrievable.';
  const metadataNote = isMetadataTarget
    ? 'This request targets metadata that describes app-specific keys. Removing it may make related identity content harder for apps to label or interpret.'
    : null;
  const valueHashNote = typeof removeMeta.valueHash === 'string' && removeMeta.valueHash.length > 0
    ? `This request targets values matching hash ${removeMeta.valueHash.slice(0, 10)}...`
    : null;

  // Codex GPT-5: keep remove-action wording tied to current-state visibility, not permanence.
  switch (removeMeta.action) {
    case 4:
      return {
        summary: isNoOp ? 'No current identity content found' : 'Clear all current identity content',
        modalTitle: 'Clear current identity content',
        detailTitle: 'Clear current identity content',
        detailBody: 'This request clears all current content keys and values from your identity.',
        effectNote: 'Apps that read your current identity content will no longer receive any of these entries after you confirm.',
        emptyStateNote: isNoOp
          ? 'No current content was found on this identity. Confirming this request may have no visible effect.'
          : null,
        historyNote,
        metadataNote,
        valueHashNote,
        targetKey,
        targetLabel,
        currentValueCount,
        currentKeyCount,
        isMetadataTarget,
        isNoOp,
        actionLabel: 'Will clear',
        currentLabel: 'Current',
        displayTitle: 'Current identity content',
        highRiskWarning: 'This request removes all current content keys and values from your identity. Apps that read your current identity content will no longer receive them after you confirm. Earlier on-chain versions may still be publicly retrievable.',
      };
    case 3:
      return {
        summary: isNoOp ? `No current values found under ${targetLabel}` : `Remove all current values under ${targetLabel}`,
        modalTitle: `Remove ${targetLabel}`,
        detailTitle: `Remove ${targetLabel}`,
        detailBody: `This request removes all current values under ${targetLabel} from your identity.`,
        effectNote: 'Apps that read your current identity content will no longer receive these values after you confirm.',
        emptyStateNote: isNoOp
          ? 'No current values were found under this key. Confirming this request may have no visible effect.'
          : null,
        historyNote,
        metadataNote,
        valueHashNote,
        targetKey,
        targetLabel,
        currentValueCount,
        currentKeyCount,
        isMetadataTarget,
        isNoOp,
        actionLabel: 'Will remove',
        currentLabel: 'Current',
        displayTitle: targetLabel,
      };
    case 2:
      return {
        summary: `Remove all current matching values under ${targetLabel}`,
        modalTitle: `Remove matching values from ${targetLabel}`,
        detailTitle: `Remove matching values from ${targetLabel}`,
        detailBody: `This request removes all current matching values under ${targetLabel} from your identity.`,
        effectNote: 'Apps that read your current identity content will no longer receive the matching values after you confirm.',
        emptyStateNote: null,
        historyNote,
        metadataNote,
        valueHashNote,
        targetKey,
        targetLabel,
        currentValueCount,
        currentKeyCount,
        isMetadataTarget,
        isNoOp,
        actionLabel: 'Will remove',
        currentLabel: 'Current',
        displayTitle: targetLabel,
      };
    case 1:
    default:
      return {
        summary: `Remove one current value under ${targetLabel}`,
        modalTitle: `Remove a value from ${targetLabel}`,
        detailTitle: `Remove a value from ${targetLabel}`,
        detailBody: `This request removes one current value under ${targetLabel} from your identity.`,
        effectNote: 'Apps that read your current identity content will no longer receive that value after you confirm.',
        emptyStateNote: null,
        historyNote,
        metadataNote,
        valueHashNote,
        targetKey,
        targetLabel,
        currentValueCount,
        currentKeyCount,
        isMetadataTarget,
        isNoOp,
        actionLabel: 'Will remove',
        currentLabel: 'Current',
        displayTitle: targetLabel,
      };
  }
};
