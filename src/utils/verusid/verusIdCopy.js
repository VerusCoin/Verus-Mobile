// User-facing copy says "VerusID" where engine messages say "identity".
// "an identity" becomes "a VerusID", not "an VerusID".
export const verusIdCopy = value => typeof value === 'string' ? value
  .replace(/\b([Aa])n (?=identit(?:y|ies)\b)/g, '$1 ')
  .replace(/\bidentities\b/gi, 'VerusIDs')
  .replace(/\bidentity\b/gi, 'VerusID') : value;
