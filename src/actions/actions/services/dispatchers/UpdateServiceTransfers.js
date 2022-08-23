import {
  ERROR_SERVICE_TRANSFERS,
  SET_SERVICE_TRANSFERS
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import { updateWyreTransfers } from "./wyre/updates";

const fetchChannels = () => {
  return {
    [WYRE_SERVICE]: channelStore => updateWyreTransfers(channelStore),
  };
};

export const updateServiceTransfers = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_TRANSFERS,
    ERROR_SERVICE_TRANSFERS,
    fetchChannels
  );
