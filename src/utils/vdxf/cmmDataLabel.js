import { getVDXFKeyLabel } from "./vdxfTypeLabels";

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
    return "raw hex data"
  } else if (typeof cmmData === 'object' && Object.keys(cmmData).length === 1) {
    return (`${getVDXFKeyLabel(Object.keys(cmmData)[0])} data`)
  } else return "unknown data";
}