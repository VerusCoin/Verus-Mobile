import {
  ERROR_SERVICE_RATES,
  SET_SERVICE_RATES,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import { updateWyreRates } from "./wyre/updates";

const fetchChannels = () => {
  return {
    [WYRE_SERVICE]: () => updateWyreRates(),
  }
};

export const updateServiceRates = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_RATES,
    ERROR_SERVICE_RATES,
    fetchChannels
  );
