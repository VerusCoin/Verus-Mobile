import { Component } from "react"
import { connect } from 'react-redux'
import { modifyPersonalDataForUser } from "../../../actions/actionDispatchers";
import { requestPersonalData } from "../../../utils/auth/authBox";
import {
  PERSONAL_CONTACT,
  PERSONAL_EMAILS,
  PERSONAL_PHONE_NUMBERS,
} from "../../../utils/constants/personal";
import { PersonalContactRender } from "./PersonalContact.render"

const EDIT = 'edit'
const REMOVE = 'remove'

class PersonalContact extends Component {
  constructor() {
    super();
    this.state = {
      contact: {
        phone_numbers: [],
        emails: []
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
    let phones = this.state.contact.phone_numbers ? this.state.contact.phone_numbers : []

    if (index == null) {
      this.updateContactPoint(PERSONAL_PHONE_NUMBERS, [...phones, phone])
    } else {
      phones[index] = phone
      this.updateContactPoint(PERSONAL_PHONE_NUMBERS, phones)
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
    let emails = this.state.contact.emails ? this.state.contact.emails : []

    if (index == null) {
      this.updateContactPoint(PERSONAL_EMAILS, [...emails, email])
    } else {
      emails[index] = email
      this.updateContactPoint(PERSONAL_EMAILS, emails)
    }
  }

  removePhone(index) {
    let phone_numbers = this.state.contact.phone_numbers ? this.state.contact.phone_numbers : []
    phone_numbers.splice(index, 1);
    this.updateContactPoint(PERSONAL_PHONE_NUMBERS, phone_numbers)
  }

  removeEmail(index) {
    let emails = this.state.contact.emails ? this.state.contact.emails : []
    emails.splice(index, 1);
    this.updateContactPoint(PERSONAL_EMAILS, emails)
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