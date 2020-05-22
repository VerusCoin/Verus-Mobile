import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  sortedClaimCategories,
  selectShowEmptyClaimCategories,
  selectClaimsCountByCategory,
  selectClaimsByIdentityId,
  selectEmptyCategoryCount,
  selectClaimCategory,
  selectClaimCategorySortBy,
} from '../../../selectors/identity';
import {
  setActiveClaimCategory,
  setShowEmptyClaimCategories,
  addNewCategory,
  deleteCategory,
  setCategorySortDirection,
  toggleShowHiddenClaims,
} from '../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimCategories: sortedClaimCategories(state),
  showEmptyClaimCategories: selectShowEmptyClaimCategories(state),
  claims: selectClaimsByIdentityId(state),
  claimsCountByCategory: selectClaimsCountByCategory(state),
  emptyCategoryCount:selectEmptyCategoryCount(state),
  activeCategory: selectClaimCategory(state),
  sortCategoriesBy: selectClaimCategorySortBy(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
      addNewCategory,
      deleteCategory,
      setCategorySortDirection,
      toggleShowHiddenClaims,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
