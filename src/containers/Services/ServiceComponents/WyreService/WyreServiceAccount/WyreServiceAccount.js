import React, { Component } from "react"
import { connect } from 'react-redux'
import { createAlert, resolveAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import { requestSeeds } from "../../../../../utils/auth/authBox";
import { WYRE_SERVICE } from "../../../../../utils/constants/intervalConstants";
import WyreProvider from "../../../../../utils/services/WyreProvider";
import WyreServiceAccountCreator from "./WyreServiceAccountCreator/WyreServiceAccountCreator";

class WyreServiceAccount extends Component {
  constructor(props) {
    super(props);
    this.props.navigation.setOptions({ title: "Wyre" });
  }

  componentDidMount() {
    this.initAccountStatus()
  }

  initAccountStatus = () => {
    this.props.setLoading(true, async () => {
      try {
        await this.checkAccountCreationStatus();
        this.props.setLoading(false);
      } catch (e) {        
        console.warn(e)
        createAlert(
          "Error",
          "Failed to retrieve Wyre account status from server.",
          [
            {
              text: "Try again",
              onPress: () => {
                this.initAccountStatus()
                resolveAlert()
              }
            },
            { text: "Ok", onPress: () => resolveAlert() },
          ]
        );
      }
    });
  };

  async checkAccountCreationStatus() {
    if (!this.props.wyreAuthenticated) {
      const seed = (await requestSeeds())[WYRE_SERVICE];
      if (seed == null) throw new Error("No Wyre seed present");
      await WyreProvider.authenticate(seed);
    }
  }

  render() {
    return this.props.hasWyreAccount ? null : (
      <WyreServiceAccountCreator
        navigation={this.props.navigation}
        setLoading={this.props.setLoading}
      />
    );
  }
}

const mapStateToProps = (state) => {
  return {
    encryptedSeeds: state.authentication.activeAccount.seeds,
    hasWyreAccount: state.channelStore_wyre_service.accountId != null,
    wyreAuthenticated: state.channelStore_wyre_service.authenticated 
  }
};

export default connect(mapStateToProps)(WyreServiceAccount);