import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import { PERSONAL_ATTRIBUTES, PERSONAL_BIRTHDAY, PERSONAL_NATIONALITIES } from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { PersonalAttributesRender } from "./PersonalAttributes.render"

const EDIT = 'edit'
const REMOVE = 'remove'

class PersonalAttributes extends Component {
  constructor() {
    super();
    this.state = {
      attributes: {
        name: {
          first: "John",
          middle: "",
          last: "Doe"
        },
        birthday: {
          day: null,
          month: null,
          year: null
        },
        nationalities: []
      },
      nationalityModalOpen: false,
      birthdaySelectorModalOpen: false,
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      },
      loading: false
    };

    // this.EDIT_PROPERTY_BUTTONS = [{
    //   key: EDIT,
    //   title: "Change"
    // }, {
    //   key: REMOVE,
    //   title: "Remove"
    // }]
    this.EDIT_PROPERTY_BUTTONS = [{
      key: REMOVE,
      title: "Remove"
    }]
  }

  componentDidMount() {
    if (this.props.route.params != null && this.props.route.params.customBack != null) {
      provideCustomBackButton(
        this,
        this.props.route.params.customBack.route,
        this.props.route.params.customBack.params
      );
    }

    this.loadPersonalAttributes()
  }

  closeEditPropertyModal() {
    this.setState({
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      }
    })
  }

  openEditPropertyModal(label, property, index = null) {
    this.setState({
      editPropertyModal: {
        open: true,
        property,
        label,
        index
      }
    })
  }

  selectEditPropertyButton(button) {
    switch (this.state.editPropertyModal.property) {
      case PERSONAL_BIRTHDAY:
        switch (button) {
          case EDIT:
            break;
          case REMOVE:
            break;
          default:
            break;
        }
        break;
      case PERSONAL_NATIONALITIES:
        switch (button) {
          case EDIT:
            break;
          case REMOVE:
            this.removeNationality(this.state.editPropertyModal.index)
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedAttributes !== this.props.encryptedAttributes) {
      this.loadPersonalAttributes()
    }
  }

  openEditNameScreen() {
    this.props.navigation.navigate("PersonalAttributesEditName", {
      attributes: this.state.attributes,
    });
  }

  addNationality(nationalityCode) {
    const nationalities = this.state.attributes.nationalities ? this.state.attributes.nationalities : []
    this.updateAttribute(PERSONAL_NATIONALITIES, [...nationalities, nationalityCode])
  }

  removeNationality(index) {
    let nationalities = this.state.attributes.nationalities ? this.state.attributes.nationalities : []
    nationalities.splice(index, 1);
    this.updateAttribute(PERSONAL_NATIONALITIES, nationalities)
  }

  setBirthday(date) {
    this.setState({
      birthdaySelectorModalOpen: false
    }, () => {
      this.updateAttribute(PERSONAL_BIRTHDAY, date)
    })
  }

  updateAttribute(key, value) {
    this.setState(
      { attributes: { ...this.state.attributes, [key]: value }, loading: true },
      async () => {
        await modifyPersonalDataForUser(
          this.state.attributes,
          PERSONAL_ATTRIBUTES,
          this.props.activeAccount.accountHash
        );

        this.setState({ loading: false });
      }
    );
  }

  loadPersonalAttributes() {
    this.setState({loading: true}, async () => {
      this.setState({
        attributes: await requestPersonalData(PERSONAL_ATTRIBUTES),
        loading: false
      })
    })
  }

  getDateClassInstance(day, month, year) {
    return new Date(Date.UTC(year, month, day, 3, 0, 0));
  }

  renderDate() {
    const { day, month, year } = this.state.attributes.birthday;
    const date = this.getDateClassInstance(day, month, year)

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  render() {
    return PersonalAttributesRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedAttributes: state.personal.attributes
  }
};

export default connect(mapStateToProps)(PersonalAttributes);