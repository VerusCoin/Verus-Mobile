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
  if (!removeMeta || ![1, 2, 3, 4].includes(removeMeta.action)) return null;

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

  // Counts describe current content; they cannot establish a hash match or the
  // final result of a request that also adds content.
  switch (removeMeta.action) {
    case 4:
      return {
        summary: isNoOp ? 'No current identity content found' : 'Clear all current identity content',
        modalTitle: 'Clear current identity content',
        detailTitle: 'Clear current identity content',
        detailBody: 'This action removes all identity content keys and values accumulated before it is processed.',
        effectNote: 'This request may also add content, so your identity content may not be empty afterward.',
        emptyStateNote: isNoOp
          ? 'No current content was found on this identity. This request may still add content.'
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
        highRiskWarning: 'This action removes all identity content keys and values accumulated before it is processed. This request may also add content, so your identity content may not be empty afterward. Earlier on-chain versions may still be publicly retrievable.',
      };
    case 3:
      return {
        summary: isNoOp ? `No current values found under ${targetLabel}` : `Remove all current values under ${targetLabel}`,
        modalTitle: `Remove ${targetLabel}`,
        detailTitle: `Remove ${targetLabel}`,
        detailBody: `This action removes all values under ${targetLabel} accumulated before it is processed.`,
        effectNote: 'This request may also add values under this key, so the key may still contain content afterward.',
        emptyStateNote: isNoOp
          ? 'No current values were found under this key. This request may still add content.'
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
        detailBody: `This action removes all previously accumulated values under ${targetLabel} whose hash matches the requested hash, if any.`,
        effectNote: 'If matching values are found, all of them are removed by this action. Nonmatching values are not removed by it. This request may also add content.',
        emptyStateNote: isNoOp
          ? 'No current values were found under this key. This request may still add content.'
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
    case 1:
      return {
        summary: `Remove one current matching value under ${targetLabel}`,
        modalTitle: `Remove a matching value from ${targetLabel}`,
        detailTitle: `Remove a matching value from ${targetLabel}`,
        detailBody: `This action removes one previously accumulated value under ${targetLabel} whose hash matches the requested hash, if any.`,
        effectNote: 'If a matching value is found, one instance is removed by this action. Other values are not removed by it. This request may also add content.',
        emptyStateNote: isNoOp
          ? 'No current values were found under this key. This request may still add content.'
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
  }
};
