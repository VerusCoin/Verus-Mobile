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
      response: new primitives.LoginConsentProvisioningResponse(props.route.params.response),
    };
  }

  async finishSend() {
    //if the ID is pending approval, we don't want to close the modal
    if (this.state.response.decision.result.state === primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL.vdxfid) {
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
