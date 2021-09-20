import {
  ERROR_SERVICE_RATES,
  SET_SERVICE_RATES,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import WyreProvider from "../../../../utils/services/WyreProvider";
import { extractWyreRates } from "../../../../utils/standardization/extractWyreRates";
import { SUPPORTED_BANK_CURRENCIES } from "../../../../utils/constants/currencies";

const channelMap = {
  [WYRE_SERVICE]: async (activeUser, channelStore) => {
    try {
      const res = await WyreProvider.getRates("PRICED")

      return {
        channel: WYRE_SERVICE,
        body: extractWyreRates(res, ["BTC", "ETH", ...SUPPORTED_BANK_CURRENCIES]),
      };
    } catch(e) {
      throw e
    }
  },
};

export const updateServiceRates = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_RATES,
    ERROR_SERVICE_RATES,
    channelMap
  );
