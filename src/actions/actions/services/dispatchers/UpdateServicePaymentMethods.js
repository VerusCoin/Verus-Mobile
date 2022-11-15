import {
  ERROR_SERVICE_PAYMENT_METHODS,
  SET_SERVICE_PAYMENT_METHODS
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import { updateWyrePaymentMethods } from "./wyre/updates";

const fetchChannels = () => {
  return {
    [WYRE_SERVICE]: channelStore => updateWyrePaymentMethods(channelStore),
  };
};

export const updateServicePaymentMethods = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_PAYMENT_METHODS,
    ERROR_SERVICE_PAYMENT_METHODS,
    fetchChannels
  );
