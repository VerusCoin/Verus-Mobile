import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaimsByIdentityId, selectClaimCategories, selectSelectedClaims } from '../../../../selectors/identity';
import { setClaimVisibility, updateSelectedClaims, clearSelectedClaims } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claims: selectClaimsByIdentityId(state),
  claimCategories: selectClaimCategories(state),
  selectedClaims: selectSelectedClaims(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setClaimVisibility,
      updateSelectedClaims,
      clearSelectedClaims,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
