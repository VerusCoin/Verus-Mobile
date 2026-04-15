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
import  { getVdxfId } from '../../../../utils/api/channels/vrpc/requests/getVdxfid';

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

    const submissionSuccess = (response, requestedFqn) => {
      this.props.setPreventExit(false);
      this.props.setLoading(false);
      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        response: response,
        fullyQualifiedName: requestedFqn,
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

      const provisioningRequestType =
        this.props.sendModal.data.provisioningRequestType ||
        (this.props.sendModal.data.provisioningDetailsBufferString ? 'generic' : 'loginconsent');

      let loginRequest = null;
      if (this.props.sendModal.data.request) {
        loginRequest = new primitives.LoginConsentRequest(this.props.sendModal.data.request)
      }

      let webhookUrl = this.state.provWebhook ? this.state.provWebhook.data : null;
      if (!webhookUrl && loginRequest && loginRequest.challenge.provisioning_info) {
        const webhookSubject = loginRequest.challenge.provisioning_info.find(x => {
          return x.vdxfkey === primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY.vdxfid
        });
        webhookUrl = webhookSubject ? webhookSubject.data : null;
      }

      if (webhookUrl == null) throw new Error("No endpoint for ID provisioning")

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
      let systemid;
      let nameId;
      let requestedFqn;

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
        nameId = identity;
        requestedFqn = identityObj.result.fullyqualifiedname;
        
      } else {
        identityName = identity.split("@")[0];
        parent = this.state.provParent ? this.state.provParent.data : null;
        systemid = this.state.provSystemId ? this.state.provSystemId.data : null;
        const parentObj = await getIdentity(coinObj.system_id, parent ? parent : loginRequest.system_id);

        if (parentObj.error) throw new Error(parentObj.error.message)

        requestedFqn = `${identityName.split(".")[0]}.${parentObj.result.fullyqualifiedname}`
        nameId = (await getVdxfId(coinObj.system_id, requestedFqn)).result.vdxfid;
      }

      const challengeId =
        this.props.sendModal.data.provisioningRequestID ||
        (loginRequest ? loginRequest.challenge.challenge_id : null);

      if (challengeId == null) throw new Error("Missing provisioning request ID");

      const provisionRequest = new primitives.LoginConsentProvisioningRequest({
        signing_address: this.state.primaryAddress,
        challenge: new primitives.LoginConsentProvisioningChallenge({
          challenge_id: challengeId,
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

      const provisioningSignerId =
        this.props.sendModal.data.provisioningSignerId ||
        (loginRequest ? loginRequest.signing_id : null);

      if (provisioningSignerId == null) throw new Error("Missing provisioning signer ID");

      const provisioningName = (await getIdentity(coinObj.system_id, provisioningSignerId)).result.identity.name;
      const newLoadingNotification = new LoadingNotification();

      const requestPayload =
        provisioningRequestType === 'generic'
          ? this.props.sendModal.data.provisioningRequestBufferString
          : loginRequest.toBuffer().toString('base64');

      if (provisioningRequestType === 'generic' && !requestPayload) {
        throw new Error("Missing provisioning request payload");
      }

      const hasResponseUris =
        this.props.sendModal.data.provisioningRequestHasResponseUris ||
        (loginRequest && loginRequest.challenge.redirect_uris && loginRequest.challenge.redirect_uris.length > 0);

      await handleProvisioningResponse(
        coinObj,
        res.data,
        requestPayload,
        this.props.sendModal.data.fromService,
        provisioningName,
        newLoadingNotification.uid,
        nameId,
        requestedFqn,
        async () => {
          
          newLoadingNotification.body = "";
          let formattedName = ''
          const lastDotIndex = requestedFqn.lastIndexOf('.');
          if (lastDotIndex === -1) formattedName = requestedFqn; // return the original string if there's no dot
          else formattedName = requestedFqn.substring(0, lastDotIndex);

          newLoadingNotification.title =  [`${formattedName}@`, ` is being provisioned by `, `${provisioningName}@`]
          newLoadingNotification.acchash = this.props.activeAccount.accountHash;
          newLoadingNotification.icon = NOTIFICATION_ICON_VERUSID;

          dispatchAddNotification(newLoadingNotification);
        },
        provisioningRequestType,
        provisioningSignerId,
        hasResponseUris
      );

      submissionSuccess(res.data, requestedFqn)
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
