import {
  ERROR_SERVICE_ACCOUNT,
  SET_SERVICE_ACCOUNT
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE, VALU_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import { updateWyreAccount } from "./wyre/updates";
import { updateValuAccount } from "./valu/updates";

const fetchChannels = () => {
  return {
    [WYRE_SERVICE]: (channelStore) => updateWyreAccount(channelStore),
    [VALU_SERVICE]: (channelStore) => updateValuAccount(channelStore),
  };
};

export const updateServiceAccount = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_ACCOUNT,
    ERROR_SERVICE_ACCOUNT,
    fetchChannels
  );
