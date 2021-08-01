/*
  This component represents the overview screen for KYC info given to a service
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { setCurrentWyreAccountDataScreenParams, setServiceLoading } from "../../../../../../actions/actionCreators";
import { conditionallyUpdateService } from "../../../../../../actions/actionDispatchers";
import { createAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import { requestPersonalData } from "../../../../../../utils/auth/authBox";
import { API_GET_SERVICE_ACCOUNT, WYRE_SERVICE } from "../../../../../../utils/constants/intervalConstants";
import {
  PERSONAL_ATTRIBUTES,
  PERSONAL_BIRTHDAY,
  PERSONAL_CONTACT,
  PERSONAL_EMAILS,
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
  WYRE_INDIVIDUAL_NAME,
  WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
  WYRE_INDIVIDUAL_SSN,
} from "../../../../../../utils/constants/services";
import { renderPersonalAddress, renderPersonalFullName } from "../../../../../../utils/personal/displayUtils";
import { renderWyreDataField, translateWyreAddressToPersonal } from "../../../../../../utils/services/translationUtils";
import { WyreServiceAccountOverviewRender } from "./WyreServiceAccountOverview.render"

class WyreServiceAccountOverview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      wyreProfileFieldIndexMap: null
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
        optionsLabel: "Name options"
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
        optionsLabel: "Name options"
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
        optionsLabel: "Name options"
      },
      [WYRE_INDIVIDUAL_RESIDENCE_ADDRESS]: {
        wyreFieldId: WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
        configureRoute: "PersonalLocations",
        configureLabel: "Configure addresses",
        addRoute: "PersonalLocationsEditAddress",
        addLabel: "Add new address",
        infoType: PERSONAL_LOCATIONS,
        infoKey: PERSONAL_PHYSICAL_ADDRESSES,
        label: "Residence address",
        placeholder: "Submit address",
        selectLabel: "Select address to submit",
        optionsLabel: "Name options"
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
        optionsLabel: "Name options"
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
        optionsLabel: "Name options"
      },
    };

    this.WYRE_ACCOUNT_PERSONAL_INFO_FORM_ORDER = [
      WYRE_INDIVIDUAL_NAME,
      WYRE_INDIVIDUAL_CELL,
      WYRE_INDIVIDUAL_EMAIL,
      WYRE_INDIVIDUAL_RESIDENCE_ADDRESS,
      WYRE_INDIVIDUAL_DOB,
      WYRE_INDIVIDUAL_SSN,
    ];
  }

  async componentDidMount() {
    await this.fetchAccountData()
    this.loadWyreProfileFieldIndexMap()
  }

  async fetchAccountData() {
    this.props.dispatch(setServiceLoading(true))
    await conditionallyUpdateService(
      store.getState(),
      this.props.dispatch,
      API_GET_SERVICE_ACCOUNT
    );
    this.props.dispatch(setServiceLoading(false))
  }

  componentDidUpdate(lastProps) {
    if (lastProps.wyreAccount !== this.props.wyreAccount) {
      this.loadWyreProfileFieldIndexMap()

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

  openAccountData(dataTypeKey) {
    this.props.dispatch(setServiceLoading(true))

    try {
      const infoSchema = this.WYRE_ACCOUNT_PERSONAL_INFO_SCHEMA[dataTypeKey]

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
      } = infoSchema

      this.props.dispatch(setCurrentWyreAccountDataScreenParams({
        wyreFieldData: this.getWyreProfileFieldData(dataTypeKey),
        wyreFieldId: dataTypeKey,
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
      return renderWyreDataField(wyreFieldId, profileFieldData.value).title;
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
    wyreScreenParams: state.channelStore_wyre_service.currentAccountDataScreenParams || {},
  }
};

export default connect(mapStateToProps)(WyreServiceAccountOverview);