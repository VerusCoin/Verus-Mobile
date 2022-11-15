import { getCoinRates } from "../../../../../utils/api/channels/general/callCreators";
import { GENERAL } from "../../../../../utils/constants/intervalConstants";

export const updateGeneralFiatPrices = async (coinObj) => {
  const coinRates = await getCoinRates(coinObj);

  const { result, ...header } = coinRates;

  return {
    chainTicker: coinObj.id,
    channel: GENERAL,
    header,
    body: result,
  };
}