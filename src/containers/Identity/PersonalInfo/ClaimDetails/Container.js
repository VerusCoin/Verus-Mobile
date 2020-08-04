import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  selectAttestationsByClaimId, selectClaimsByCategoryId,
  selectParentClaimsById, selectChildClaimsById, selectAttestationModalVisibility,
} from '../../../../selectors/identity';
import { setActiveAttestationId, setActiveClaim, setAttestationModalVisibility } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  attestationsData: selectAttestationsByClaimId(state),
  claims: selectClaimsByCategoryId(state),
  childClaims: selectChildClaimsById(state),
  parentClaims: selectParentClaimsById(state),
  attestationModalVisibility: selectAttestationModalVisibility(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveAttestationId,
      setActiveClaim,
      setAttestationModalVisibility,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
