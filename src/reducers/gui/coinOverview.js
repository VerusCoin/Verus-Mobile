/*
  This reducer contains general navigation and saved form data
  for the buy/sell crypto screen
*/

import {
  SET_OVERVIEW_FILTER
} from '../../utils/constants/storeType'

export const coinOverview = (state = {
  activeOverviewFilter: {}
}, action) => {
  switch (action.type) {
    case SET_OVERVIEW_FILTER:
      return {
        ...state,
        activeOverviewFilter: {...state.activeOverviewFilter, [action.payload.chainTicker]: action.payload.filterType},
      };
    default:
      return state;
  }
}