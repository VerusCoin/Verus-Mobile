import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectSortedClaims,
  selectShowHiddenClaims,
  selectAttestationsCountByClaim,
  selectHiddenClaimsCount,
  selectClaimsSortBy,
} from '../../../../selectors/identity';
import { setActiveClaim, toggleShowHiddenClaims, setClaimsSortDirection } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  claimsData: selectSortedClaims(state),
  showHiddenClaims: selectShowHiddenClaims(state),
  attestationsCountByClaim: selectAttestationsCountByClaim(state),
  hiddenClaimsCount: selectHiddenClaimsCount(state),
  sortClaimsBy: selectClaimsSortBy(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveClaim,
      toggleShowHiddenClaims,
      setClaimsSortDirection,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
