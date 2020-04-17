import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectActiveAttestation, selectActiveAttestationId } from '../../../../selectors/identity';
import { toggleAttestationPin } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  attestation: selectActiveAttestation(state),
  activeAttestationId: selectActiveAttestationId(state),
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      toggleAttestationPin
    },
    dispatch
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
