import {
  ERROR_SERVICE_PAYMENT_METHODS,
  SET_SERVICE_PAYMENT_METHODS
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

      const res = await WyreProvider.listPaymentMethods()
      let mapping = {}

      res.data.map(paymentMethod => {
        mapping[paymentMethod.id] = paymentMethod
      })

      return {
        channel: WYRE_SERVICE,
        body: {
          list: res.data,
          mapping: mapping
        },
      };
    } catch(e) {
      throw e
    }
  },
};

export const updateServicePaymentMethods = (state, dispatch, channels) =>
  updateServiceDataValue(
    state,
    dispatch,
    channels,
    SET_SERVICE_PAYMENT_METHODS,
    ERROR_SERVICE_PAYMENT_METHODS,
    channelMap
  );
