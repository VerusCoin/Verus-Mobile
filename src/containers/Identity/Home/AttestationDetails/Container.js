import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectActiveAttestation } from '../../../../selectors/identity';
import { toggleAttestationPin } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  attestation: selectActiveAttestation(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      toggleAttestationPin,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
