import { WYRE_SERVICE_ID } from "../constants/services"

const SUBWALLET_ACTIVITY_FUNCTIONS = {
  ["WYRE_ACCOUNT_WALLET"]: {
    active: (services) => {
      return services.accounts[WYRE_SERVICE_ID]
    },
    placeholder: {
      icon: 'room-service',
      label: `To access this card, you'll need to link your wallet with the Wyre service under the "Services" tab`
    }
  }
}

export const subWalletActivity = (id) => {
  if (SUBWALLET_ACTIVITY_FUNCTIONS[id] != null) {
    return SUBWALLET_ACTIVITY_FUNCTIONS[id];
  } else {
    return {
      active: () => {
        return true;
      },
    };
  }
};