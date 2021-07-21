import { WYRE_SERVICE_ID, CONNECTED_SERVICE_DISPLAY_INFO } from "../constants/services";
import { AccountBasedFintechApiTemplate } from "./ServiceTemplates";

export class WyreApi extends AccountBasedFintechApiTemplate {
  constructor() {
    super(WYRE_SERVICE_ID, CONNECTED_SERVICE_DISPLAY_INFO[WYRE_SERVICE_ID], {
      login: async () => {
        //TODO
      },
      logout: async () => {
        //TODO
      },
      createAccount: async () => {
        //TODO
      },
      getAccount: async () => {
        //TODO
      },
      updateAccount: async () => {
        //TODO
      },
      uploadDocument: async () => {
        //TODO
      },
      getTransactions: async () => {
        //TODO
      },
      getRates: async () => {
        //TODO
      },
      getBalances: async () => {
        //TODO
      },
      sendTransaction: async () => {
        //TODO
      },
    })
  }
}