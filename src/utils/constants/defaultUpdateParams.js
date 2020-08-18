import { 
  ALWAYS_ACTIVATED, 
  NEVER_ACTIVATED, 
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  API_GET_FIATPRICE,
  GENERAL,
  DLIGHT,
  ELECTRUM,
} from './intervalConstants'

/**
 * The constant parameter object that holds all settings for deciding the timing and frequency of how certain coin modes
 * call their API to get their data.
 */

export const DEFAULT_COIN_UPDATE_PARAMS = {
  [API_GET_FIATPRICE]: {
    channels: [GENERAL],
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
        expire_timeout: 30000,
        update_expired_interval: 10000
      }
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
        update_expired_interval: 10000
      }
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
        update_expired_interval: 10000
      }
    }
  },
  [API_GET_INFO]: {
    channels: [DLIGHT],
    restrictions: [],
    pre_data: {
      tracking_info: {
        // Set this to only enable this update when the chainticker that the update interval was created for is 
        // active
        coin_bound: true, 
        // Set this to an array of screen keys to restrict this update to happening only inside of a coin application,
        // on the specified screens
        update_locations: ['wallet-overview', 'wallet-send'], 
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: ALWAYS_ACTIVATED,
        update_expired_interval: 5000
      }
    },
    syncing: {
      tracking_info: {
        coin_bound: true, 
        update_locations: ['wallet-overview', 'wallet-send'], 
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: ALWAYS_ACTIVATED,
        update_expired_interval: 10000
      }
    },
    post_sync: {
      tracking_info: {
        coin_bound: true, 
        update_locations: ['wallet-overview', 'wallet-send'], 
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 30000,
        update_expired_interval: 10000
      }
    }
  },
  [API_GET_TRANSACTIONS]: {
    channels: [DLIGHT, ELECTRUM],
    restrictions: [],
    pre_data: {
      tracking_info: {
        coin_bound: true, 
        update_locations: ['wallet-overview'], 
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 10000,
      }
    },
    syncing: {
      tracking_info: {
        coin_bound: true, 
        update_locations: ['wallet-overview'], 
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 10000,
      }
    },
    post_sync: {
      tracking_info: {
        coin_bound: true, 
        update_locations: ['wallet-overview'], 
        needs_update: true,
        busy: {},
      },
      interval_info: {
        expire_id: null,
        update_expired_id: null,
        expire_oncomplete: null,
        update_expired_oncomplete: null,
        expire_timeout: 60000,
        update_expired_interval: 10000,
      }
    }
  },
  [API_GET_BALANCES]: {
    channels: [DLIGHT, ELECTRUM],
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
        expire_timeout: 30000,
        update_expired_interval: 10000
      }
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
        expire_timeout: 30000,
        update_expired_interval: 10000
      }
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
        update_expired_interval: 10000
      }
    }
  },
}