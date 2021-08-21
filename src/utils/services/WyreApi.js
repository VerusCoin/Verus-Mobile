import Store from "../../store";
import { WYRE_SERVICE_ID, CONNECTED_SERVICE_DISPLAY_INFO } from "../constants/services";
import { AUTHENTICATE_WYRE_SERVICE, DEAUTHENTICATE_WYRE_SERVICE } from "../constants/storeType";
import { AccountBasedFintechApiTemplate } from "./ServiceTemplates";
import WyreService from './WyreService'

export class WyreApi extends AccountBasedFintechApiTemplate {
  constructor() {
    super(WYRE_SERVICE_ID, {
      authenticate: (seed) => this.authenticate(seed),
      reset: () => this.reset(),
      createAccount: (payload) => this.createAccount(payload),
      getAccount: (payload) => this.getAccount(payload),
      updateAccount: (payload) => this.updateAccount(payload),
      uploadDocument: (payload) => this.uploadDocument(payload),
      listPaymentMethods: (payload) => this.listPaymentMethods(payload),
      createPaymentMethod: (payload) => this.createPaymentMethod(payload),
      deletePaymentMethod: (payload) => this.deletePaymentMethod(payload),
      getTransferHistory: (payload) => this.getTransferHistory(payload),
      getRates: async () => {
        //TODO
      },
      getBalances: async () => {
        //TODO
      },
      sendTransaction: async () => {
        //TODO
      },
    });

    this.service = WyreService.build();
    this.bearerToken = null;
    this.apiKey = null;
    this.accountId = null;
  }

  authenticate = async (seed) => {
    const key = await WyreService.bearerFromSeed(seed);
    const authenticated = Store.getState().channelStore_wyre_service.authenticated;

    if (authenticated) return { apiKey: this.apiKey, authenticatedAs: this.accountId };

    const res = await this.service.submitAuthToken(key);

    this.bearerToken = key;
    this.apiKey = res.apiKey;
    this.accountId = res.authenticatedAs == null ? null : res.authenticatedAs.split(":")[1];

    this.service.authenticate(this.bearerToken, this.apiKey);

    Store.dispatch({
      type: AUTHENTICATE_WYRE_SERVICE,
      payload: {
        accountId: this.accountId,
      },
    });

    return res;
  };

  reset = () => {
    this.bearerToken = null;
    this.apiKey = null;
    this.accountId = null;
    this.service.deauthenticate();
    this.service = WyreService.build();

    Store.dispatch({
      type: DEAUTHENTICATE_WYRE_SERVICE,
    });
  };

  createAccount = async ({ account }) => {
    return await this.service.createAccount(account);
  };

  updateAccount = async ({ accountId, updateObj }) => {
    return await this.service.updateAccount(
      accountId == null ? this.accountId : accountId,
      updateObj
    );
  };

  uploadDocument = async ({ accountId, field, uris, format, documentType, documentSubTypes }) => {
    return await this.service.uploadDocument(
      accountId == null ? this.accountId : accountId,
      field,
      uris,
      documentType,
      documentSubTypes,
      format == null ? "image/jpeg" : format
    );
  };

  followupPaymentMethod = async ({ paymentMethod, uris, format }) => {
    return await this.service.followupPaymentMethod(paymentMethod, uris, format);
  };

  getAccount = async ({ accountId }) => {
    return await this.service.getAccount(accountId == null ? this.accountId : accountId);
  };

  listPaymentMethods = async () => {
    return await this.service.listPaymentMethods();
  };

  getTransferHistory = async () => {
    return await this.service.getTransferHistory();
  };

  createPaymentMethod = async ({ paymentMethod }) => {
    return await this.service.createPaymentMethod(paymentMethod);
  };

  deletePaymentMethod = async ({ paymentMethod }) => {
    return await this.service.deletePaymentMethod(paymentMethod);
  };

  getSupportedCountries = async () => {
    return await this.service.getSupportedCountries();
  };
}