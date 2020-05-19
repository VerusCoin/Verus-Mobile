import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectClaimCategoriesToDisplay,
  selectShowEmptyClaimCategories,
  selectClaimsCountByCategory,
  selectClaimsByIdentityId,
  selectEmptyCategoryCount,
  selectClaimCategory,
} from '../../../selectors/identity';
import {
  setActiveClaimCategory,
  setShowEmptyClaimCategories,
  addNewCategory,
  deleteCategory,
} from '../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimCategories: selectClaimCategoriesToDisplay(state),
  showEmptyClaimCategories: selectShowEmptyClaimCategories(state),
  claims: selectClaimsByIdentityId(state),
  claimsCountByCategory: selectClaimsCountByCategory(state),
  emptyCategoryCount:selectEmptyCategoryCount(state),
  activeCategory: selectClaimCategory(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
      addNewCategory,
      deleteCategory,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
