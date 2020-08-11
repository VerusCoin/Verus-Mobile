import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { selectActiveAttestation, } from '../../../../selectors/identity';
import { toggleAttestationPin, setAttestationModalVisibility } from '../../../../actions/actionCreators';

const mapStateToProps = (state) => ({
  attestation: selectActiveAttestation(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      toggleAttestationPin,
      setAttestationModalVisibility,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps);
