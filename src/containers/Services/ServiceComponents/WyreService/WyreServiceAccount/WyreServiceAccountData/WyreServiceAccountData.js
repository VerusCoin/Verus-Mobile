/*
  This component represents the overview screen for KYC info given to a service
*/  

import React, { Component } from "react"
import { Avatar } from "react-native-paper";
import { connect } from 'react-redux'
import { expireServiceData, setServiceLoading } from "../../../../../../actions/actionCreators";
import { conditionallyUpdateService } from "../../../../../../actions/actionDispatchers";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import Store from "../../../../../../store";
import { requestPersonalData } from "../../../../../../utils/auth/authBox";
import { API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS } from "../../../../../../utils/constants/intervalConstants";
import {
  PERSONAL_BIRTHDAY,
  PERSONAL_EMAILS,
  PERSONAL_IMAGES_DOCUMENTS,
  PERSONAL_IMAGE_TYPE_SCHEMA,
  PERSONAL_NAME,
  PERSONAL_PHONE_NUMBERS,
  PERSONAL_PHYSICAL_ADDRESSES,
  PERSONAL_TAX_COUNTRIES,
} from "../../../../../../utils/constants/personal";
import {
  WYRE_DATA_SUBMISSION_OPEN,
  WYRE_DATA_SUBMISSION_PENDING,
  WYRE_INDIVIDUAL_CELL,
  WYRE_INDIVIDUAL_DOB,
  WYRE_INDIVIDUAL_EMAIL,
  WYRE_INDIVIDUAL_NAME,
  WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
  WYRE_INDIVIDUAL_SSN,
} from "../../../../../../utils/constants/services";
import {
  renderPersonalAddress,
  renderPersonalBirthday,
  renderPersonalDocument,
  renderPersonalEmail,
  renderPersonalFullName,
  renderPersonalPhoneNumber,
  renderPersonalTaxId,
} from "../../../../../../utils/personal/displayUtils";
import {
  translatePersonalAddressToWyre,
  translatePersonalBirthdayToWyre,
  translatePersonalDocumentToWyreUpload,
} from "../../../../../../utils/services/translationUtils";
import WyreProvider from "../../../../../../utils/services/WyreProvider";
import { WyreServiceAccountDataRender } from "./WyreServiceAccountData.render"

