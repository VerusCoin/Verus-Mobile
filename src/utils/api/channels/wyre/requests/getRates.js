import { conditionallyUpdateService } from "../../../../../actions/actionDispatchers";
import store from "../../../../../store";
import { API_GET_SERVICE_RATES, WYRE_SERVICE } from "../../../../constants/intervalConstants";

export const getRates = async (coinObj) => {
  await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_RATES)

  const state = store.getState();
  let body = null;

  if (state.services.rates[WYRE_SERVICE] != null) {
    body = state.services.rates[WYRE_SERVICE][coinObj.id];
  }

  return body 
};
