import Store from "../../store";
import { requestSeeds } from "../auth/authBox";
import { coinsList } from "../CoinData/CoinsList";
import { WYRE_SERVICE } from "../constants/intervalConstants";
import { WYRE_SERVICE_ID, CONNECTED_SERVICE_DISPLAY_INFO } from "../constants/services";
import { AUTHENTICATE_WYRE_SERVICE, DEAUTHENTICATE_WYRE_SERVICE, SET_ADDRESSES } from "../constants/storeType";
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
      getRates: async (payload) => this.getRates(payload),
      sendTransaction: async (payload) => this.sendTransaction(payload),
      preflightTransaction: async (payload) => this.preflightTransaction(payload),
      getTransferInstructions: async (payload) => this.getTransferInstructions(payload),
    });

    this.service = WyreService.build();
    this.bearerToken = null;
    this.apiKey = null;
    this.accountId = null;
  }

  authenticate = async (seed, reauthenticate = false) => {
    if (reauthenticate) {
      this.service.deauthenticate()
    }

    const key = await WyreService.bearerFromSeed(seed);
    const authenticated = Store.getState().channelStore_wyre_service.authenticated;

    if (authenticated && !reauthenticate)
      return { apiKey: this.apiKey, authenticatedAs: this.accountId };

    const res = await this.service.submitAuthToken(key);

    this.bearerToken = key;
    this.apiKey = res.apiKey;
    this.accountId = res.authenticatedAs == null ? null : res.authenticatedAs.split(":")[1];

    this.service.authenticate(this.bearerToken, this.apiKey);

    await this.initAccountData()

    return res;
  };

  loadWyreCoinAddresses = async () => {
    try {
      if (this.accountId != null) {
        const { depositAddresses, id } = await this.getAccount();

        for (const coinObj of Object.values(coinsList)) {
          if (coinObj.compatible_channels.includes(WYRE_SERVICE)) {
            Store.dispatch({
              type: SET_ADDRESSES,
              payload: {
                chainTicker: coinObj.id,
                channel: WYRE_SERVICE,
                addresses: [
                  depositAddresses[coinObj.id] == null
                    ? `account:${id}`
                    : depositAddresses[coinObj.id],
                ],
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  initAccountData = async () => {
    await this.loadWyreCoinAddresses()

    Store.dispatch({
      type: AUTHENTICATE_WYRE_SERVICE,
      payload: {
        accountId: this.accountId,
      },
    });
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
    const newAccount = await this.service.createAccount(account);
    await this.authenticate((await requestSeeds())[WYRE_SERVICE], true)
    return newAccount
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

  getAccount = async (payload = {}) => {
    const { accountId } = payload;
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
    return ["US"]//await this.service.getSupportedCountries();
  };

  getTransferInstructions = async ({ transferId }) => {
    return await this.service.getTransferInstructions(transferId);
  };

  preflightTransaction = async ({
    source,
    sourceCurrency,
    sourceAmount,
    dest,
    destCurrency,
    message,
    amountIncludesFees
  }) => {
    return await this.service.createTransfer(
      source,
      sourceCurrency,
      sourceAmount,
      dest,
      destCurrency,
      message,
      false,
      amountIncludesFees
    );
  };

  sendTransaction = async ({ transferId }) => {
    return await this.service.confirmTransfer(transferId);
  };

  getAccountSrn = () => {
    return WyreService.formatSrn(this.accountId, "account");
  };

  getRates = async ({ mode }) => {
    return await this.service.getRates(mode);
  };
}