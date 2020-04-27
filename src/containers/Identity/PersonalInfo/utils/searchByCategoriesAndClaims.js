
const filteredData = (claimCategories, claims, searchValue) => {
  const newData = claimCategories.filter((claimCategory) => {
    const searchValueUpperCase = searchValue.toUpperCase();

    const claimCategoriesFilteredByName = claims
      .filter((item) => item.get('name').toUpperCase().includes(searchValueUpperCase))
      .keySeq()
      .map((item) => claims.get(item));

    const claimCategoryId = claimCategory.get('id', '');
    const claimCategoryName = claimCategory.get('name', '').toUpperCase();

    if (claimCategoryName.includes(searchValueUpperCase)) {
      return true;
    }

    if (claimCategoriesFilteredByName.size === 0) {
      return false;
    }

    return claimCategoryId.includes(claimCategoriesFilteredByName.first().get('categoryId', ''));
  });
  return newData;
};

export default filteredData;
