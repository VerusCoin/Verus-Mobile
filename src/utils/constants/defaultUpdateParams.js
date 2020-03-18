import { 
  ALWAYS_ACTIVATED, 
  NEVER_ACTIVATED, 
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  API_GET_FIATPRICE,
} from './intervalConstants'

/**
 * The constant parameter object that holds all settings for deciding the timing and frequency of how certain coin modes
 * call their API to get their data.
 */
export const DEFAULT_COIN_UPDATE_PARAMS = {
  dlight: {
    [API_GET_INFO]: {
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
        },
        interval_info: {
          expire_id: null,
          update_expired_id: null,
          expire_oncomplete: null,
          update_expired_oncomplete: null,
          expire_timeout: NEVER_ACTIVATED,
          update_expired_interval: NEVER_ACTIVATED
        }
      },
      syncing: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
        },
        interval_info: {
          expire_id: null,
          update_expired_id: null,
          expire_oncomplete: null,
          update_expired_oncomplete: null,
          expire_timeout: NEVER_ACTIVATED,
          update_expired_interval: NEVER_ACTIVATED
        }
      },
      syncing: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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

    [API_GET_FIATPRICE]: {
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
        },
        interval_info: {
          expire_id: null,
          update_expired_id: null,
          expire_oncomplete: null,
          update_expired_oncomplete: null,
          expire_timeout: NEVER_ACTIVATED,
          update_expired_interval: NEVER_ACTIVATED
        }
      },
      syncing: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
  },
  
  //Electrum and eth have no syncing or pre_data phases
  electrum: {
    [API_GET_INFO]: {
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
        },
        interval_info: {
          expire_id: null,
          update_expired_id: null,
          expire_oncomplete: null,
          update_expired_oncomplete: null,
          expire_timeout: NEVER_ACTIVATED,
          update_expired_interval: NEVER_ACTIVATED
        }
      },
      syncing: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
        },
        interval_info: {
          expire_id: null,
          update_expired_id: null,
          expire_oncomplete: null,
          update_expired_oncomplete: null,
          expire_timeout: NEVER_ACTIVATED,
          update_expired_interval: NEVER_ACTIVATED
        }
      },
      syncing: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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

    [API_GET_FIATPRICE]: {
      restrictions: [],
      pre_data: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
        },
        interval_info: {
          expire_id: null,
          update_expired_id: null,
          expire_oncomplete: null,
          update_expired_oncomplete: null,
          expire_timeout: NEVER_ACTIVATED,
          update_expired_interval: NEVER_ACTIVATED
        }
      },
      syncing: {
        tracking_info: {
          update_enabled: false,
          needs_update: true,
          busy: false,
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
          update_enabled: false,
          needs_update: true,
          busy: false,
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
  },
}