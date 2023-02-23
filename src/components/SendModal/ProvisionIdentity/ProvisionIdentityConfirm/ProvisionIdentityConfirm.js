import { fromBase58Check } from '@bitgo/utxo-lib/dist/src/address';
import {Component} from 'react';
import {Alert} from 'react-native';
import {connect} from 'react-redux';
import { primitives } from 'verusid-ts-client';
import { setUserCoins } from '../../../../actions/actionCreators';
import {updateVerusIdWallet} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  activateChainLifecycle,
  clearChainLifecycle,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {linkVerusId} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import { getIdentity } from '../../../../utils/api/channels/verusid/callCreators';
import { signIdProvisioningRequest } from '../../../../utils/api/channels/vrpc/requests/signIdProvisioningRequest';
import {SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT, SEND_MODAL_IDENTITY_TO_PROVISION_FIELD} from '../../../../utils/constants/sendModal';
import {ProvisionIdentityConfirmRender} from './ProvisionIdentityConfirm.render';
import axios from "axios";
import { handleProvisioningResponse } from '../../../../utils/api/channels/vrpc/requests/handleProvisioningResponse';

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
        response: response
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

      try {
        fromBase58Check(identity);
        isIAddress = true;
      } catch (e) {
        isIAddress = false;
      }

      if (isIAddress) {
        const identityObj = await getIdentity(coinObj, identity)
        
        if (identityObj.error) throw new Error(identityObj.error.message)
  
        identityName = identityObj.result.identity.name
      } else {
        identityName = identity.split("@")[0]
      }

      const provisionRequest = new primitives.LoginConsentProvisioningRequest({
        signing_address: this.state.primaryAddress,
        challenge: new primitives.LoginConsentProvisioningChallenge({
          challenge_id: loginRequest.challenge.challenge_id,
          created_at: Number((Date.now() / 1000).toFixed(0)),
          name: identityName,
          system_id: loginRequest.system_id,
          parent: loginRequest.parent
        }),
      });

      const signedRequest = await signIdProvisioningRequest(coinObj, provisionRequest)

      const res = await axios.post(
        webhookUrl,
        signedRequest
      );

      await handleProvisioningResponse(coinObj, res.data, 5, async (address, fqn) => {
        await linkVerusId(address, `${fqn}@`, coinObj.id);
        await updateVerusIdWallet();
        clearChainLifecycle(coinObj.id);
        this.props.dispatch(
          setUserCoins(
            this.props.activeCoinList,
            this.props.activeAccount.id
          )
        );
        activateChainLifecycle(coinObj);
      })
      submissionSuccess(res)
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
