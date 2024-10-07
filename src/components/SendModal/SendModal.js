import BigNumber from "bignumber.js";
import { Component } from "react"
import { connect } from 'react-redux'
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import {
  closeSendModal,
  setSendModalDataField,
  setSendModalVisible,
} from "../../actions/actions/sendModal/dispatchers/sendModal";
import {
  CONVERSION_SEND_MODAL,
  WITHDRAW_SEND_MODAL,
  TRADITIONAL_CRYPTO_SEND_MODAL,
  DEPOSIT_SEND_MODAL,
  LINK_IDENTITY_SEND_MODAL,
  AUTHENTICATE_USER_SEND_MODAL,
  PROVISION_IDENTITY_SEND_MODAL,
  ADD_PBAAS_CURRENCY_MODAL,
  CONVERT_OR_CROSS_CHAIN_SEND_MODAL,
  ADD_ERC20_TOKEN_MODAL,
  REVOKE_IDENTITY_SEND_MODAL,
  RECOVER_IDENTITY_SEND_MODAL,
} from "../../utils/constants/sendModal";
import { SendModalRender } from "./SendModal.render"
import { DEVICE_WINDOW_HEIGHT } from "../../utils/constants/constants";

class SendModal extends Component {
  constructor(props) {
    super(props);

    this.DEFAULT_MODAL_HEIGHTS = {
      [TRADITIONAL_CRYPTO_SEND_MODAL]: 624,
      [CONVERSION_SEND_MODAL]: 624,
      [WITHDRAW_SEND_MODAL]: 624,
      [DEPOSIT_SEND_MODAL]: 624,
      [LINK_IDENTITY_SEND_MODAL]: 442,
      [PROVISION_IDENTITY_SEND_MODAL]: 442,
      [AUTHENTICATE_USER_SEND_MODAL]: 442,
      [ADD_PBAAS_CURRENCY_MODAL]: 442,
      [ADD_ERC20_TOKEN_MODAL]: 442,
      [CONVERT_OR_CROSS_CHAIN_SEND_MODAL]: 696,
      [REVOKE_IDENTITY_SEND_MODAL]: 442,
      [RECOVER_IDENTITY_SEND_MODAL]: 624
    };

    for (const key in this.DEFAULT_MODAL_HEIGHTS) {
      if (this.DEFAULT_MODAL_HEIGHTS[key] > DEVICE_WINDOW_HEIGHT - 24) {
        this.DEFAULT_MODAL_HEIGHTS[key] = DEVICE_WINDOW_HEIGHT - 24
      }
    }

    this.state = {
      persistFormDataOnClose: false,
      loading: false,
      preventExit: false,
      modalHeight: this.DEFAULT_MODAL_HEIGHTS[props.sendModal.type]
    };
  }

  componentDidUpdate(lastProps) {
    if (lastProps.alertActive != this.props.alertActive) {
      this.setState(
        {
          persistFormDataOnClose: this.props.alertActive,
        },
        () => {
          setSendModalVisible(!this.props.alertActive);
        }
      );
    }
  }

  setModalHeight(height) {
    return new Promise((resolve) => {
      this.setState(
        {
          modalHeight:
            height == null ? this.DEFAULT_MODAL_HEIGHTS[this.props.sendModal.type] : height,
        },
        () => {
          resolve();
        }
      );
    });
  }

  setPreventExit(preventExit) {
    return new Promise((resolve) => {
      this.setState(
        {
          preventExit: preventExit
        },
        () => {
          resolve();
        }
      );
    });
  }

  // This is to be called from sub-components, so it doesn't call
  // cancel()
  setVisible(visible) {
    return new Promise((resolve) => {
      this.setState(
        {
          persistFormDataOnClose: !visible
        },
        () => {
          setSendModalVisible(visible);
          resolve()
        }
      );
    });
  }

  updateSendFormData(key, value) {
    setSendModalDataField(key, value);
  }

  showHelpModal() {
    createAlert("Help", this.props.sendModal.helpText);
  }

  setLoading(loading, preventExit = false) {
    return new Promise((resolve) => {
      this.setState(
        {
          loading,
          persistFormDataOnClose: preventExit,
        },
        () => {
          resolve();
        }
      );
    });
  }

  cancel() {
    if (!this.state.persistFormDataOnClose && !this.state.preventExit) {
      closeSendModal();
    }
  }

  render() {
    return SendModalRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    sendModal: state.sendModal,
    keyboard: state.keyboard,
    alertActive: state.alert.active,
  }
};

export default connect(mapStateToProps)(SendModal);