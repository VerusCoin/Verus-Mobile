import { Component } from "react"
import { connect } from 'react-redux'
import { CALLING_CODES_TO_ISO_3166 } from "../../utils/constants/callingCodes";
import { ISO_3166_COUNTRIES } from "../../utils/constants/iso3166";
import { PERSONAL_PHONE_TYPE_MOBILE } from "../../utils/constants/personal";
import { PhoneNumberModalRender } from "./PhoneNumberModal.render"

class PhoneNumberModal extends Component {
  constructor(props) {
    super(props);
    const initialPhone = props.initialPhone == null ? {
      calling_code: "",
      number: "",
      type: PERSONAL_PHONE_TYPE_MOBILE
    } : props.initialPhone

    this.state = {
      phone: initialPhone,
      formattedExt: `+${initialPhone.calling_code}`,
      extEmoji: '',
      formattedPhone: initialPhone.number,
    };
  }

  editPhone(key, value) {
    this.setState({
      phone: {
        ...this.state.phone,
        [key]: value
      }
    })
  }

  setCallingCode(formatted) {
    let extEmoji = ""

    if (CALLING_CODES_TO_ISO_3166[formatted] != null && ISO_3166_COUNTRIES[CALLING_CODES_TO_ISO_3166[formatted]] != null) {
      extEmoji = ISO_3166_COUNTRIES[CALLING_CODES_TO_ISO_3166[formatted]].emoji
    }

    this.setState({
      phone: {
        ...this.state.phone,
        calling_code: formatted
      },
      formattedExt: formatted,
      extEmoji
    })
  }

  setNumber(formatted, extracted) {
    this.setState({
      phone: {
        ...this.state.phone,
        number: extracted
      },
      formattedPhone: formatted
    })
  }

  render() {
    return PhoneNumberModalRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    encryptedContact: state.personal.contact,
    darkMode:state.settings.darkModeState
  }
};

export default connect(mapStateToProps)(PhoneNumberModal);