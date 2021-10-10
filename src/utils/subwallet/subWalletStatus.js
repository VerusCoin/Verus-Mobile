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
      label: `To access this card, you'll need to create and verify a Wyre account under the "Services" tab`,
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