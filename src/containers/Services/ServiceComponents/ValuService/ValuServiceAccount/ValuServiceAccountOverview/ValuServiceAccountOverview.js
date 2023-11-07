/*
  This component represents the overview screen for KYC info given to a service
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { setCurrentValuAccountDataScreenParams, setServiceLoading } from "../../../../../../actions/actionCreators";
import { conditionallyUpdateService } from "../../../../../../actions/actionDispatchers";
import { createAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import { requestServiceStoredData } from "../../../../../../utils/auth/authBox";
import { API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS, VALU_SERVICE } from "../../../../../../utils/constants/intervalConstants";
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
  VALU_INDIVIDUAL_CELL,
  VALU_INDIVIDUAL_DOB,
  VALU_INDIVIDUAL_EMAIL,
  VALU_INDIVIDUAL_GOVERNMENT_ID,
  VALU_INDIVIDUAL_NAME,
  VALU_INDIVIDUAL_PROOF_OF_ADDRESS,
  VALU_INDIVIDUAL_RESIDENCE_ADDRESS,
  VALU_INDIVIDUAL_SSN,
  VALU_SERVICE_ID,
} from "../../../../../../utils/constants/services";
import { renderPersonalAddress, renderPersonalFullName } from "../../../../../../utils/personal/displayUtils";
import { renderValuDataField, translateValuAddressToPersonal } from "../../../../../../utils/services/translationUtils";
import { ValuServiceAccountOverviewRender } from "./ValuServiceAccountOverview.render"

class ValuServiceAccountOverview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      valuProfileFieldIndexMap: null,
      documentRenders: {},
      jag: 3
    };

    this.VALU_ACCOUNT_PERSONAL_INFO_SCHEMA = {
      [VALU_INDIVIDUAL_EMAIL]: {
        valuFieldId: VALU_INDIVIDUAL_EMAIL,
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
        nativeSubmission: true
      },
      [VALU_INDIVIDUAL_NAME]: {
        valuFieldId: VALU_INDIVIDUAL_NAME,
        configureRoute: "PersonalAttributesEditName",
        configureLabel: "Configure name",
        infoType: PERSONAL_ATTRIBUTES,
        infoKey: PERSONAL_NAME,
        label: "Legal name",
        placeholder: "Name",
        selectLabel: "Submission instructions",
      },
      [VALU_INDIVIDUAL_CELL]: {
        valuFieldId: VALU_INDIVIDUAL_CELL,
        configureRoute: "PersonalContact",
        configureLabel: "Configure phone numbers",
        infoType: PERSONAL_CONTACT,
        infoKey: PERSONAL_PHONE_NUMBERS,
        label: "Phone number",
        placeholder: "Phone",
        selectLabel: "Submission instructions",
      },
      [VALU_INDIVIDUAL_RESIDENCE_ADDRESS]: {
        valuFieldId: VALU_INDIVIDUAL_RESIDENCE_ADDRESS,
        configureRoute: "PersonalLocations",
        configureLabel: "Configure addresses",
        infoType: PERSONAL_LOCATIONS,
        infoKey: PERSONAL_PHYSICAL_ADDRESSES,
        label: "Residence address",
        placeholder: "Address",
        selectLabel: "Submission instructions",
      },
      [VALU_INDIVIDUAL_DOB]: {
        valuFieldId: VALU_INDIVIDUAL_DOB,
        configureRoute: "PersonalAttributes",
        configureLabel: "Configure birthday",
        infoType: PERSONAL_ATTRIBUTES,
        infoKey: PERSONAL_BIRTHDAY,
        label: "Date of birth",
        placeholder: "Birthday",
        selectLabel: "Submission instructions",
      },
      [VALU_INDIVIDUAL_SSN]: {
        valuFieldId: VALU_INDIVIDUAL_SSN,
        configureRoute: "PersonalLocations",
        configureLabel: "Configure tax IDs",
        infoType: PERSONAL_LOCATIONS,
        infoKey: PERSONAL_TAX_COUNTRIES,
        label: "Taxpayer ID",
        placeholder: "SSN",
        selectLabel: "Submission instructions",
      },
    };

    this.VALU_ACCOUNT_DOCUMENTS_SCHEMA = {
      [VALU_INDIVIDUAL_GOVERNMENT_ID]: {
        valuFieldId: VALU_INDIVIDUAL_GOVERNMENT_ID,
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
      [VALU_INDIVIDUAL_PROOF_OF_ADDRESS]: {
        valuFieldId: VALU_INDIVIDUAL_PROOF_OF_ADDRESS,
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

    this.VALU_ACCOUNT_PERSONAL_INFO_FORM_ORDER = [
      VALU_INDIVIDUAL_EMAIL,
      VALU_INDIVIDUAL_NAME,
      VALU_INDIVIDUAL_CELL,
      VALU_INDIVIDUAL_RESIDENCE_ADDRESS,
      VALU_INDIVIDUAL_DOB,
      VALU_INDIVIDUAL_SSN,
    ]

    this.VALU_ACCOUNT_DOCUMENTS_FORM_ORDER = [
      VALU_INDIVIDUAL_GOVERNMENT_ID,
      VALU_INDIVIDUAL_PROOF_OF_ADDRESS
    ];
  }

  async componentDidMount() {
    await this.fetchAccountData()
    this.loadDocumentRenders()
    this.loadValuProfileFieldIndexMap()
  }

  async fetchAccountData() {
    this.props.dispatch(setServiceLoading(true, VALU_SERVICE_ID))
    const updates = [API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS]

    for (update of updates) {
      await conditionallyUpdateService(
        store.getState(),
        this.props.dispatch,
        update
      );
    }

    this.props.dispatch(setServiceLoading(false, VALU_SERVICE_ID))
  }

  async loadDocumentRenders() {
    const serviceData = await requestServiceStoredData(VALU_SERVICE_ID)
    let documentRenders = this.state.documentRenders

    this.VALU_ACCOUNT_DOCUMENTS_FORM_ORDER.map((documentField) => {
      const fieldData = this.getValuProfileFieldData(documentField)

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
    if (lastProps.valuAccount !== this.props.valuAccount) {
      this.loadValuProfileFieldIndexMap()
      this.loadDocumentRenders()

      if (this.props.valuScreenParams.valuFieldData == null) {
        this.props.dispatch(
          setCurrentValuAccountDataScreenParams({
            ...this.props.valuScreenParams,
            valuFieldData: this.getValuProfileFieldData(
              this.props.valuScreenParams.valuFieldId
            ),
          })
        );
      }
    }
  }

  openAccountData(infoSchema) {
    this.props.dispatch(setServiceLoading(true, VALU_SERVICE_ID))

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
        missingDataDisplay,
        nativeSubmission
      } = infoSchema

      this.props.dispatch(setCurrentValuAccountDataScreenParams({
        valuFieldData: this.getValuProfileFieldData(infoSchema.valuFieldId),
        valuFieldId: infoSchema.valuFieldId,
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
        missingDataDisplay,
        nativeSubmission
      }))
      this.props.dispatch(setServiceLoading(false, VALU_SERVICE_ID))
      this.props.navigation.navigate("ValuServiceAccountData");      
    } catch(e) {
      console.warn(e)
      createAlert("Error", "Error fetching Valu service account data.")
      this.props.dispatch(setServiceLoading(false, VALU_SERVICE_ID))
    }
  }

  loadValuProfileFieldIndexMap() {
    if (this.props.valuAccount != null) {
      let valuFieldIndexMap = {}

      this.props.valuAccount.profileFields.map((field, index) => {
        valuFieldIndexMap[field.fieldId] = index
      })

      this.setState({ valuProfileFieldIndexMap: valuFieldIndexMap })
    }
  }

  getValuProfileFieldData(valuFieldId) {
    if (this.props.valuAccount == null) return null;
    else if (this.state.valuProfileFieldIndexMap != null) {
      return this.props.valuAccount.profileFields[
        this.state.valuProfileFieldIndexMap[valuFieldId]
      ];
    } else {
      const profileFieldIndex = this.props.valuAccount.profileFields.findIndex(
        (x) => x.fieldId === valuFieldId
      );

      if (profileFieldIndex === -1) return null;
      else {
        return this.props.valuAccount.profileFields[profileFieldIndex];
      }
    }
  }

  renderValueField(valuFieldId) {
    const profileFieldData = this.getValuProfileFieldData(valuFieldId)

    if (profileFieldData == null) return null 
    else {
      return renderValuDataField(valuFieldId, profileFieldData.value);
    }
  }

  getProfileFieldStatus(valuFieldId) {
    const profileFieldData = this.getValuProfileFieldData(valuFieldId)

    if (profileFieldData == null) return null 
    else return profileFieldData.status
  }

  render() {
    return ValuServiceAccountOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    valuAccount: state.services.accounts[VALU_SERVICE],
    valuPaymentMethods: state.services.paymentMethods[VALU_SERVICE],
    valuScreenParams: state.channelStore_valu_service.currentAccountDataScreenParams || {},
  }
};

export default connect(mapStateToProps)(ValuServiceAccountOverview);