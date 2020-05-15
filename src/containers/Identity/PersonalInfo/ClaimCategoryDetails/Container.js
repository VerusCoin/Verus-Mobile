import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectClaimsToDisplay, selectShowHiddenClaims, selectAttestationsCountByClaim, selectHiddenClaimsCount,
} from '../../../../selectors/identity';
import { setActiveClaim, toggleShowHiddenClaims } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimsData: selectClaimsToDisplay(state),
  showHiddenClaims: selectShowHiddenClaims(state),
  attestationsCountByClaim: selectAttestationsCountByClaim(state),
  hiddenClaimsCount:selectHiddenClaimsCount(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaim,
      toggleShowHiddenClaims,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
