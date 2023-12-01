import {
    ERROR_SERVICE_ACCOUNT,
    SET_SERVICE_ACCOUNT
  } from "../../../../utils/constants/storeType";
  import { VERUSID } from "../../../../utils/constants/intervalConstants";
  import { updateServiceDataValue } from "./UpdateServiceDataValue";

  import { checkVerusIdNotificationsForUpdates } from "./verusid/verusid";
  
  const fetchChannels = () => {
    return {
      [VERUSID]: (channelStore) =>
        checkVerusIdNotificationsForUpdates(channelStore),
    };
  };
  
  export const updateServiceNotifications = (state, dispatch, channels) =>
    updateServiceDataValue(
      state,
      dispatch,
      channels,
      SET_SERVICE_ACCOUNT,
      ERROR_SERVICE_ACCOUNT,
      fetchChannels
    );
  