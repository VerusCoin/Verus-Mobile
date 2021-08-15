import {
  ERROR_SERVICE_TRANSFERS,
  SET_SERVICE_TRANSFERS
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import WyreProvider from "../../../../utils/services/WyreProvider";
import { requestSeeds } from "../../../../utils/auth/authBox";

const channelMap = {
  [WYRE_SERVICE]: async (activeUser, channelStore) => {
    try {
      if (!channelStore.authenticated) {
        const seed = (await requestSeeds())[WYRE_SERVICE];
        if (seed == null) throw new Error("No Wyre seed present");
        await WyreProvider.authenticate(seed);
      }

      const res = await WyreProvider.getTransferHistory()

      return {
        channel: WYRE_SERVICE,
        body: res.data,
      };
    } catch(e) {
      throw e
    }
  },
};

export const updateServiceTransfers = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_TRANSFERS,
    ERROR_SERVICE_TRANSFERS,
    channelMap
  );
