import {Component} from 'react';
import {connect} from 'react-redux';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {ProvisionIdentityResultRender} from './ProvisionIdentityResult.render';
import { primitives } from "verusid-ts-client"
import {CommonActions} from '@react-navigation/native';
class ProvisionIdentityResult extends Component {
  constructor(props) {
    super(props);

    this.state = {
      response: props.route.params == null ? new primitives.LoginConsentProvisioningResponse() : 
        new primitives.LoginConsentProvisioningResponse(props.route.params.response),
        fullyQualifiedName:  props.route.params.fullyQualifiedName
    };
  }

  async finishSend() {
    const provisioningState = this.state.response.decision.result.state;

    // Mark provisioning success so parent deeplink screens can route to Identity after close.
    if (
      provisioningState ===
        primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL.vdxfid ||
      provisioningState ===
        primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_COMPLETE.vdxfid
    ) {
      await this.props.updateSendFormData(
        "success",
        true,
      );
    }
    closeSendModal();
  }

  render() {
    return ProvisionIdentityResultRender.call(this);
  }
}

const mapStateToProps = state => {
  return {
    sendModal: state.sendModal,
  };
};

export default connect(mapStateToProps)(ProvisionIdentityResult);
