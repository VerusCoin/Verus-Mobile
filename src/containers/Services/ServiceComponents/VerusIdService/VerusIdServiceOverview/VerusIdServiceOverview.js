import React, { Component } from "react"
import { Platform } from 'react-native';
import { connect } from 'react-redux'
import { setServiceLoading, setUserCoins } from "../../../../../actions/actionCreators";
import { createAlert, resolveAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import { updateVerusIdWallet } from "../../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager";
import { clearChainLifecycle, refreshActiveChainLifecycles } from "../../../../../actions/actions/intervals/dispatchers/lifecycleManager";
import { unlinkVerusId } from "../../../../../actions/actions/services/dispatchers/verusid/verusid";
import { getFriendlyNameMap, getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { VERUSID_SERVICE_ID } from "../../../../../utils/constants/services";
import { VerusIdServiceOverviewRender } from "./VerusIdServiceOverview.render";
import { CoinDirectory } from "../../../../../utils/CoinData/CoinDirectory";
import Store from "../../../../../store";
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from "../../../../../actions/actions/updates/sessionRequests";

const captureRequestContext = () => {
  const state = Store.getState();

  return {
    sessionScope: captureSessionScope(state),
    accountId: state.authentication.activeAccount?.id,
    activeCoinList: state.coins.activeCoinList,
  };
};

const assertSessionCurrent = requestContext => {
  if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) {
    const error = new Error(
      "Account changed while the VerusID was being unlinked."
    );
    error.code = "SESSION_CHANGED";
    throw error;
  }
};

export class VerusIdServiceOverview extends Component {
  constructor(props) {
    super(props);

    this.state = {
      verusIdDetailsModalProps: null,
      identityActions: null,
      identityActionsVisible: false,
    };

    this.pendingIdentityAction = null;
    this.identityActionClosing = false;
  }

  componentDidUpdate(previousProps) {
    if (
      previousProps.activeAccount?.accountHash !== this.props.activeAccount?.accountHash ||
      previousProps.sessionEpoch !== this.props.sessionEpoch
    ) {
      // A selection and its pending action belong to the original session.
      this.pendingIdentityAction = null;
      this.identityActionClosing = false;

      this.setState({
        identityActions: null,
        identityActionsVisible: false,
        verusIdDetailsModalProps: null,
      });
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
    this.pendingIdentityAction = null;
  }

  openIdentityActionsModal = (chain, iAddress, displayName) => {
    if (this.identityActionClosing) return;

    this.pendingIdentityAction = null;
    this.setState({
      identityActions: {
        chain,
        iAddress,
        displayName,
        requestContext: captureRequestContext(),
      },
      identityActionsVisible: true,
    });
  };

  closeIdentityActionsModal = (selection, action = null) => {
    if (
      this.unmounted ||
      this.identityActionClosing ||
      this.state.identityActions !== selection
    ) return;

    if (action != null && !['transfer', 'modify', 'details', 'unlink'].includes(action))
      return;

    this.identityActionClosing = true;
    this.pendingIdentityAction = sessionScopeIsCurrent(Store.getState(), selection.requestContext.sessionScope)
      ? action
      : null;

    this.setState({identityActionsVisible: false}, () => {
      // iOS must dismiss the native sheet before presenting details or an alert.
      // Android's Modal does not call onDismiss, so its hidden state is enough.
      if (Platform.OS !== 'ios') this.finishIdentityAction(selection);
    });
  };

  finishIdentityAction = selection => {
    if (
      this.unmounted ||
      !this.identityActionClosing ||
      this.state.identityActions !== selection
    ) return;

    // Consume the queued action only after its sheet has finished closing.
    const action = this.pendingIdentityAction;
    this.pendingIdentityAction = null;
    this.identityActionClosing = false;

    this.setState({identityActions: null, identityActionsVisible: false}, () => {
      if (
        this.unmounted ||
        !sessionScopeIsCurrent(Store.getState(), selection.requestContext.sessionScope)
      ) return;

      const {chain, iAddress, displayName, requestContext} = selection;

      if (action === 'transfer' || action === 'modify') {
        this.props.navigation.navigate('IdentityManagement', {
          screen: action === 'transfer' ? 'IdentityTransfer' : 'IdentityModify',
          params: {chain, identityAddress: iAddress, displayName},
        });
      } else if (action === 'details') {
        this.openVerusIdDetailsModal(chain, iAddress, requestContext);
      } else if (action === 'unlink') {
        this.tryUnlinkIdentity(iAddress, chain, requestContext);
      }
    });
  };

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

  openLinkIdentitiesFromChain(chain) {
    return this.props.navigation.navigate('LinkIdentities', {chain});
  }

  async getVerusId(chain, iAddrOrName) {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  }

  openVerusIdDetailsModal(chain, iAddress, requestContext = captureRequestContext()) {
    if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) return;

    this.setState({
      verusIdDetailsModalProps: {
        loadVerusId: () => this.getVerusId(chain, iAddress),
        visible: true,
        animationType: 'slide',
        cancel: () => this.closeVerusIdDetailsModal(),
        loadFriendlyNames: () => this.loadFriendlyNameMap(chain, iAddress),
        iAddress,
        chain,
        requestContext,
      },
    });
  }

  closeVerusIdDetailsModal() {
    this.setState({
      verusIdDetailsModalProps: null,
    });
  }

  tryUnlinkIdentity = async (iAddress, chain, requestContext = captureRequestContext()) => {
    this.closeVerusIdDetailsModal()

    if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) return;
    
    if (await this.canUnlinkIdentity()) {
      return this.unlinkIdentity(iAddress, chain, requestContext)
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

  unlinkIdentity = async (
    iAddress,
    chain,
    requestContext = captureRequestContext(),
  ) => {

    try {
      assertSessionCurrent(requestContext);
      this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));
      const coinObj = CoinDirectory.findCoinObj(chain)
      await unlinkVerusId(iAddress, coinObj.id, requestContext);
      assertSessionCurrent(requestContext);
      await updateVerusIdWallet(requestContext);
      assertSessionCurrent(requestContext);
      clearChainLifecycle(coinObj.id);
      
      const setUserCoinsAction = setUserCoins(
        requestContext.activeCoinList,
        requestContext.accountId,
      );

      this.props.dispatch(setUserCoinsAction);

      refreshActiveChainLifecycles(setUserCoinsAction.payload.activeCoinsForUser);

      this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
    } catch (e) {
      if (sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) {
        createAlert('Error', e.message);
        this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
      }
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
    sessionEpoch: state.authentication.sessionEpoch || 0,
  };
};

export default connect(mapStateToProps)(VerusIdServiceOverview);
