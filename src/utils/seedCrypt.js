import aes256 from 'nodejs-aes256';

// TODO: check pin strength

export const encryptkey = (cipherKey, string) => {
  // test pin security
  // - at least 1 char in upper case
  // - at least 1 digit
  // - at least one special character
  // - min length 8

  // const _pinTest = _pin.match('^(?=.*[A-Z])(?=.*[^<>{}\"/|;:.,~!?@#$%^=&*\\]\\\\()\\[_+]*$)(?=.*[0-9])(?=.*[a-z]).{8}$');

  const encryptedString = aes256.encrypt(cipherKey, string);

  return encryptedString;
}

export const decryptkey = (cipherKey, string) => {
  const decryptedKey = aes256.decrypt(cipherKey, string);
  // test if stored encrypted passphrase is decrypted correctly
  // if not then the key is wrong
  const _regexTest = decryptedKey.match(/^[0-9a-zA-Z ]+$/g);

  return !_regexTest ? false : decryptedKey;
}

export const decryptGeneral = (cipherKey, string) => (
  aes256.decrypt(cipherKey, string)
)
