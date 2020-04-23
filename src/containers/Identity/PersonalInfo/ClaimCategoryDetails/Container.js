import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectClaimsToDisplay, selectShowHiddenClaims } from '../../../../selectors/identity';
import { setActiveClaim, setShowHiddenClaims } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claims: selectClaimsToDisplay(state),
  showHiddenClaims: selectShowHiddenClaims(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaim,
      setShowHiddenClaims,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
