import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectClaimCategoriesToDisplay, selectShowEmptyClaimCategories, selectClaimsCountByCategory, selectClaims, selectEmptyCategoryCount,
} from '../../../selectors/identity';
import { setActiveClaimCategory, setShowEmptyClaimCategories, addNewCategory } from '../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimCategories: selectClaimCategoriesToDisplay(state),
  showEmptyClaimCategories: selectShowEmptyClaimCategories(state),
  claims: selectClaims(state),
  claimsCountByCategory: selectClaimsCountByCategory(state),
  emptyCategoryCount:selectEmptyCategoryCount(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
      addNewCategory,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
