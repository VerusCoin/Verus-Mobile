import { fromBase58Check } from "@bitgo/utxo-lib/dist/src/address";
import { Component } from "react"
import { Alert } from "react-native";
import { connect } from 'react-redux'
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getFriendlyNameMap, getIdentity } from "../../../../utils/api/channels/verusid/callCreators";
import { requestSeeds } from "../../../../utils/auth/authBox";
import { ELECTRUM } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_FORM_STEP_CONFIRM, SEND_MODAL_IDENTITY_TO_LINK_FIELD } from "../../../../utils/constants/sendModal";
import { deriveKeyPair } from "../../../../utils/keys";
import { LinkIdentityFormRender } from "./LinkIdentityForm.render"

class LinkIdentityForm extends Component {
  constructor(props) {
    super(props);
  }

  formHasError = () => {
    const {data} = this.props.sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_LINK_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_LINK_FIELD].trim()
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

  getPotentialPrimaryAddresses = async (coinObj, channel) => {
    const seeds = await requestSeeds();

    const seed = seeds[channel];

    const keyObj = await deriveKeyPair(seed, coinObj, channel);
    const {addresses} = keyObj;

    return addresses;
  };

  submitData = async () => {
    if (this.formHasError()) return;

    this.props.setLoading(true);

    const {coinObj, data} = this.props.sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_LINK_FIELD];

    try {
      const res = await getIdentity(coinObj, identity);

      if (res.error) {
        throw new Error(res.error.message);
      }

      const addrs = await this.getPotentialPrimaryAddresses(
        coinObj,
        ELECTRUM,
      );

      let isInWallet = false;

      for (const address of res.result.identity.primaryaddresses) {
        if (addrs.includes(address)) {
          isInWallet = true;
          break;
        }
      }

      if (!isInWallet) {
        throw new Error(
          'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
        );
      }

      const friendlyNames = await getFriendlyNameMap(coinObj, res.result);

      this.props.setModalHeight(696);

      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        verusId: res.result,
        friendlyNames,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    this.props.setLoading(false);
  };

  render() {
    return LinkIdentityFormRender.call(this);
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.sendModal.coinObj.id
 
  return {
    sendModal: state.sendModal,
    addresses: state.authentication.activeAccount.keys[chainTicker]
  };
};

export default connect(mapStateToProps)(LinkIdentityForm);