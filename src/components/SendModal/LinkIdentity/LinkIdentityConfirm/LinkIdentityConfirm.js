import {Component} from 'react';
import {Alert} from 'react-native';
import {connect} from 'react-redux';
import { setUserCoins } from '../../../../actions/actionCreators';
import {updateVerusIdWallet} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  activateChainLifecycle,
  clearChainLifecycle,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {linkVerusId} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT} from '../../../../utils/constants/sendModal';
import {LinkIdentityConfirmRender} from './LinkIdentityConfirm.render';

class LinkIdentityConfirm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      verusId: props.route.params.verusId,
      friendlyNames: props.route.params.friendlyNames,
    };
  }

  goBack() {
    this.props.setModalHeight();
    this.props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }

  submitData = async () => {
    await this.props.setLoading(true);
    await this.props.setPreventExit(true);

    try {
      const {identityaddress, name} = this.state.verusId.identity;
      const {coinObj} = this.props.sendModal;

      await linkVerusId(identityaddress, `${name}@`, coinObj.display_ticker);
      await updateVerusIdWallet();
      clearChainLifecycle(coinObj.id);
      this.props.dispatch(
        setUserCoins(
          this.props.activeCoinList,
          this.props.activeAccount.id
        )
      );
      activateChainLifecycle(coinObj);
      this.props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        verusId: this.state.verusId,
        friendlyNames: this.state.friendlyNames,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    this.props.setPreventExit(false);
    this.props.setLoading(false);
  };

  render() {
    return LinkIdentityConfirmRender.call(this);
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    sendModal: state.sendModal,
    activeAccount: state.authentication.activeAccount,
    activeCoinList: state.coins.activeCoinList,
  };
};

export default connect(mapStateToProps)(LinkIdentityConfirm);
