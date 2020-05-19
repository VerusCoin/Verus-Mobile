import {
  SET_CLAIMS,
  SET_ACTIVE_CLAIM,
  SET_CLAIM_VISIBILITY,
  TOGGLE_SHOW_HIDDEN_CLAIMS,
  UPDATE_SELECTED_CLAIMS,
  CLEAR_SELECTED_CLAIMS,
  UPDATE_CATEGORY_FOR_CLAIMS,
  MOVE_CLAIMS_TO_CATEGORY,
  HIDE_SELECTED_CLAIMS,
  SET_HIDE_SELECTED_CLAIMS,
  SET_MEMO_DATA_FROM_TX,
  SET_CLAIMS_SORT_DIRECTION,
} from '../../utils/constants/storeType';

export const setClaims = (claims) => ({
  type: SET_CLAIMS,
  payload: { claims },
});

export const setActiveClaim = (activeClaim) => ({
  type: SET_ACTIVE_CLAIM,
  payload: { activeClaim },
});

export const toggleShowHiddenClaims = () => ({
  type: TOGGLE_SHOW_HIDDEN_CLAIMS,
  payload: {},
});

export const setClaimVisibility = (claim) => ({
  type: SET_CLAIM_VISIBILITY,
  payload: { claim },
});

export const updateSelectedClaims = (claims) => ({
  type: UPDATE_SELECTED_CLAIMS,
  payload: { claims },
});

export const clearSelectedClaims = () => ({
  type: CLEAR_SELECTED_CLAIMS,
  payload: {},
});

export const updateCategoryForClaims = (claims, categoryId) => ({
  type: UPDATE_CATEGORY_FOR_CLAIMS,
  payload: { claims, categoryId },
});

export const moveClaimsToCategory = (targetCategory) => ({
  type: MOVE_CLAIMS_TO_CATEGORY,
  payload: { targetCategory },
});

export const hideSelectedClaims = () => ({
  type: HIDE_SELECTED_CLAIMS,
  payload: {},
});

export const setHideSelectedClaims = (claims) => ({
  type: SET_HIDE_SELECTED_CLAIMS,
  payload: { claims },
});

export const setMemoDataFromTx = (memoData) => ({
  type: SET_MEMO_DATA_FROM_TX,
  payload: { memoData },
});

export const setClaimsSortDirection = (direction) => ({
  type: SET_CLAIMS_SORT_DIRECTION,
  payload: { direction },
});
