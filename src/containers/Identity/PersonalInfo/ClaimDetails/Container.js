import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectAttestationsByClaimId, selectClaimsByCategoryId } from '../../../../selectors/identity';
import { setActiveAttestationId } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  attestationsData: selectAttestationsByClaimId(state),
  claims: selectClaimsByCategoryId(state),
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      setActiveAttestationId
    },
    dispatch
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
