import {
  ERROR_SERVICE_RATES,
  SET_SERVICE_RATES,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import WyreProvider from "../../../../utils/services/WyreProvider";
import { extractWyreRates } from "../../../../utils/standardization/extractWyreRates";

const channelMap = {
  [WYRE_SERVICE]: async (activeUser, channelStore) => {
    try {
      const res = await WyreProvider.getRates("PRICED")

      return {
        channel: WYRE_SERVICE,
        body: extractWyreRates(res, ["BTC", "USD", "AUD", "EUR"]),
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
