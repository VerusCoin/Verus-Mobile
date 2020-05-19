import {
  SET_CLAIM_CATEGORIES,
  SET_ACTIVE_CLAIM_CATEGORY_ID,
  SET_SHOW_EMPTY_CLAIM_CATEGORIES,
  ADD_NEW_CATEGORY,
  SET_NEW_CATEGORY,
  DELETE_CATEGORY,
} from '../../utils/constants/storeType';

export const setClaimCategories = (claimCategories) => ({
  type: SET_CLAIM_CATEGORIES,
  payload: { claimCategories },
});

export const setActiveClaimCategory = (activeClaimCategoryId) => ({
  type: SET_ACTIVE_CLAIM_CATEGORY_ID,
  payload: { activeClaimCategoryId },
});

export const setShowEmptyClaimCategories = (value) => ({
  type: SET_SHOW_EMPTY_CLAIM_CATEGORIES,
  payload: { value },
});

export const addNewCategory = (value) => ({
  type: ADD_NEW_CATEGORY,
  payload: { value },
});

export const setNewCategory = (category) => ({
  type: SET_NEW_CATEGORY,
  payload: { category },
});

export const deleteCategory = (category) => ({
  type: DELETE_CATEGORY,
  payload: { category },
});
