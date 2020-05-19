import { useReducer, useMemo } from 'react';

import {
  setSearchTerm,
  setCategories,
  setAddDialogVisible,
  setCategoryName,
  defaultState,
  claimCategoriesReducer,
  setDeleteDialogVisible,
} from './claimCategoriesReducer';

export default function useClaimCategories(categoryData) {
  const [state, dispatch] = useReducer(claimCategoriesReducer, defaultState(categoryData));

  const actions = useMemo(() => ({
    setSearchTerm: (searchTerm) => dispatch(setSearchTerm(searchTerm)),
    setCategories: (categories) => dispatch(setCategories(categories)),
    setAddDialogVisible: (dialogVisible) => dispatch(setAddDialogVisible(dialogVisible)),
    setDeleteDialogVisible: (dialogVisible) => dispatch(setDeleteDialogVisible(dialogVisible)),
    setCategoryName: (categoryName) => dispatch(setCategoryName(categoryName)),
  }), [dispatch]);

  return [
    state,
    actions,
  ];
}
