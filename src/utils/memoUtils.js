const base64 = require('base-64');
const utf8 = require('utf8');

export const decodeMemo = (memoEncoded) => {
  try {
    return utf8.decode(base64.decode(memoEncoded));
  } catch (e) {
    return null;
  }
};

export const encodeMemo = (memoDecoded) => {
  try {
    return base64.encode(utf8.encode(memoDecoded));
  } catch(e) {
    throw e
  }
}