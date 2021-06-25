/*
  This component represents the screen the the user will
  use to configure their personal wallet profile. They can then
  take this profile data and submit it to applications that require
  KYC if they want.
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { requestPersonalData } from "../../../utils/auth/authBox";
import { PERSONAL_ATTRIBUTES } from "../../../utils/constants/personal";
import { PersonalInfoRender } from "./PersonalInfo.render"

class PersonalInfo extends Component {
  constructor() {
    super();
    this.state = {
      attributes: {
        name: {
          first: "John",
          middle: "",
          last: "Doe"
        }
      },
      loading: false
    };
  }

  componentDidMount() {
    this.setState({loading: true}, async () => {
      this.setState({
        attributes: await requestPersonalData(PERSONAL_ATTRIBUTES),
        loading: false
      })
    })
  }

  render() {
    return PersonalInfoRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(PersonalInfo);