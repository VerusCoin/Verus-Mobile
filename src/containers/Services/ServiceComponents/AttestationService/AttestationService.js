import React, { Component } from "react"
import { connect } from 'react-redux'
import { setServiceLoading } from "../../../../actions/actionCreators";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { requestServiceStoredData } from "../../../../utils/auth/authBox";
import { ATTESTATION_SERVICE_ID } from "../../../../utils/constants/services";
import { VerusAttestationRender } from "./AttestationService.render";
import { ATTESTATIONS_PROVISIONED } from "../../../../utils/constants/attestations";
import { requestAttestationData } from "../../../../utils/auth/authBox";

class AttestationService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attestations: {},
    };
    this.props.navigation.setOptions({title: 'Attestations'});
    const sdf=234
  }

  async getAttestations() {
    this.props.dispatch(setServiceLoading(true, ATTESTATION_SERVICE_ID));

    try {
      const attestationData = await requestAttestationData(ATTESTATIONS_PROVISIONED);
      if (attestationData) {
        this.setState({
          attestations: attestationData
        });
      } 
    } catch (e) {
      createAlert('Error Loading Attestations', e.message);
    }

    this.props.dispatch(setServiceLoading(false, ATTESTATION_SERVICE_ID));
  }

  componentDidMount() {

    this.getAttestations();
  }

  viewDetails = (attestation) => {
    this.props.navigation.navigate("ViewAttestation", {attestation}); 
  }

  componentDidUpdate(lastProps) {
  //  if (lastProps.encryptedIds !== this.props.encryptedIds) {
   //   this.getLinkedIds()
   // }
  }

  render() {
    return VerusAttestationRender.call(this);
  }
}

const mapStateToProps = state => {

  return {
    loading: state.services.loading[ATTESTATION_SERVICE_ID],
    attestestationdata: state.attestation
  };
};

export default connect(mapStateToProps)(AttestationService);