import { getVDXFKeyLabel } from "./vdxfTypeLabels";

const looksLikeHexString = value =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length % 2 === 0 &&
  /^[0-9a-fA-F]+$/.test(value);

const looksLikeJsonString = value => {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (
    !(
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
  ) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch (e) {
    return false;
  }
};

export const getCmmDataLabel = (cmmData, recurse = true, stringLenLimit = 20) => {
  if (Array.isArray(cmmData)) {
    if (cmmData.length > 0 && recurse) {
      let ret = `${cmmData.length} ${cmmData.length === 1 ? 'item' : 'items'} (`;

      let i = 0
      for (; i < cmmData.length; i++) {
        ret += getCmmDataLabel(cmmData[i], false, 8);
        if (i < cmmData.length - 1) ret += ", ";
      }

      if (i < cmmData.length) ret += `+ ${cmmData.length - i} more`;

      return ret + ")";
    } else if (cmmData.length === 0) return "empty array";
    else return `${cmmData.length} items`;
  } else if (typeof cmmData === 'string') {
    if (looksLikeHexString(cmmData)) return "raw hex data";
    if (looksLikeJsonString(cmmData)) return "json text";
    return cmmData.length > stringLenLimit ? 'text data' : cmmData;
  } else if (typeof cmmData === 'object' && Object.keys(cmmData).length === 1) {
    return (`${getVDXFKeyLabel(Object.keys(cmmData)[0])} data`)
  } else return "unknown data";
}
