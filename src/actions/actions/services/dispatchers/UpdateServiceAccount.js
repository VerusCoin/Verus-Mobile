import {
  ERROR_SERVICE_ACCOUNT,
  SET_SERVICE_ACCOUNT
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateServiceDataValue } from "./UpdateServiceDataValue";
import WyreProvider from "../../../../utils/services/WyreProvider";
import ApiException from "../../../../utils/api/errors/apiError";
import { requestSeeds } from "../../../../utils/auth/authBox";

const channelMap = {
  [WYRE_SERVICE]: async (activeUser, channelStore) => {
    try {
      let accountId = channelStore.accountId

      if (!channelStore.authenticated) {
        const seed = (await requestSeeds())[WYRE_SERVICE];
        if (seed == null) throw new Error("No Wyre seed present");
        accountId = (await WyreProvider.authenticate(seed)).authenticatedAs;
      }

      if (accountId == null) return { channel: WYRE_SERVICE, body: null }
      else {
        return {
          channel: WYRE_SERVICE,
          body: await WyreProvider.getAccount({ accountId })
        }
      }
    } catch(e) {
      throw e
    }
  },
};

export const updateServiceAccount = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_ACCOUNT,
    ERROR_SERVICE_ACCOUNT,
    channelMap
  );
