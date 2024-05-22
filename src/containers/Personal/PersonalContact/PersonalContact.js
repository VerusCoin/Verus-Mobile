import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import {
  PERSONAL_CONTACT,
  PERSONAL_EMAILS,
  PERSONAL_PHONE_NUMBERS,
} from "../../../utils/constants/personal";
import { provideCustomBackButton } from "../../../utils/navigation/customBack";
import { PersonalContactRender } from "./PersonalContact.render"
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_EMAIL, IDENTITYDATA_PHONENUMBER } = primitives;

const EDIT = 'edit'
const REMOVE = 'remove'

class PersonalContact extends Component {
  constructor() {
    super();
    this.state = {
      contact: {
        [IDENTITYDATA_PHONENUMBER.vdxfid]: [],
        [IDENTITYDATA_EMAIL.vdxfid]: []
      },
      addPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      },
      editPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      },
      emailModal: {
        open: false,
        index: null
      },
      loading: false
    };

    this.EDIT_PROPERTY_BUTTONS = [{
      key: EDIT,
      title: "Edit"
    }, {
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

    this.loadPersonalContact()
  }

  closeAddPropertyModal() {
    this.setState({
      addPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      }
    })
  }

  openAddPropertyModal(label, property, index = null) {
    this.setState({
      addPropertyModal: {
        open: true,
        property,
        label,
        index
      }
    })
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
      case PERSONAL_EMAILS:
        switch (button) {
          case EDIT:
            this.setState({
              addPropertyModal: {
                open: true,
                property: PERSONAL_EMAILS,
                label: "Edit Email",
                index: this.state.editPropertyModal.index
              }
            })
            break;
          case REMOVE:
            this.removeEmail(this.state.editPropertyModal.index)
            break;
          default:
            break;
        }
        break;
      case PERSONAL_PHONE_NUMBERS:
        switch (button) {
          case EDIT:
            this.setState({
              addPropertyModal: {
                open: true,
                property: PERSONAL_PHONE_NUMBERS,
                label: "Edit Phone",
                index: this.state.editPropertyModal.index
              }
            })
            break;
          case REMOVE:
            this.removePhone(this.state.editPropertyModal.index)
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
    if (lastProps.encryptedContact !== this.props.encryptedContact) {
      this.loadPersonalContact()
    }
  }

  editPhone(phone, index) {
    let phones = this.state.contact[IDENTITYDATA_PHONENUMBER.vdxfid] ? this.state.contact[IDENTITYDATA_PHONENUMBER.vdxfid] : []

    if (index == null) {
      this.updateContactPoint(IDENTITYDATA_PHONENUMBER.vdxfid, [...phones, phone])
    } else {
      phones[index] = phone
      this.updateContactPoint(IDENTITYDATA_PHONENUMBER.vdxfid, phones)
    }
  }

  finishEditEmailFromAddress(emailAddress, index) {
    this.setState({
      addPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      }
    }, () => this.editEmail({ address: emailAddress }, index))
  }

  editEmail(email, index) {
    let emails = this.state.contact[IDENTITYDATA_EMAIL.vdxfid] ? this.state.contact[IDENTITYDATA_EMAIL.vdxfid] : []

    if (index == null) {
      this.updateContactPoint(IDENTITYDATA_EMAIL.vdxfid, [...emails, email])
    } else {
      emails[index] = email
      this.updateContactPoint(IDENTITYDATA_EMAIL.vdxfid, emails)
    }
  }

  removePhone(index) {
    let phone_numbers = this.state.contact[IDENTITYDATA_PHONENUMBER.vdxfid] ? this.state.contact[IDENTITYDATA_PHONENUMBER.vdxfid] : []
    phone_numbers.splice(index, 1);
    this.updateContactPoint(IDENTITYDATA_PHONENUMBER.vdxfid, phone_numbers)
  }

  removeEmail(index) {
    let emails = this.state.contact[IDENTITYDATA_EMAIL.vdxfid] ? this.state.contact[IDENTITYDATA_EMAIL.vdxfid] : []
    emails.splice(index, 1);
    this.updateContactPoint(IDENTITYDATA_EMAIL.vdxfid, emails)
  }

  finishPhoneEdit(phone, index) {
    this.setState({
      addPropertyModal: {
        open: false,
        property: null,
        label: "",
        index: null
      }
    }, this.editPhone(phone, index))
  }

  openAddPhoneModal() {
    this.setState({
      addPropertyModal: {
        open: true,
        property: PERSONAL_PHONE_NUMBERS,
        label: "Add Phone",
        index: null
      }
    })
  }

  openAddEmailModal() {
    this.setState({
      addPropertyModal: {
        open: true,
        property: PERSONAL_EMAILS,
        label: "Add Email",
        index: null
      }
    })
  }

  updateContactPoint(key, value) {
    this.setState(
      { contact: { ...this.state.contact, [key]: value }, loading: true },
      async () => {
        await modifyPersonalDataForUser(
          this.state.contact,
          PERSONAL_CONTACT,
          this.props.activeAccount.accountHash
        );

        this.setState({ loading: false });
      }
    );
  }

  loadPersonalContact() {
    this.setState({loading: true}, async () => {
      this.setState({
        contact: await requestPersonalData(PERSONAL_CONTACT),
        loading: false
      })
    })
  }

  render() {
    return PersonalContactRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedContact: state.personal.contact
  }
};

export default connect(mapStateToProps)(PersonalContact);