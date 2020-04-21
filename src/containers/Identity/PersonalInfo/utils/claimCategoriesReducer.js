export const defaultState = (categoryData) => ({
  categories: categoryData,
  searchTerm: '',
  dialogVisible: false,
  categoryName: '',
});

const types = {
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_DIALOG_VISIBLE: 'SET_DIALOG_VISIBLE',
  SET_CATEGORY_NAME: 'SET_CATEGORY_NAME',
};

export const setSearchTerm = (searchTerm) => ({
  type: types.SET_SEARCH_TERM,
  payload: { searchTerm },
});
export const setCategories = (categories) => ({
  type: types.SET_CATEGORIES,
  payload: { categories },
});
export const setDialogVisible = (dialogVisible) => ({
  type: types.SET_DIALOG_VISIBLE,
  payload: { dialogVisible },
});

export const setCategoryName = (categoryName) => ({
  type: types.SET_CATEGORY_NAME,
  payload: { categoryName },
});


export const claimCategoriesReducer = (state = defaultState, action) => {
  switch (action.type) {
    case types.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload.searchTerm };
    case types.SET_CATEGORIES:
      return { ...state, categories: action.payload.categories };
    case types.SET_DIALOG_VISIBLE:
      return { ...state, dialogVisible: action.payload.dialogVisible };
    case types.SET_CATEGORY_NAME:
      return { ...state, categoryName: action.payload.categoryName };
    default:
      return state;
  }
};
