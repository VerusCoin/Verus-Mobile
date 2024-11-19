import React, { Component } from "react"
import { connect } from 'react-redux'
import { setServiceLoading, setUserCoins } from "../../../../../actions/actionCreators";
import { createAlert, resolveAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import { updateVerusIdWallet } from "../../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager";
import { clearChainLifecycle, refreshActiveChainLifecycles } from "../../../../../actions/actions/intervals/dispatchers/lifecycleManager";
import { openLinkIdentityModal } from "../../../../../actions/actions/sendModal/dispatchers/sendModal";
import { unlinkVerusId } from "../../../../../actions/actions/services/dispatchers/verusid/verusid";
import { getFriendlyNameMap, getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { VERUSID_SERVICE_ID } from "../../../../../utils/constants/services";
import { VerusIdServiceOverviewRender } from "./VerusIdServiceOverview.render";
import { CoinDirectory } from "../../../../../utils/CoinData/CoinDirectory";

class VerusIdServiceOverview extends Component {
  constructor(props) {
    super(props);

    this.state = {
      verusIdDetailsModalProps: null,
    };
  }

  async loadFriendlyNameMap(chain, iAddress) {
    try {
      const identityObj = await this.getVerusId(chain, iAddress);

      return getFriendlyNameMap(CoinDirectory.getBasicCoinObj(chain).system_id, identityObj);
    } catch (e) {
      return {
        ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
        ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
      };
    }
  }

  openLinkIdentityModalFromChain(chain) {
    return openLinkIdentityModal(CoinDirectory.findCoinObj(chain));
  }

  async getVerusId(chain, iAddrOrName) {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  }

  openVerusIdDetailsModal(chain, iAddress) {
    this.setState({
      verusIdDetailsModalProps: {
        loadVerusId: () => this.getVerusId(chain, iAddress),
        visible: true,
        animationType: 'slide',
        cancel: () => this.closeVerusIdDetailsModal(),
        loadFriendlyNames: () => this.loadFriendlyNameMap(chain, iAddress),
        iAddress,
        chain
      },
    });
  }

  closeVerusIdDetailsModal() {
    this.setState({
      verusIdDetailsModalProps: null,
    });
  }

  tryUnlinkIdentity = async (iAddress, chain) => {
    this.closeVerusIdDetailsModal()
    
    if (await this.canUnlinkIdentity()) {
      return this.unlinkIdentity(iAddress, chain)
    }
  }

  canUnlinkIdentity = () => {
    return createAlert(
      "Unlink Identity",
      "Are you sure you would like to unlink this identity from your wallet?",
      [
        {
          text: "No",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Yes", onPress: () => resolveAlert(true) },
      ],
      {
        cancelable: false,
      }
    );
  };

  unlinkIdentity = async (iAddress, chain) => {
    this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));

    try {
      const coinObj = CoinDirectory.findCoinObj(chain)
      await unlinkVerusId(iAddress, coinObj.id);
      await updateVerusIdWallet();
      clearChainLifecycle(coinObj.id);
      
      const setUserCoinsAction = setUserCoins(this.props.activeCoinList, this.props.activeAccount.id);

      this.props.dispatch(setUserCoinsAction);

      refreshActiveChainLifecycles(setUserCoinsAction.payload.activeCoinsForUser);

      this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
    } catch (e) {
      createAlert('Error', e.message);
      this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
    }
  };

  render() {
    return VerusIdServiceOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    loading: state.services.loading[VERUSID_SERVICE_ID],
    activeAccount: state.authentication.activeAccount,
    activeCoinList: state.coins.activeCoinList,
  };
};

export default connect(mapStateToProps)(VerusIdServiceOverview);