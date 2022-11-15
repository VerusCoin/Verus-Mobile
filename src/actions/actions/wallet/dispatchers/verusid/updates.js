import { getWatchedIdentities, getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { VERUSID } from "../../../../../utils/constants/intervalConstants";

export const updateLinkedVerusIds = async coinObj => {
  const watchedIds = getWatchedIdentities(coinObj);
  let linkedIds = {};

  for (const iAddress of Object.keys(watchedIds)) {    
    try {
      const res = await getIdentity(coinObj, iAddress);

      if (res.error != null) continue;
      else linkedIds[iAddress] = res.result;
    } catch (e) {
      continue;
    }
  }

  return {
    channel: VERUSID,
    chainTicker: coinObj.id,
    header: {},
    body: linkedIds,
  };
};