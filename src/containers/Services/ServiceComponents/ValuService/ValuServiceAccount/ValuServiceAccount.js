import React, { Component } from "react"
import { connect } from 'react-redux'

import { setServiceLoading } from "../../../../../actions/actionCreators";
import { createAlert, resolveAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import { VALU_SERVICE_ID } from "../../../../../utils/constants/services";
import ValuProvider from "../../../../../utils/services/ValuProvider";
import ValuAccountCreator from "./ValuServiceAccountCreator/ValuAccountCreator";
import ValuServiceAccountOverview from "./ValuServiceAccountOverview/ValuServiceAccountOverview";
import KYCInfoScreen from "./ValuServiceKyc/KYCInfoScreen"
import { requestServiceStoredData } from "../../../../../utils/auth/authBox";
import { setValuAccountStage, setValuAccount } from "../../../../../actions/actionCreators";

class ValuServiceAccount extends Component {
  constructor(props) {
    super(props);
    this.props.navigation.setOptions({ title: "Valu" });
    this.state = {
      KYCState: null,
      email: null,
      loginReply: props.route?.params ? props.route?.params : null,
    }
  }

  componentDidMount() {
    this.initAccountStatus()
  }

  initAccountStatus = async () => {
    this.props.dispatch(setServiceLoading(true, VALU_SERVICE_ID))

    try {
      await this.checkAccountCreationStatus();
      this.props.dispatch(setServiceLoading(false, VALU_SERVICE_ID))
    } catch (e) {
      console.warn(e)

      createAlert(
        "Error",
        "Failed to retrieve Valu account status from server.",
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

    const serviceData = await requestServiceStoredData(VALU_SERVICE_ID);

    if (serviceData?.KYCState) {
      this.props.dispatch(setValuAccountStage(serviceData.KYCState));
    } else {
      this.props.dispatch(setValuAccountStage(0));
    }

    if (serviceData?.loginDetails) {

      const { success } = serviceData // await ValuProvider.authenticate(serviceData.loginDetails.accountID);

      if (success) {
        if (serviceData.loginDetails?.accountId)
          this.props.dispatch(setValuAccount({ accountId: serviceData.loginDetails.accountId, KYCState: serviceData.KYCState || 0 }));
      }
    }
  }

  render() {

    if (this.props.KYCState == null)
      return (<></>);
    else if (this.props.KYCState == 9)
      return (<ValuServiceAccountOverview navigation={this.props.navigation} />)
    else if (this.props.KYCState > 0)
      return (<KYCInfoScreen navigation={this.props.navigation} />)
    else
      return (<ValuAccountCreator navigation={this.props.navigation} route={this.props.route}/>)
  }

}

const mapStateToProps = (state) => {

  return {
    hasValuAccount: state.channelStore_valu_service?.accountId != null,
    KYCState: state.channelStore_valu_service?.KYCState,
    valuAuthenticated: state.channelStore_valu_service?.authenticated,
    email: state.channelStore_valu_service?.email
  };
};

export default connect(mapStateToProps)(ValuServiceAccount);