// Captions show the response host and port. Full URIs stay in the requester
// sheet. Keep custom app schemes, where the scheme names the destination.
export const getResponseHostLabel = destination =>
  destination ? destination.replace(/^https?:\/\//i, '') : '';
