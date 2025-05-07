/*
  This component represents the screen the user will
  use to configure connected wallet services like Wyre
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { ServicesRender } from "./Services.render"

class Services extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return ServicesRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(Services);