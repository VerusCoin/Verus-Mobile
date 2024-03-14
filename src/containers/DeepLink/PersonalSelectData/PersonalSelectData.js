import moment from "moment";
import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import { PERSONAL_ATTRIBUTES, PERSONAL_BIRTHDAY, PERSONAL_NATIONALITIES } from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { PersonalSelectDataRender } from "./PersonalSelectData.render"
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
    super();
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
      permissions: [1, 2, 3, 4],
      catagoriesRequested: null,
      otherKeysRequested: null
    };
  }

  componentDidMount() {

    const { deeplinkData } = this.props.route.params
    const loginConsent = new primitives.LoginConsentRequest(deeplinkData);

    const requestedPersonalData = loginConsent.challenge.subject
      .filter((permission) => permission.vdxfkey === primitives.PROFILE_DATA_VIEW_REQUEST.vdxfid);

    const catagoriesRequested = {};
    requestedPersonalData.forEach((permission) => {
      PERSONALDATACATAGORIES.forEach((category, idx) => {
        if (category === permission.data) {
          primitives.defaultPersonalProfileDataTemplate.forEach((templateCategory) => {
            if (templateCategory.vdxfid === permission.data) {
              catagoriesRequested[permission.data] = { title: templateCategory.category, 
                details: templateCategory.details, navigateTo: PERSONALDATALINKS[idx] };
            }
          })
        }
      })
    })

    const otherKeysRequested = {}
    requestedPersonalData.forEach((permission) => {

      if (primitives.IdentityVdxfidMap[permission.data]) {
        otherKeysRequested[permission.data] = primitives.IdentityVdxfidMap[permission.data].name;
      }

    })
    this.setState({ catagoriesRequested, otherKeysRequested });
    this.loadPersonalAttributes()
  }

  handleContinue() { }

  loadPersonalAttributes() {
    this.setState({ loading: true }, async () => {
      this.setState({
        attributes: await requestPersonalData(PERSONAL_ATTRIBUTES),
        loading: false
      })
    })
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
    encryptedAttributes: state.personal.attributes
  }
};

export default connect(mapStateToProps)(PersonalSelectData);