import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectAttestationsByClaimId, selectClaimsByCategoryId,
  selectParentClaimsById, selectChildClaimsById
} from '../../../../selectors/identity';
import { setActiveAttestationId, setActiveClaim } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  attestationsData: selectAttestationsByClaimId(state),
  claims: selectClaimsByCategoryId(state),
  childClaims: selectChildClaimsById(state),
  parentClaims: selectParentClaimsById(state),
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      setActiveAttestationId,
      setActiveClaim,
    },
    dispatch
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
