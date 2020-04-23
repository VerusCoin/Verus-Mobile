import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaims, selectClaimCategories } from '../../../../selectors/identity';
import { setClaimVisibility } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claims: selectClaims(state),
  claimCategories: selectClaimCategories(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setClaimVisibility,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
