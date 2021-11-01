import { conditionallyUpdateService } from "../../../../actions/actionDispatchers"
import store from "../../../../store"
import {
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_RATES,
  API_GET_SERVICE_TRANSFERS,
  WYRE_SERVICE,
} from "../../../constants/intervalConstants";

export * from "./requests/getBalances";
export * from "./requests/getTransactions";
export * from "./requests/preflightTransaction";
export * from "./requests/sendTransaction";
export * from "./requests/getCurrencyConversionPaths";
export * from './requests/preflightConversion';
export * from './requests/convert';
export * from './requests/getWithdrawMethods';
export * from './requests/getDepositMethods';
export * from './requests/getTransferFollowup';
export * from './requests/getPendingDeposits';

export const getActiveWyreAccount = async () => {
  await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_ACCOUNT);

  const { services } = store.getState()

  if (services.accounts[WYRE_SERVICE] != null) {
    return services.accounts[WYRE_SERVICE]
  } else return null
}

export const getActiveWyrePaymentMethods = async () => {
  await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_PAYMENT_METHODS);

  const { services } = store.getState()

  if (services.paymentMethods[WYRE_SERVICE] != null) {
    return services.paymentMethods[WYRE_SERVICE]
  } else return null
}

export const getActiveWyreRates = async () => {
  await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_RATES);

  const { services } = store.getState()

  if (services.rates[WYRE_SERVICE] != null) {
    return services.rates[WYRE_SERVICE]
  } else return null
}

export const getActiveWyreTransfers = async () => {
  await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_TRANSFERS);

  const { services } = store.getState()

  if (services.transfers[WYRE_SERVICE] != null) {
    return services.transfers[WYRE_SERVICE]
  } else return null
}