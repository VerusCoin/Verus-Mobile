import { useReducer, useMemo } from 'react';

import {
  setSearchTerm,
  setCategories,
  setDialogVisible,
  setCategoryName,
  defaultState,
  claimCategoriesReducer,
} from './claimCategoriesReducer';

export default function useClaimCategories(categoryData) {
  const [state, dispatch] = useReducer(claimCategoriesReducer, defaultState(categoryData));

  const actions = useMemo(() => ({
    setSearchTerm: (searchTerm) => dispatch(setSearchTerm(searchTerm)),
    setCategories: (categories) => dispatch(setCategories(categories)),
    setDialogVisible: (dialogVisible) => dispatch(setDialogVisible(dialogVisible)),
    setCategoryName: (categoryName) => dispatch(setCategoryName(categoryName)),
  }), [dispatch]);

  return [
    state,
    actions,
  ];
}
