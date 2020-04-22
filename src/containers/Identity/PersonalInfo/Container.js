import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaimCategoriesToDisplay, selectShowEmptyClaimCategories } from '../../../selectors/identity';
import { setActiveClaimCategory, setShowEmptyClaimCategories } from '../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimCategories: selectClaimCategoriesToDisplay(state),
  showEmptyClaimCategories: selectShowEmptyClaimCategories(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
