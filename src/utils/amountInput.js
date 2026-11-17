// Edit the displayed decimal text. Amount and fee arithmetic stays with callers.
export const editAmountInput = (
  value,
  selection,
  key,
  decimalSeparator = '.',
  maxLength = Infinity,
) => {
  const start = Math.max(0, Math.min(selection?.start ?? value.length, value.length));
  const end = Math.max(start, Math.min(selection?.end ?? start, value.length));
  const unchanged = {value, selection: {start, end}};

  if (key === 'delete') {
    const from = start === end ? Math.max(0, start - 1) : start;
    return {
      value: value.slice(0, from) + value.slice(end),
      selection: {start: from, end: from},
    };
  }

  const inserted = key === 'decimal' ? decimalSeparator : key;
  if (key !== 'decimal' && !/^\d$/.test(inserted)) return unchanged;
  const remaining = value.slice(0, start) + value.slice(end);
  if (key === 'decimal' && /[.,]/.test(remaining)) return unchanged;
  const prefix = value.slice(0, start);
  const suffix = value.slice(end);
  let next = prefix + inserted + suffix;
  let cursor = start + inserted.length;
  const normalized = next.replace(/^0+(?=\d)/, '');
  cursor = Math.max(0, cursor - (next.length - normalized.length));
  next = normalized;
  if (/^[.,]/.test(next)) {
    next = `0${next}`;
    cursor++;
  }
  if (next.length > maxLength) return unchanged;
  return {value: next, selection: {start: cursor, end: cursor}};
};

// Amount reviews and available balances use a dot throughout the wallet.
export const getAmountDecimalSeparator = () => '.';
