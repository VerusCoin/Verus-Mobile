/*
  This component represents the screen the the user will
  use to configure their personal wallet profile. They can then
  take this profile data and submit it to applications that require
  KYC if they want.
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { PersonalRender } from "./Personal.render"

class Personal extends Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    return PersonalRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    attributes: state.personal.attributes
  }
};

export default connect(mapStateToProps)(Personal);