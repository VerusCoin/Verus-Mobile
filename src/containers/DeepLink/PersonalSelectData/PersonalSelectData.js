import moment from "moment";
import { Component } from "react"
import { connect } from 'react-redux'
import { createAlert, resolveAlert } from "../../../actions/actions/alert/dispatchers/alert"
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import { PERSONAL_ATTRIBUTES, PERSONAL_CONTACT, PERSONAL_LOCATIONS, PERSONAL_PAYMENT_METHODS, PERSONAL_IMAGES } from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { PersonalSelectDataRender } from "./PersonalSelectData.render"
import { checkPersonalDataCatagories } from "../../../utils/personal/displayUtils";
import { handlePersonalDataSend } from "../../../utils/deeplink/handlePersonalDataSend";
import { primitives } from "verusid-ts-client"

const { IDENTITYDATA_CONTACT, IDENTITYDATA_PERSONAL_DETAILS, IDENTITYDATA_LOCATIONS, IDENTITYDATA_DOCUMENTS_AND_IMAGES, IDENTITYDATA_BANKING_INFORMATION} = primitives;


//const { defaultPersonalProfileDataTemplate } = primitives;
const EDIT = 'edit'
const REMOVE = 'remove'
const PERSONALDATACATAGORIES = [
  IDENTITYDATA_CONTACT.vdxfid,
  IDENTITYDATA_LOCATIONS.vdxfid,
  IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid,
  IDENTITYDATA_PERSONAL_DETAILS.vdxfid,
  IDENTITYDATA_BANKING_INFORMATION.vdxfid
];

const PERSONALDATALINKS = [
  "PersonalContact",
  "PersonalLocations",
  "PersonalImages",
  "PersonalAttributes",
  "PersonalPaymentMethods"
]
class PersonalSelectData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loginConsent: null,
      nationalityModalOpen: false,
      birthdaySelectorModalOpen: false,
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      },
      loading: false,
      ready: false,
      catagoriesRequested: null,
      personalDataURL: "",
      signerFqn: this.props.route.params.signerFqn
    };
  }

  componentDidMount() {
    this.updateDisplay();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedPersonalData !== this.props.encryptedPersonalData) {
      this.updateDisplay();
    }
  }

  cancel = () => {
    if (this.props.route.params.cancel) {
      this.props.route.params.cancel.cancel()
    }
  }

  updateDisplay() {
    const { deeplinkData } = this.props.route.params
    const loginConsent = new primitives.LoginConsentRequest(deeplinkData);

    const personalDataURL = loginConsent.challenge.subject
      .filter((permission) => permission.vdxfkey === primitives.LOGIN_CONSENT_PERSONALINFO_WEBHOOK_VDXF_KEY.vdxfid);

    const requestedPersonalData = loginConsent.challenge.subject
      .filter((permission) => permission.vdxfkey === primitives.PROFILE_DATA_VIEW_REQUEST.vdxfid);

    const catagoriesRequested = {};
    requestedPersonalData.forEach((permission) => {
      PERSONALDATACATAGORIES.forEach((category, idx) => {
        if (category === permission.data) {
          primitives.defaultPersonalProfileDataTemplate.forEach((templateCategory) => {
            if (templateCategory.vdxfid === permission.data) {
              catagoriesRequested[permission.data] = { title: templateCategory.category, 
                details: templateCategory.details, navigateTo: PERSONALDATALINKS[idx], color: "black" };
            }
          })
        }
      })
    });

    checkPersonalDataCatagories(catagoriesRequested).then((success) => {
      this.setState({ catagoriesRequested: catagoriesRequested, personalDataURL: {vdxfkey: personalDataURL[0].vdxfkey ,uri: personalDataURL[0].data}, ready: success});
    });  
  }

  handleContinue() { 
    this.setState({loading: true});
    
    this.getPersonalDataFromCategories().then((personalData) => {

      createAlert(
        "Send Personal info",
        "Are you sure you want to send your data to: \n" + `${this.state.signerFqn}`,
        [
          {
            text: "No",
            onPress: () => {
              resolveAlert();
            },
          },
          {
            text: "Yes",
            onPress: () => {
              resolveAlert();
              handlePersonalDataSend(personalData, this.state.personalDataURL)
              .then(() => {
                this.setState({loading: false});
                this.props.route.params.onGoBack(true);
                this.props.navigation.goBack();
              })
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    }
    ).catch((e) => {
      this.setState({loading: false});
      createAlert("Error", e.message);
    });
  
  };

  async getPersonalDataFromCategories() {
    let personalData = {};

    await Promise.all(Object.keys(this.state.catagoriesRequested).map(async (categoryVdxfkey) => {
      switch (categoryVdxfkey) {
        case IDENTITYDATA_PERSONAL_DETAILS.vdxfid:
          personalData[IDENTITYDATA_PERSONAL_DETAILS.vdxfid] = await requestPersonalData(PERSONAL_ATTRIBUTES);
          break;
        case IDENTITYDATA_CONTACT.vdxfid:
          personalData[IDENTITYDATA_CONTACT.vdxfid] = await requestPersonalData(PERSONAL_CONTACT);
          break;
        case IDENTITYDATA_LOCATIONS.vdxfid:
          personalData[IDENTITYDATA_LOCATIONS.vdxfid] = await requestPersonalData(PERSONAL_LOCATIONS);
          break;
        case IDENTITYDATA_BANKING_INFORMATION.vdxfid:
          personalData[IDENTITYDATA_BANKING_INFORMATION.vdxfid] = await requestPersonalData(PERSONAL_PAYMENT_METHODS);
          break;
        case IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid:
          personalData[IDENTITYDATA_DOCUMENTS_AND_IMAGES.vdxfid] = await requestPersonalData(PERSONAL_IMAGES);
          break;
        default:
          break;
      }
    }));

    return personalData;
  }

  openAttributes(navigateTo) {
    this.props.navigation.navigate("ProfileStackScreens", {
      screen: navigateTo
    });
  }

  render() {
    return PersonalSelectDataRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedPersonalData: state.personal
  }
};

export default connect(mapStateToProps)(PersonalSelectData);