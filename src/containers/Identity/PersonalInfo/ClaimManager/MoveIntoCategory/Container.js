import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaimCategories } from '../../../../../selectors/identity';
import { moveClaimsToCategory, clearSelectedClaims } from '../../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  categories: selectClaimCategories(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      moveClaimsToCategory,
      clearSelectedClaims,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
