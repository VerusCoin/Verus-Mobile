import { WALLET_APP_OVERVIEW } from './apps'
import { 
  ALWAYS_ACTIVATED, 
  NEVER_ACTIVATED, 
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  API_GET_FIATPRICE,
  GENERAL,
  DLIGHT_PRIVATE,
  ELECTRUM,
  ETH,
  ERC20,
  API_GET_SERVICE_ACCOUNT,
  WYRE_SERVICE,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES,
  API_GET_CONVERSION_PATHS,
  API_GET_WITHDRAW_DESTINATIONS,
  API_GET_DEPOSIT_SOURCES,
  API_GET_PENDING_DEPOSITS,
  API_GET_LINKED_IDENTITIES,
  API_GET_SERVICE_NOTIFICATIONS,
  VERUSID,
  VRPC
} from './intervalConstants'

export const DEFAULT_SERVICE_UPDATE_PARAMS = {
  [API_GET_SERVICE_ACCOUNT]: {
    channels: [WYRE_SERVICE],
    tracking_info: {
      update_locations: null,
      needs_update: true,
      busy: {},
    },
    interval_info: {
      expire_id: null,
      update_expired_id: null,
      expire_oncomplete: null,
      update_expired_oncomplete: null,
      expire_timeout: 60000,
      update_expired_interval: 300000
    }
  },
  [API_GET_SERVICE_PAYMENT_METHODS]: {
    channels: [WYRE_SERVICE],
    tracking_info: {
      update_locations: null,
      needs_update: true,
      busy: {},
    },
    interval_info: {
      expire_id: null,
      update_expired_id: null,
      expire_oncomplete: null,
      update_expired_oncomplete: null,
      expire_timeout: 120000,
      update_expired_interval: 300000
    }
  },
  [API_GET_SERVICE_TRANSFERS]: {
    channels: [WYRE_SERVICE],
    tracking_info: {
      update_locations: null,
      needs_update: true,
      busy: {},
    },
    interval_info: {
      expire_id: null,
      update_expired_id: null,
      expire_oncomplete: null,
      update_expired_oncomplete: null,
      expire_timeout: 120000,
      update_expired_interval: 300000
    }
  },
  [API_GET_SERVICE_RATES]: {
    channels: [WYRE_SERVICE],
    tracking_info: {
      update_locations: null,
      needs_update: true,
      busy: {},
    },
    interval_info: {
      expire_id: null,
      update_expired_id: null,
      expire_oncomplete: null,
      update_expired_oncomplete: null,
      expire_timeout: 120000,
      update_expired_interval: 300000
    }
  },
  [API_GET_SERVICE_NOTIFICATIONS]: {
    channels: [VERUSID],
    tracking_info: {
      update_locations: null,
      needs_update: true,
      busy: {},
    },
    interval_info: {
      expire_id: null,
      update_expired_id: null,
      expire_oncomplete: null,
      update_expired_oncomplete: null,
      expire_timeout: 60000,
      update_expired_interval: 60000
    }
  },
}

/**
 * The constant parameter object that holds all settings for deciding the timing and frequency of how certain coin modes
 * call their API to get their data.
 */
export const DEFAULT_COIN_UPDATE_PARAMS = {
  [API_GET_FIATPRICE]: {
    channels: [GENERAL, WYRE_SERVICE],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
  },
  [API_GET_INFO]: {
    channels: [DLIGHT_PRIVATE],
    restrictions: [],
    pre_data: {
      tracking_info: {
        // Set this to only enable this update when the chainticker that the update interval was created for is
        // active
        coin_bound: false,
        // Set this to an array of screen keys to restrict this update to happening only inside of a coin application,
        // on the specified screens
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: ALWAYS_ACTIVATED,
        update_expired_interval: 5000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: ALWAYS_ACTIVATED,
        update_expired_interval: 30000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 30000,
        update_expired_interval: 300000,
      },
    },
  },
  [API_GET_TRANSACTIONS]: {
    channels: [DLIGHT_PRIVATE, ELECTRUM, ETH, ERC20, WYRE_SERVICE, VRPC],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: true,
        update_locations: [WALLET_APP_OVERVIEW],
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: true,
        update_locations: [WALLET_APP_OVERVIEW],
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: true,
        update_locations: [WALLET_APP_OVERVIEW],
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
  },
  [API_GET_CONVERSION_PATHS]: {
    channels: [WYRE_SERVICE],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: true,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 300000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: true,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 300000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: true,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 300000,
      },
    },
  },
  [API_GET_WITHDRAW_DESTINATIONS]: {
    channels: [WYRE_SERVICE],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
  },
  [API_GET_DEPOSIT_SOURCES]: {
    channels: [WYRE_SERVICE],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
  },
  [API_GET_PENDING_DEPOSITS]: {
    channels: [WYRE_SERVICE],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 120000,
        update_expired_interval: 150000,
      },
    },
  },
  [API_GET_BALANCES]: {
    channels: [DLIGHT_PRIVATE, ELECTRUM, ETH, ERC20, WYRE_SERVICE, VRPC],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
    syncing: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
    post_sync: {
      tracking_info: {
        coin_bound: false,
        update_locations: null,
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 300000,
      },
    },
  },
};