
const filteredData = (claimCategories, claims, searchValue) => {
  const newData = claimCategories.filter((claimCategory) => {
    const searchValueUpperCase = searchValue.toUpperCase();

    const claimCategoriesFilteredByName = claims
      .filter((item) =>  item.get('id').toUpperCase().includes(searchValueUpperCase))
      .keySeq()
      .map((item) => claims.get(item));

    const claimCategoryName = claimCategory.get('name', '');

    if (claimCategoryName.toUpperCase().includes(searchValueUpperCase)) {
      return true;
    }

    if (claimCategoriesFilteredByName.size === 0) {
      return false;
    }

    return claimCategoryName.includes(claimCategoriesFilteredByName.first().get('categoryId', ''));
  });
  return newData;
};

export default filteredData;
