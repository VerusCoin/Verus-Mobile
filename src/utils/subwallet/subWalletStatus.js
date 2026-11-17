import { WYRE_SERVICE_ID } from "../constants/services"

const SUBWALLET_ACTIVITY_FUNCTIONS = {
  ["WYRE_ACCOUNT_WALLET"]: {
    active: (services) => {
      return (
        services.accounts[WYRE_SERVICE_ID] &&
        services.accounts[WYRE_SERVICE_ID].status === "APPROVED"
      );
    },
    placeholder: {
      icon: "room-service",
      // Only a wallet that added a Wyre asset before Wyre was removed gets here.
      label: 'Wyre is no longer available. Remove this asset in Manage assets.',
    },
  },
};

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