const IDENTITY_INDEX_METHODS = [
  'getidentitieswithaddress',
  'getidentitieswithrecovery',
  'getidentitieswithrevocation',
];

const getErrorText = value => {
  if (value == null) return '';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
};
export const isIdentityIndexUnavailable = error => {
  if (!error) return false;
  if (error.code === -32601) return true;

  const errorText = `${getErrorText(error.message)} ${getErrorText(
    error.data,
  )}`.toLowerCase();

  if (
    errorText.includes('requires -idindex=1') ||
    errorText.includes('identity index disabled')
  ) {
    return true;
  }

  const methodUnavailable =
    errorText.includes('not found') ||
    errorText.includes('not supported') ||
    errorText.includes('unsupported') ||
    errorText.includes('unknown method') ||
    errorText.includes('method not found') ||
    errorText.includes('not a function');

  return (
    methodUnavailable &&
    (errorText.includes('method') ||
      IDENTITY_INDEX_METHODS.some(method => errorText.includes(method)))
  );
};
