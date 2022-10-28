import React, { Component } from "react"
import { connect } from 'react-redux'
import { setServiceLoading } from "../../../../../actions/actionCreators";
import { createAlert, resolveAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import { requestSeeds } from "../../../../../utils/auth/authBox";
import { WYRE_SERVICE } from "../../../../../utils/constants/intervalConstants";
import { WYRE_SERVICE_ID } from "../../../../../utils/constants/services";
import WyreProvider from "../../../../../utils/services/WyreProvider";
import WyreServiceAccountCreator from "./WyreServiceAccountCreator/WyreServiceAccountCreator";
import WyreServiceAccountOverview from "./WyreServiceAccountOverview/WyreServiceAccountOverview";

class WyreServiceAccount extends Component {
  constructor(props) {
    super(props);
    this.props.navigation.setOptions({ title: "Wyre" });
  }

  componentDidMount() {
    this.initAccountStatus()
  }

  initAccountStatus = async () => {
    this.props.dispatch(setServiceLoading(true, WYRE_SERVICE_ID))

    try {
      await this.checkAccountCreationStatus();
      this.props.dispatch(setServiceLoading(false, WYRE_SERVICE_ID))
    } catch (e) {        
      console.warn(e)

      createAlert(
        "Error",
        "Failed to retrieve Wyre account status from server.",
        [
          {
            text: "Try again",
            onPress: async () => {
              await this.initAccountStatus()
              resolveAlert()
            }
          },
          { text: "Ok", onPress: () => resolveAlert() },
        ]
      );
    }
  };

  async checkAccountCreationStatus() {
    if (!this.props.wyreAuthenticated) {
      const seed = (await requestSeeds())[WYRE_SERVICE];
      if (seed == null) throw new Error("No Wyre seed present");
      await WyreProvider.authenticate(seed);
    }
  }

  render() {
    return this.props.hasWyreAccount ? (
      <WyreServiceAccountOverview navigation={this.props.navigation} />
    ) : (
      <WyreServiceAccountCreator navigation={this.props.navigation} />
    );
  }
}

const mapStateToProps = (state) => {
  return {
    encryptedSeeds: state.authentication.activeAccount.seeds,
    hasWyreAccount: state.channelStore_wyre_service.accountId != null,
    hasWyreAccountEmail:
      state.services.accounts[WYRE_SERVICE] != null &&
      state.services.accounts[WYRE_SERVICE].profileFields.find((x) => x.fieldType === "EMAIL")
        .value != null,
    wyreAuthenticated: state.channelStore_wyre_service.authenticated,
  };
};

export default connect(mapStateToProps)(WyreServiceAccount);