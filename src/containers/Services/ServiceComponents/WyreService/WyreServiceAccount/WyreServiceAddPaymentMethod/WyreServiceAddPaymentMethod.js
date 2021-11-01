/*
  This component represents the overview screen for KYC info given to a service
*/  

import React, { Component } from "react"
import { connect } from 'react-redux'
import { expireServiceData, setServiceLoading } from "../../../../../../actions/actionCreators";
import { conditionallyUpdateService } from "../../../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import store from "../../../../../../store";
import { requestPersonalData } from "../../../../../../utils/auth/authBox";
import { BANK_ACCOUNT_KEY_DISPLAY_INFO } from "../../../../../../utils/constants/bankAccountKeys";
import { API_GET_SERVICE_PAYMENT_METHODS } from "../../../../../../utils/constants/intervalConstants";
import { PERSONAL_PAYMENT_METHODS } from "../../../../../../utils/constants/personal";
import { translatePersonalBankAccountToWyreUpload } from "../../../../../../utils/services/translationUtils";
import WyreProvider from "../../../../../../utils/services/WyreProvider";
import { WyreServiceAddPaymentMethodRender } from "./WyreServiceAddPaymentMethod.render"

class WyreServiceAddPaymentMethod extends Component {
  constructor(props) {
    super(props);
    this.state = {
      payment_methods: {
        bank_accounts: [],
        bank_cards: [],
      },
    };
  }

  componentDidMount() {
    this.loadPersonalPaymentMethods();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedPaymentMethods !== this.props.encryptedPaymentMethods) {
      this.loadPersonalPaymentMethods();
    }
  }

  goToPersonalInfoScreen(route, params = {}) {
    this.props.navigation.navigate("PersonalHome", {
      screen: route,
      params: {
        ...params,
        // customBack: {
        //   route: "WyreServiceAddPaymentMethod",
        // },
      },
      initial: false,
    });
  }

  async selectAccount(account) {
    const wyreFormattedData = translatePersonalBankAccountToWyreUpload(account);

    if (wyreFormattedData.missing.length > 0) {
      let missingString =
        "This bank account is missing the following data fields required by Wyre:";
      let numMissing = 0;

      for (const missingProperty of wyreFormattedData.missing) {
        if (numMissing < 2 && BANK_ACCOUNT_KEY_DISPLAY_INFO[missingProperty]) {
          numMissing++;

          missingString =
            missingString + `\n\n• ${BANK_ACCOUNT_KEY_DISPLAY_INFO[missingProperty].title}`;
        } else if (numMissing == 2) {
          missingString = missingString + `\n\n+${wyreFormattedData.missing.length - 2} more`;
          break;
        }
      }

      createAlert("Missing data", missingString, [
        {
          text: "Configure",
          onPress: () => {
            this.goToPersonalInfoScreen("PersonalPaymentMethods");
            resolveAlert();
          },
          style: "cancel",
        },
        { text: "Ok", onPress: () => resolveAlert() },
      ]);
    } else if (wyreFormattedData.submission == null) {
      createAlert("Error", "An error occured while attempting to format your bank data");
    } else {
      this.props.dispatch(setServiceLoading(true));
      try {
        // Create payment method
        await WyreProvider.createPaymentMethod({ paymentMethod: wyreFormattedData.submission })

        // Update payment methods in redux store
        this.props.dispatch(expireServiceData(API_GET_SERVICE_PAYMENT_METHODS));
        await conditionallyUpdateService(
          store.getState(),
          this.props.dispatch,
          API_GET_SERVICE_PAYMENT_METHODS
        );

        // Stop loading and go back
        createAlert("Success", "Your bank account has been connected as a recipient account. If you would like to transfer & convert fiat from this account to your wallet, you can enable payments from it by pressing it, and submitting a bank statement.");
        this.props.dispatch(setServiceLoading(false));
        this.props.navigation.goBack();
      } catch (e) {
        this.props.dispatch(setServiceLoading(false));
        console.warn(e);
        const tryAgain = await createAlert(
          "Error",
          `Failed to connect bank account. ${e.message}.`,
          [
            {
              text: "Try again",
              onPress: async () => {
                resolveAlert(true);
              },
            },
            { text: "Ok", onPress: () => resolveAlert(false) },
          ]
        );

        if (tryAgain) {
          return await this.selectAccount(account);
        };
      }
    }
  }

  loadPersonalPaymentMethods() {
    this.setState({ loading: true }, async () => {
      this.setState({
        payment_methods: await requestPersonalData(PERSONAL_PAYMENT_METHODS),
      });
    });
  }

  render() {
    return WyreServiceAddPaymentMethodRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    loading: state.services.loading,
    encryptedPaymentMethods: state.personal.payment_methods
  };
};

export default connect(mapStateToProps)(WyreServiceAddPaymentMethod);