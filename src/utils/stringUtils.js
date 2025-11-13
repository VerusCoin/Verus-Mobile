export const removeSpaces = (string) => {
  if (typeof string === 'string') {
    return string.replace(/\s+/g, '');
  }
  console.warn(`function removeSpaces expected string, given ${typeof string}`);
  return string;
};

export const spacesLeadOrTrail = (string) => {
  if (typeof string === 'string') {
    if (string.trim() !== string) {
      return true;
    }
    return false;
  }
  console.warn(`function spacesLeadOrTrail expected string, given ${typeof string}`);
  return string;
};

export const hasSpecialCharacters = (str) => !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);

export const isElectrumUrl = (str) => /^[\w\.]{1,100}:\d{1,100}:\w{1,100}$/.test(str);

export const camelizeString = (string) => {
  const text = string.replace(/[-_\s.]+(.)?/g, (match, chr) => (chr ? chr.toUpperCase() : ''));
  return text.substr(0, 1).toLowerCase() + text.substr(1);
};

export const capitalizeString = (string) => {
  const firstChar = string.charAt(0).toUpperCase();
  return firstChar + string.slice(1);
};

/**
 * Prefixes a hex string with 0x, regardless of if it already has it or not
 * @param {string} hex hex string with or without 0x prefix
 * @returns {string} hex string with 0x prefix
 */
export const prefixHex0x = (hex) => {
  if (typeof hex !== 'string') throw new Error("Invalid input to prefix hex")
  return hex.startsWith('0x') ? hex : '0x' + hex;
}