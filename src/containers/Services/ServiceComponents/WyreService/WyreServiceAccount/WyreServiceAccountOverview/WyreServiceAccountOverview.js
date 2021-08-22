/*
  This component represents the overview screen for KYC info given to a service
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { setCurrentWyreAccountDataScreenParams, setServiceLoading } from "../../../../../../actions/actionCreators";
import { conditionallyUpdateService } from "../../../../../../actions/actionDispatchers";
import { createAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import { requestServiceStoredData } from "../../../../../../utils/auth/authBox";
import { API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS, WYRE_SERVICE } from "../../../../../../utils/constants/intervalConstants";
import {
  PERSONAL_ATTRIBUTES,
  PERSONAL_BIRTHDAY,
  PERSONAL_CONTACT,
  PERSONAL_EMAILS,
  PERSONAL_IMAGES,
  PERSONAL_IMAGES_DOCUMENTS,
  PERSONAL_LOCATIONS,
  PERSONAL_NAME,
  PERSONAL_PHONE_NUMBERS,
  PERSONAL_PHYSICAL_ADDRESSES,
  PERSONAL_TAX_COUNTRIES,
} from "../../../../../../utils/constants/personal";
import {
  WYRE_INDIVIDUAL_CELL,
  WYRE_INDIVIDUAL_DOB,
  WYRE_INDIVIDUAL_EMAIL,
  WYRE_INDIVIDUAL_GOVERNMENT_ID,
  WYRE_INDIVIDUAL_NAME,
  WYRE_INDIVIDUAL_PROOF_OF_ADDRESS,
  WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
  WYRE_INDIVIDUAL_SSN,
  WYRE_SERVICE_ID,
} from "../../../../../../utils/constants/services";
import { renderPersonalAddress, renderPersonalFullName } from "../../../../../../utils/personal/displayUtils";
import { renderWyreDataField, translateWyreAddressToPersonal } from "../../../../../../utils/services/translationUtils";
import { WyreServiceAccountOverviewRender } from "./WyreServiceAccountOverview.render"

class WyreServiceAccountOverview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      wyreProfileFieldIndexMap: null,
      documentRenders: {}
    };

    this.WYRE_ACCOUNT_PERSONAL_INFO_SCHEMA = {
      [WYRE_INDIVIDUAL_NAME]: {
        wyreFieldId: WYRE_INDIVIDUAL_NAME,
        configureRoute: "PersonalAttributesEditName",
        configureLabel: "Configure name",
        infoType: PERSONAL_ATTRIBUTES,
        infoKey: PERSONAL_NAME,
        label: "Legal name",
        placeholder: "Submit name",
        selectLabel: "Select name to submit",
        optionsLabel: "Name options",
        missingDataDisplay: {
          icon: "format-letter-case",
          label: "You'll need to add your name to your personal profile to submit it here.",
        },
      },
      [WYRE_INDIVIDUAL_CELL]: {
        wyreFieldId: WYRE_INDIVIDUAL_CELL,
        configureRoute: "PersonalContact",
        configureLabel: "Configure phone numbers",
        infoType: PERSONAL_CONTACT,
        infoKey: PERSONAL_PHONE_NUMBERS,
        label: "Phone number",
        placeholder: "Submit phone",
        selectLabel: "Select number to submit",
        optionsLabel: "Name options",
        missingDataDisplay: {
          icon: "phone",
          label:
            "You'll need to add at least one phone number to your personal profile to submit one here.",
        },
      },
      [WYRE_INDIVIDUAL_EMAIL]: {
        wyreFieldId: WYRE_INDIVIDUAL_EMAIL,
        configureRoute: "PersonalContact",
        configureLabel: "Configure emails",
        infoType: PERSONAL_CONTACT,
        infoKey: PERSONAL_EMAILS,
        label: "Email",
        placeholder: "Submit email",
        selectLabel: "Select email to submit",
        optionsLabel: "Name options",
        missingDataDisplay: {
          icon: "email",
          label:
            "You'll need to add at least one email to your personal profile to submit one here.",
        },
      },
      [WYRE_INDIVIDUAL_RESIDENCE_ADDRESS]: {
        wyreFieldId: WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
        configureRoute: "PersonalLocations",
        configureLabel: "Configure addresses",
        infoType: PERSONAL_LOCATIONS,
        infoKey: PERSONAL_PHYSICAL_ADDRESSES,
        label: "Residence address",
        placeholder: "Submit address",
        selectLabel: "Select address to submit",
        optionsLabel: "Name options",
        missingDataDisplay: {
          icon: "home",
          label:
            "You'll need to add at least one address to your personal profile to submit one here.",
        },
      },
      [WYRE_INDIVIDUAL_DOB]: {
        wyreFieldId: WYRE_INDIVIDUAL_DOB,
        configureRoute: "PersonalAttributes",
        configureLabel: "Configure birthday",
        infoType: PERSONAL_ATTRIBUTES,
        infoKey: PERSONAL_BIRTHDAY,
        label: "Date of birth",
        placeholder: "Submit birthday",
        selectLabel: "Select birthday to submit",
        optionsLabel: "Name options",
        missingDataDisplay: {
          icon: "cake-variant",
          label: "You'll need to add your birthday to your personal profile to submit it here.",
        },
      },
      [WYRE_INDIVIDUAL_SSN]: {
        wyreFieldId: WYRE_INDIVIDUAL_SSN,
        configureRoute: "PersonalLocations",
        configureLabel: "Configure tax IDs",
        infoType: PERSONAL_LOCATIONS,
        infoKey: PERSONAL_TAX_COUNTRIES,
        label: "Taxpayer ID",
        placeholder: "Submit tax ID",
        selectLabel: "Select ID to submit",
        optionsLabel: "Name options",
        missingDataDisplay: {
          icon: "card-text-outline",
          label:
            "You'll need to add your social security number to your personal profile to submit it here.",
        },
      },
    };

    this.WYRE_ACCOUNT_DOCUMENTS_SCHEMA = {
      [WYRE_INDIVIDUAL_GOVERNMENT_ID]: {
        wyreFieldId: WYRE_INDIVIDUAL_GOVERNMENT_ID,
        configureRoute: "PersonalImages",
        configureLabel: "Configure documents",
        infoType: PERSONAL_IMAGES,
        infoKey: PERSONAL_IMAGES_DOCUMENTS,
        label: "Government ID",
        placeholder: "Submit your passport or ID card",
        selectLabel: "Select image to submit",
        optionsLabel: "Image options",
        missingDataDisplay: {
          icon: "card-account-details",
          label:
            "You'll need to add at least one document to your personal profile to submit one here.",
        },
      },
      [WYRE_INDIVIDUAL_PROOF_OF_ADDRESS]: {
        wyreFieldId: WYRE_INDIVIDUAL_PROOF_OF_ADDRESS,
        configureRoute: "PersonalImages",
        configureLabel: "Configure documents",
        infoType: PERSONAL_IMAGES,
        infoKey: PERSONAL_IMAGES_DOCUMENTS,
        label: "Proof of address",
        placeholder: "Submit bank statement or utility bill",
        selectLabel: "Select bank statement or utility bill to submit",
        optionsLabel: "Image options",
        missingDataDisplay: {
          icon: "file-document",
          label:
            "You'll need to add at least one document to your personal profile to submit one here.",
        },
      },
    };

    this.WYRE_ACCOUNT_PERSONAL_INFO_FORM_ORDER = [
      WYRE_INDIVIDUAL_NAME,
      WYRE_INDIVIDUAL_CELL,
      WYRE_INDIVIDUAL_EMAIL,
      WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
      WYRE_INDIVIDUAL_DOB,
      WYRE_INDIVIDUAL_SSN,
    ]

    this.WYRE_ACCOUNT_DOCUMENTS_FORM_ORDER = [
      WYRE_INDIVIDUAL_GOVERNMENT_ID,
      WYRE_INDIVIDUAL_PROOF_OF_ADDRESS
    ];
  }

  async componentDidMount() {
    await this.fetchAccountData()
    this.loadDocumentRenders()
    this.loadWyreProfileFieldIndexMap()
  }

  async fetchAccountData() {
    this.props.dispatch(setServiceLoading(true))
    const updates = [API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS]

    for (update of updates) {
      await conditionallyUpdateService(
        store.getState(),
        this.props.dispatch,
        update
      );
    }

    this.props.dispatch(setServiceLoading(false))
  }

  async loadDocumentRenders() {
    const serviceData = await requestServiceStoredData(WYRE_SERVICE_ID)
    let documentRenders = this.state.documentRenders

    this.WYRE_ACCOUNT_DOCUMENTS_FORM_ORDER.map((documentField) => {
      const fieldData = this.getWyreProfileFieldData(documentField)

      if (fieldData != null && serviceData.field_document_map != null) {
        const documentIds = serviceData.field_document_map[documentField];
        const documentFieldData =
          documentIds == null || serviceData.document_ids[documentIds[0]] == null
            ? {}
            : serviceData.document_ids[documentIds[0]];

        if (serviceData.document_ids != null && documentIds != null && documentIds.length > 0) {
          documentRenders[documentField] = {
            ...documentFieldData,
            documentIds,
          };
        }
      }
    })

    this.setState({
      documentRenders
    });
  }

  componentDidUpdate(lastProps) {
    if (lastProps.wyreAccount !== this.props.wyreAccount) {
      this.loadWyreProfileFieldIndexMap()
      this.loadDocumentRenders()

      if (this.props.wyreScreenParams.wyreFieldData == null) {
        this.props.dispatch(
          setCurrentWyreAccountDataScreenParams({
            ...this.props.wyreScreenParams,
            wyreFieldData: this.getWyreProfileFieldData(
              this.props.wyreScreenParams.wyreFieldId
            ),
          })
        );
      }
    }
  }

  openAccountData(infoSchema) {
    this.props.dispatch(setServiceLoading(true))

    try {
      const {
        configureRoute,
        infoType,
        infoKey,
        label,
        placeholder,
        selectLabel,
        optionsLabel,
        configureLabel,
        addLabel,
        addRoute,
        missingDataDisplay
      } = infoSchema

      this.props.dispatch(setCurrentWyreAccountDataScreenParams({
        wyreFieldData: this.getWyreProfileFieldData(infoSchema.wyreFieldId),
        wyreFieldId: infoSchema.wyreFieldId,
        configureRoute,
        infoType,
        infoKey,
        label,
        placeholder,
        selectLabel,
        optionsLabel,
        configureLabel,
        addLabel,
        addRoute,
        missingDataDisplay
      }))
      this.props.dispatch(setServiceLoading(false))
      this.props.navigation.navigate("WyreServiceAccountData");      
    } catch(e) {
      console.warn(e)
      createAlert("Error", "Error fetching Wyre service account data.")
      this.props.dispatch(setServiceLoading(false))
    }
  }

  loadWyreProfileFieldIndexMap() {
    if (this.props.wyreAccount != null) {
      let wyreFieldIndexMap = {}

      this.props.wyreAccount.profileFields.map((field, index) => {
        wyreFieldIndexMap[field.fieldId] = index
      })

      this.setState({ wyreProfileFieldIndexMap: wyreFieldIndexMap })
    }
  }

  getWyreProfileFieldData(wyreFieldId) {
    if (this.props.wyreAccount == null) return null;
    else if (this.state.wyreProfileFieldIndexMap != null) {
      return this.props.wyreAccount.profileFields[
        this.state.wyreProfileFieldIndexMap[wyreFieldId]
      ];
    } else {
      const profileFieldIndex = this.props.wyreAccount.profileFields.findIndex(
        (x) => x.fieldId === wyreFieldId
      );

      if (profileFieldIndex === -1) return null;
      else {
        return this.props.wyreAccount.profileFields[profileFieldIndex];
      }
    }
  }

  renderValueField(wyreFieldId) {
    const profileFieldData = this.getWyreProfileFieldData(wyreFieldId)

    if (profileFieldData == null) return null 
    else {
      return renderWyreDataField(wyreFieldId, profileFieldData.value);
    }
  }

  getProfileFieldStatus(wyreFieldId) {
    const profileFieldData = this.getWyreProfileFieldData(wyreFieldId)

    if (profileFieldData == null) return null 
    else return profileFieldData.status
  }

  render() {
    return WyreServiceAccountOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    wyreAccount: state.services.accounts[WYRE_SERVICE],
    wyrePaymentMethods: state.services.paymentMethods[WYRE_SERVICE],
    wyreScreenParams: state.channelStore_wyre_service.currentAccountDataScreenParams || {},
  }
};

export default connect(mapStateToProps)(WyreServiceAccountOverview);