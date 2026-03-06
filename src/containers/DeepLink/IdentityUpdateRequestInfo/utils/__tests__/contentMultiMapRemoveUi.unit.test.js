/*
  contentMultiMapRemoveUi.unit.test 
  - Covers removal copy for current-state content changes and no-op edge cases.
*/

import { buildContentMultiMapRemoveUi } from '../contentMultiMapRemoveUi';

describe('buildContentMultiMapRemoveUi', () => {
  const getKeyLabel = key => {
    if (key === 'defined-key') return 'Vdxf key definitions';
    if (key === 'profile-key') return 'Profile media';
    return key;
  };

  test('describes action 3 against current metadata values', () => {
    const result = buildContentMultiMapRemoveUi({
      removeMeta: { action: 3, entryKey: 'defined-key' },
      fallbackKey: 'remove-key',
      currentContentMultiMap: { 'defined-key': ['abc123'] },
      getKeyLabel,
      definedKeyVdxfId: 'defined-key',
    });

    expect(result.summary).toBe('Remove all current values under VDXF key definitions');
    expect(result.modalTitle).toBe('Remove VDXF key definitions');
    expect(result.metadataNote).toContain('metadata');
    expect(result.emptyStateNote).toBe(null);
  });

  test('surfaces no-op copy when action 3 targets an empty key', () => {
    const result = buildContentMultiMapRemoveUi({
      removeMeta: { action: 3, entryKey: 'defined-key' },
      fallbackKey: 'remove-key',
      currentContentMultiMap: {},
      getKeyLabel,
      definedKeyVdxfId: 'defined-key',
    });

    expect(result.summary).toBe('No current values found under VDXF key definitions');
    expect(result.emptyStateNote).toBe(
      'No current values were found under this key. Confirming this request may have no visible effect.',
    );
    expect(result.actionLabel).toBe('Will remove');
  });

  test('surfaces no-op copy when action 4 targets an empty identity', () => {
    const result = buildContentMultiMapRemoveUi({
      removeMeta: { action: 4, entryKey: null },
      fallbackKey: 'remove-key',
      currentContentMultiMap: {},
      getKeyLabel,
      definedKeyVdxfId: 'defined-key',
    });

    expect(result.summary).toBe('No current identity content found');
    expect(result.modalTitle).toBe('Clear current identity content');
    expect(result.emptyStateNote).toBe(
      'No current content was found on this identity. Confirming this request may have no visible effect.',
    );
    expect(result.actionLabel).toBe('Will clear');
  });

  // Codex GPT-5: keep these assertions focused on user-facing copy, not internal structure.
});
