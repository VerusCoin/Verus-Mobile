import { fromBase58Check } from "bitgo-utxo-lib/src/address";
import { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { primitives } from "verusid-ts-client";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getIdentity } from "../../../../utils/api/channels/verusid/callCreators";
import { requestSeeds } from "../../../../utils/auth/authBox";
import { ELECTRUM } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_FORM_STEP_CONFIRM, SEND_MODAL_IDENTITY_TO_PROVISION_FIELD } from "../../../../utils/constants/sendModal";
import { deriveKeyPair } from "../../../../utils/keys";
import { ProvisionIdentityFormRender } from "./ProvisionIdentityForm.render"

class ProvisionIdentityForm extends Component {
  constructor(props) {
    super(props);

    this.hasProvisioningInfo =
      this.props.sendModal.data.request != null &&
      this.props.sendModal.data.request.challenge.provisioning_info != null;

    this.state = {
      friendlyNameMap: {},
      provisioningInfo: this.hasProvisioningInfo
        ? this.props.sendModal.data.request.challenge.provisioning_info
        : [],
      provAddress: null,
      provSystemId: null,
      provFqn: null,
      provParent: null,
      provWebhook: null,
      assignedIdentity: null,
      loading: false
    };
  }

  componentDidMount() {
    this.setState({loading: true}, async () => {
      await this.updateProvisioningInfoProcessedData()
      const provIdKey = this.state.provAddress ? this.state.provAddress : this.state.provFqn
  
      const identitykeys = [
        this.state.provAddress ? this.state.provAddress : this.state.provFqn,
      ];
  
      if (this.state.provParent) identitykeys.push(this.state.provParent)
      if (this.state.provSystemId) identitykeys.push(this.state.provSystemId)
      
      let friendlyNameMap = this.state.friendlyNameMap
      let assignedIdentity = null;
  
      for (const idKey of identitykeys) {
        if (idKey != null) {
          const identity = await getIdentity(
            this.props.sendModal.coinObj,
            idKey.data,
          );
    
          if (identity.result) {
            friendlyNameMap[identity.result.identity.identityaddress] =
              identity.result.identity.name;
            
            if (idKey.data === provIdKey.data) {
              assignedIdentity = identity.result.identity.identityaddress
            }
          }
        }
      }
  
      this.setState({ friendlyNameMap, assignedIdentity, loading: false }, () => {
        if (this.state.assignedIdentity != null) {
          this.props.updateSendFormData(
            SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
            this.state.assignedIdentity,
          );
        }
      });
    })
  }

  async updateProvisioningInfoProcessedData() {
    return new Promise((resolve, reject) => {      
      try {
        let provAddress,
          provSystemId,
          provFqn,
          provParent,
          provWebhook = null;

        if (this.hasProvisioningInfo) {
          provAddress =
            this.props.sendModal.data.request.challenge.provisioning_info.find(x => {
              return x.vdxfkey === primitives.ID_ADDRESS_VDXF_KEY.vdxfid;
            });

          provSystemId =
            this.props.sendModal.data.request.challenge.provisioning_info.find(x => {
              return x.vdxfkey === primitives.ID_SYSTEMID_VDXF_KEY.vdxfid;
            });

          provFqn = this.props.sendModal.data.request.challenge.provisioning_info.find(
            x => {
              return (
                x.vdxfkey === primitives.ID_FULLYQUALIFIEDNAME_VDXF_KEY.vdxfid
              );
            },
          );

          provParent = this.props.sendModal.data.request.challenge.provisioning_info.find(
            x => {
              return x.vdxfkey === primitives.ID_PARENT_VDXF_KEY.vdxfid;
            },
          );

          provWebhook =
            this.props.sendModal.data.request.challenge.provisioning_info.find(x => {
              return (
                x.vdxfkey ===
                primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY.vdxfid
              );
            });
        }

        this.setState(
          {
            provAddress,
            provSystemId,
            provFqn,
            provParent,
            provWebhook,
          },
          () => {
            resolve();
          },
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  formHasError = () => {
    const {data} = this.props.sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      createAlert('Required Field', 'Identity is a required field.');
      return true;
    }

    try {
      fromBase58Check(identity);
    } catch (e) {
      if (!identity.endsWith('@')) {
        createAlert(
          'Invalid Identity',
          'Identity not a valid identity handle or iAddress.',
        );
        return true;
      }
    }

    return false;
  };

  getPotentialPrimaryAddresses = async (chainTicker, channel) => {
    const seeds = await requestSeeds();

    const seed = seeds[channel];

    const keyObj = await deriveKeyPair(seed, chainTicker, channel);
    const {addresses} = keyObj;

    return addresses;
  };

  submitData = async () => {
    if (this.formHasError()) return;

    this.props.setLoading(true);

    const {coinObj, data} = this.props.sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD];

    try {
      const res = await getIdentity(coinObj, identity);

      if (res.error && res.error.code !== -5) {
        throw new Error(res.error.message);
      } else if (
        !this.state.assignedIdentity &&
        !res.error &&
        res.result != null
      ) {
        throw new Error('Identity name taken, please select a different name');
      }

      const addrs = await this.getPotentialPrimaryAddresses(
        coinObj.id,
        ELECTRUM,
      );

      this.props.setModalHeight(496);

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        primaryAddress: addrs[0],
        provAddress: this.state.provAddress,
        provSystemId: this.state.provSystemId,
        provFqn: this.state.provFqn,
        provParent: this.state.provParent,
        provWebhook: this.state.provWebhook,
        friendlyNameMap: this.state.friendlyNameMap
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    this.props.setLoading(false);
  };

  render() {
    return ProvisionIdentityFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.sendModal.coinObj.id
 
  return {
    sendModal: state.sendModal,
    addresses: state.authentication.activeAccount.keys[chainTicker]
  };
};

export default connect(mapStateToProps)(ProvisionIdentityForm);