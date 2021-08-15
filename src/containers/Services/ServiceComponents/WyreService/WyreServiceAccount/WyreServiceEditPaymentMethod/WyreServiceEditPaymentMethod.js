/*
  This component represents the overview screen for KYC info given to a service
*/  

import React, { Component } from "react"
import { connect } from 'react-redux'
import { expireServiceData, setServiceLoading } from "../../../../../../actions/actionCreators";
import { conditionallyUpdateService } from "../../../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import Store from "../../../../../../store";
import { requestPersonalData } from "../../../../../../utils/auth/authBox";
import {
  API_GET_SERVICE_PAYMENT_METHODS,
  WYRE_SERVICE,
} from "../../../../../../utils/constants/intervalConstants";
import { PERSONAL_IMAGES } from "../../../../../../utils/constants/personal";
import {
  WYRE_DATA_SUBMISSION_ACTIVE,
  WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP,
  WYRE_DATA_SUBMISSION_PENDING,
} from "../../../../../../utils/constants/services";
import WyreProvider from "../../../../../../utils/services/WyreProvider";
import { WyreServiceEditPaymentMethodRender } from "./WyreServiceEditPaymentMethod.render"

class WyreServiceEditPaymentMethod extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      params: {
        paymentMethodId: props.route.params.paymentMethodId,
      },
      paymentMethod: props.wyrePaymentMethods.mapping[props.route.params.paymentMethodId],
      documents: [],
    };
  }

  async componentDidMount() {
    await this.initPersonalDocuments();

    await conditionallyUpdateService(
      Store.getState(),
      this.props.dispatch,
      API_GET_SERVICE_PAYMENT_METHODS
    );
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedPersonalImages !== this.props.encryptedPersonalImages) {
      this.initPersonalDocuments();
    }
  }

  async initPersonalDocuments() {
    try {
      this.props.dispatch(setServiceLoading(true));
      const personalInfo = await requestPersonalData(PERSONAL_IMAGES);

      this.setState(
        {
          documents: personalInfo.documents == null ? [] : personalInfo.documents,
        },
        () => this.props.dispatch(setServiceLoading(false))
      );
    } catch (e) {
      console.warn(e);
      createAlert("Error", "Error retrieving personal images");
      this.props.dispatch(setServiceLoading(false));
    }
  }

  goToPersonalInfoScreen(route, params = {}) {
    this.props.navigation.navigate("PersonalHome", {
      screen: route,
      params: {
        ...params,
        customBack: {
          route: "ServicesHome",
        },
      },
      initial: false,
    });
  }

  alertIncompleteOption() {
    createAlert(
      "Cannot submit",
      "The option you have selected is missing data required for submission to Wyre"
    );
  }

  async submitOption(paymentMethod, uris) {
    if (await this.canSubmitDataToWyre()) {
      return this.submitDataToWyre(
        () => WyreProvider.followupPaymentMethod({ paymentMethod, uris, format: "image/jpeg" })
      );
    }
  }

  async forceUpdate() {
    const updates = [API_GET_SERVICE_PAYMENT_METHODS];

    for (update of updates) {
      this.props.dispatch(expireServiceData(update));

      await conditionallyUpdateService(Store.getState(), this.props.dispatch, update);
    }
  }

  async canSubmitDataToWyre() {
    if (this.state.paymentMethod != null) {
      if (this.state.paymentMethod.status == WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP) return true;
      else {
        return await createAlert(
          "Are you sure?",
          this.state.paymentMethod.status == WYRE_DATA_SUBMISSION_PENDING
            ? `You've already submitted this data and it is currently pending approval. Are you sure you would like to override your previous submission and submit again?`
            : this.state.paymentMethod.status == WYRE_DATA_SUBMISSION_ACTIVE
            ? `You've already submitted this data and it has been approved. Are you sure you would like to override your previous submission and submit again? It will need to be re-approved.`
            : "",
          [
            {
              text: "No",
              onPress: async () => {
                resolveAlert(false);
              },
            },
            { text: "Yes", onPress: () => resolveAlert(true) },
          ]
        );
      }
    } else return false;
  }

  async canDeletePaymentMethod() {
    return await createAlert(
      "Are you sure?",
      "Are you sure you would like to remove this payment method from your Wyre account? This action cannot be undone.",
      [
        {
          text: "No",
          onPress: async () => {
            resolveAlert(false);
          },
        },
        { text: "Yes", onPress: () => resolveAlert(true) },
      ]
    );
  }

  async deletePaymentMethod(paymentMethod) {
    if (await this.canDeletePaymentMethod()) {
      return this.submitDataToWyre(
        () => WyreProvider.deletePaymentMethod({ paymentMethod }),
        "Bank account removed successfully."
      );
    }
  }

  async submitDataToWyre(
    submissionFunction,
    successMsg = "Data submitted to Wyre! Track its status in your Wyre service menu."
  ) {
    try {
      this.props.dispatch(setServiceLoading(true));
      await submissionFunction();

      await this.forceUpdate();

      this.props.navigation.goBack();
      this.props.dispatch(setServiceLoading(false));
      createAlert("Success", successMsg);

      return;
    } catch (e) {
      console.warn(e);
      const tryAgain = await createAlert(
        "Error",
        `Failed to connect to Wyre account. ${e.message}.`,
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
        return await this.submitDataToWyre(submissionFunction, successMsg);
      } else {
        this.props.dispatch(setServiceLoading(false));
      }
    }
  }

  render() {
    return WyreServiceEditPaymentMethodRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    loading: state.services.loading,
    encryptedPersonalImages: state.personal.images,
    wyrePaymentMethods:
      state.services.paymentMethods[WYRE_SERVICE] == null
        ? { list: [], mapping: {} }
        : state.services.paymentMethods[WYRE_SERVICE],
  };
};

export default connect(mapStateToProps)(WyreServiceEditPaymentMethod);