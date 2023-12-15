import {
    ERROR_SERVICE_NOTIFICATIONS,
    SET_SERVICE_NOTIFICATIONS
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
      SET_SERVICE_NOTIFICATIONS,
      ERROR_SERVICE_NOTIFICATIONS,
      fetchChannels
    );
  