class WyreServiceAccountData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      params: {
        wyreFieldData: null,
        configureRoute: null,
        configureRouteParams: {},
        infoType: "",
        infoKey: "",
        label: "",
        placeholder: "",
        selectLabel: "",
        optionsLabel: "",
        configureLabel: "",
        addLabel: "",
        addRoute: null,
        addRouteParams: {},
        options: null,
        missingDataDisplay: {}
      },
    };
  }

  componentDidMount() {
    this.initParams();
  }

  componentDidUpdate(lastProps) {
    if (
      lastProps.params !== this.props.params ||
      lastProps.encryptedPersonalInfo[this.state.params.infoType] !==
        this.props.encryptedPersonalInfo[this.state.params.infoType]
    ) {
      this.initParams();
    }
  }

  async getPersonalInfoOptions(infoType, infoKey) {
    const personalInfo = await requestPersonalData(infoType);
    return {
      options:
        personalInfo[infoKey] == null
          ? []
          : this.formatOptions(
              Array.isArray(personalInfo[infoKey])
                ? personalInfo[infoKey]
                : [personalInfo[infoKey]],
              infoKey
            ),
      personalInfo,
    };
  }

  goToPersonalInfoScreen(route, params = {}) {
    this.props.navigation.navigate("PersonalHome", {
      screen: route,
      params: {
        ...params,
        // customBack: {
        //   route: "ServicesHome",
        // },
      },
      initial: false,
    });
  }

  formatWyreDataFieldSubmission(fieldId, value) {
    return {
      updateObj: {
        profileFields: [{ fieldId, value }],
      },
    };
  }

  formatOptions(options, infoKey) {
    return options.map((option, index) => {
      switch (infoKey) {
        case PERSONAL_NAME:
          const fullNameString = renderPersonalFullName(option).title;

          return {
            title: fullNameString,
            submission: this.formatWyreDataFieldSubmission(
              WYRE_INDIVIDUAL_NAME,
              fullNameString
            ),
          };
        case PERSONAL_PHONE_NUMBERS:
          return {
            title: renderPersonalPhoneNumber(option).title,
            submission: this.formatWyreDataFieldSubmission(
              WYRE_INDIVIDUAL_CELL,
              renderPersonalPhoneNumber(option, false).title
            ),
          };
        case PERSONAL_EMAILS:
          const emailAddress = renderPersonalEmail(option).title;

          return {
            title: emailAddress,
            submission: this.formatWyreDataFieldSubmission(
              WYRE_INDIVIDUAL_EMAIL,
              emailAddress
            ),
          };
        case PERSONAL_BIRTHDAY:
          return {
            title: renderPersonalBirthday(option).title,
            submission: this.formatWyreDataFieldSubmission(
              WYRE_INDIVIDUAL_DOB,
              translatePersonalBirthdayToWyre(option)
            ),
          };
        case PERSONAL_TAX_COUNTRIES:
          return {
            title: renderPersonalTaxId(option).title,
            submission: this.formatWyreDataFieldSubmission(
              WYRE_INDIVIDUAL_SSN,
              option.tin
            ),
          };
        case PERSONAL_PHYSICAL_ADDRESSES:
          const addressRender = renderPersonalAddress(option);

          return {
            title: addressRender.title,
            submission: this.formatWyreDataFieldSubmission(
              WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
              translatePersonalAddressToWyre(option)
            ),
            description: addressRender.description,
          };
        case PERSONAL_IMAGES_DOCUMENTS:
          const documentRender = renderPersonalDocument(option);
          const submission = translatePersonalDocumentToWyreUpload(
            option,
            this.state.params.wyreFieldData != null
              ? this.state.params.wyreFieldData.fieldId
              : null
          );

          return {
            title: documentRender.title,
            incomplete:
              option.uris.length == null ||
              option.image_type == null ||
              PERSONAL_IMAGE_TYPE_SCHEMA[option.image_type] == null ||
              (PERSONAL_IMAGE_TYPE_SCHEMA[option.image_type].images != null &&
                option.uris.length !==
                  PERSONAL_IMAGE_TYPE_SCHEMA[option.image_type].images.length),
            submission: submission,
            description: documentRender.description,
            left: documentRender.left
          };
        default:
          return {
            title: option,
          };
      }
    });
  }

  alertIncompleteOption() {
    createAlert("Cannot submit", "The option you have selected is missing data required for submission to Wyre")
  }

  async submitOption(submission) {
    if (await this.canSubmitDataToWyre()) {
      return this.submitDataToWyre(
        this.state.params.wyreFieldData != null &&
          this.state.params.wyreFieldData.fieldType === "DOCUMENT"
          ? () => WyreProvider.uploadDocument(submission)
          : () => WyreProvider.updateAccount(submission)
      );
    }
  }

  async forceUpdate() {
    const updates = [API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS]

    for (update of updates) {
      this.props.dispatch(expireServiceData(update));

      await conditionallyUpdateService(
        Store.getState(),
        this.props.dispatch,
        update
      );
    }
  }

  async canSubmitDataToWyre() {
    if (this.state.params.wyreFieldData != null) {
      if (this.state.params.wyreFieldData.status == WYRE_DATA_SUBMISSION_OPEN)
        return true;
      else {
        return await createAlert(
          "Are you sure?",
          this.state.params.wyreFieldData.status == WYRE_DATA_SUBMISSION_PENDING
            ? `You've already submitted this data and it is currently pending approval. Are you sure you would like to override your previous submission and submit again?`
            : `You've already submitted this data and it has been approved. Are you sure you would like to override your previous submission and submit again? It will need to be re-approved.`,
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

  async submitDataToWyre(submissionFunction) {
    try {
      this.props.dispatch(setServiceLoading(true));
      await submissionFunction();

      await this.forceUpdate();

      this.props.navigation.goBack();
      this.props.dispatch(setServiceLoading(false));
      createAlert(
        "Success",
        "Data submitted to Wyre! Track its status in your Wyre service menu."
      );

      return;
    } catch (e) {
      console.warn(e);
      const tryAgain = await createAlert(
        "Error",
        `Failed to submit data to Wyre account. ${e.message}.`,
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
        return await this.submitDataToWyre(submissionFunction);
      } else {
        this.props.dispatch(setServiceLoading(false));
      }
    }
  }

  initParams() {
    if (this.props.params.wyreFieldData == null) {
      this.props.dispatch(setServiceLoading(true));
    } else {
      this.setState(
        {
          params: {
            ...this.state.params,
            ...this.props.params,
          },
        },
        async () => {
          try {
            if (this.state.params.options == null) {
              this.props.dispatch(setServiceLoading(true));
            }

            const { personalInfo, options } = await this.getPersonalInfoOptions(
              this.state.params.infoType,
              this.state.params.infoKey
            );

            this.setState(
              {
                params: {
                  ...this.state.params,
                  options,
                  configureRouteParams: {
                    [this.state.params.infoType]: personalInfo,
                  },
                  addRouteParams: {
                    [this.state.params.infoType]: personalInfo,
                  },
                },
              },
              () => {
                this.props.dispatch(setServiceLoading(false));
              }
            );
          } catch (e) {
            console.warn(e);
            createAlert("Error", "Error fetching data options");
          }
        }
      );
    }

    this.props.navigation.setOptions({ title: this.props.params.label });
  }

  render() {
    return WyreServiceAccountDataRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    params:
      state.channelStore_wyre_service.currentAccountDataScreenParams || {},
    loading: state.services.loading,
    encryptedPersonalInfo: state.personal
  };
};

export default connect(mapStateToProps)(WyreServiceAccountData);