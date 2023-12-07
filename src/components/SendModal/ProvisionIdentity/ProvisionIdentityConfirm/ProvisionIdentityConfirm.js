import { fromBase58Check } from '@bitgo/utxo-lib/dist/src/address';
import {Component} from 'react';
import {Alert} from 'react-native';
import {connect} from 'react-redux';
import { primitives } from 'verusid-ts-client';
import { getIdentity  } from '../../../../utils/api/channels/verusid/callCreators';
import { signIdProvisioningRequest } from '../../../../utils/api/channels/vrpc/requests/signIdProvisioningRequest';
import {SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT, SEND_MODAL_IDENTITY_TO_PROVISION_FIELD} from '../../../../utils/constants/sendModal';
import {ProvisionIdentityConfirmRender} from './ProvisionIdentityConfirm.render';
import axios from "axios";
import { handleProvisioningResponse } from '../../../../utils/api/channels/vrpc/requests/handleProvisioningResponse';
import { LoadingNotification } from '../../../../utils/notification';
import { dispatchAddNotification } from '../../../../actions/actions/notifications/dispatchers/notifications';
import { NOTIFICATION_ICON_VERUSID } from '../../../../utils/constants/notifications';

class ProvisionIdentityConfirm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      primaryAddress: props.route.params.primaryAddress,
      provAddress: props.route.params.provAddress,
      provSystemId: props.route.params.provSystemId,
      provFqn: props.route.params.provFqn,
      provParent: props.route.params.provParent,
      provWebhook: props.route.params.provWebhook,
      friendlyNameMap: props.route.params.friendlyNameMap
    };
  }

  goBack() {
    this.props.setModalHeight();
    this.props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }

  submitData = async () => {
    await this.props.setLoading(true);
    await this.props.setPreventExit(true);

    const submissionSuccess = (response) => {
      this.props.setPreventExit(false);
      this.props.setLoading(false);
      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        response: response,
        success: true
      });
    }

    const submissionError = (msg) => {
      Alert.alert('Error', msg);

      this.props.setPreventExit(false);
      this.props.setLoading(false);
    }

    try {
      const {coinObj} = this.props.sendModal;

      const loginRequest = new primitives.LoginConsentRequest(this.props.sendModal.data.request)

      const webhookSubject = loginRequest.challenge.provisioning_info ? loginRequest.challenge.provisioning_info.find(x => {
        return x.vdxfkey === primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY.vdxfid
      }) : null

      if (webhookSubject == null) throw new Error("No endpoint for ID provisioning")

      const webhookUrl = webhookSubject.data

      const identity =
        this.props.sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD] !=
        null
          ? this.props.sendModal.data[
              SEND_MODAL_IDENTITY_TO_PROVISION_FIELD
            ].trim()
          : '';
      
      let identityName;
      let isIAddress;
      let parent;
      let systemid

      try {
        fromBase58Check(identity);
        isIAddress = true;
      } catch (e) {
        isIAddress = false;
      }

      if (isIAddress) {
        const identityObj = await getIdentity(coinObj.system_id, identity)
        
        if (identityObj.error) throw new Error(identityObj.error.message)
  
        identityName = identityObj.result.identity.name
        parent = identityObj.result.identity.parent;
        systemid = identityObj.result.identity.systemid;

      } else {
        identityName = identity.split("@")[0];
        parent = this.state.provParent ? this.state.provParent.data : null;
        systemid = this.state.provSystemId ? this.state.provSystemId.data : null;
      }

      const provisionRequest = new primitives.LoginConsentProvisioningRequest({
        signing_address: this.state.primaryAddress,
        challenge: new primitives.LoginConsentProvisioningChallenge({
          challenge_id: loginRequest.challenge.challenge_id,
          created_at: Number((Date.now() / 1000).toFixed(0)),
          name: identityName,
          system_id: systemid,
          parent: parent
        }),
      });

      const signedRequest = await signIdProvisioningRequest(coinObj, provisionRequest);

      const res = await axios.post(
        webhookUrl,
        signedRequest
      );

      await handleProvisioningResponse(coinObj, res.data, loginRequest.toBuffer().toString('base64'), 
        this.props.sendModal.data.fromService, async (fqn) => {

          const newLoadingNotification = new LoadingNotification (
            "",
            [`${fqn.split(".")[0]}@`, ` is being provisioned`],
            null,
            this.props.activeAccount.accountHash
          );  
          newLoadingNotification.icon = NOTIFICATION_ICON_VERUSID;

          await dispatchAddNotification(newLoadingNotification);
        });

      submissionSuccess(res.data)
    } catch (e) {
      submissionError(e.message)
    }
  };

  render() {
    return ProvisionIdentityConfirmRender.call(this);
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    sendModal: state.sendModal,
    activeAccount: state.authentication.activeAccount,
    activeCoinList: state.coins.activeCoinList,
  };
};

export default connect(mapStateToProps)(ProvisionIdentityConfirm);
