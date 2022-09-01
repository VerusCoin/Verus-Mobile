import React, { Component } from "react"
import { connect } from 'react-redux'
import { openLinkIdentityModal, openSendModal } from "../../../../../actions/actions/sendModal/dispatchers/sendModal";
import { getFriendlyNameMap, getIdentity } from "../../../../../utils/api/channels/verusid/callCreators";
import { findCoinObj } from "../../../../../utils/CoinData/CoinData";
import { VERUSID } from "../../../../../utils/constants/intervalConstants";
import { VERUSID_SERVICE_ID } from "../../../../../utils/constants/services";
import { VerusIdServiceOverviewRender } from "./VerusIdServiceOverview.render";

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

      return getFriendlyNameMap({id: chain}, identityObj);
    } catch (e) {
      return {['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC'};
    }
  }

  openLinkIdentityModalFromChain(chain) {
    return openLinkIdentityModal(findCoinObj(chain));
  }

  async getVerusId(chain, iAddrOrName) {
    const identity = await getIdentity({id: chain}, iAddrOrName);

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
      },
    });
  }

  closeVerusIdDetailsModal() {
    this.setState({
      verusIdDetailsModalProps: null,
    });
  }

  render() {
    return VerusIdServiceOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    loading: state.services.loading[VERUSID_SERVICE_ID]
  };
};

export default connect(mapStateToProps)(VerusIdServiceOverview);