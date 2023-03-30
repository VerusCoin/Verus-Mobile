/*
  This component represents the screen the the user can use to oversee all of the
  services they can connect to Verus Mobile
*/  

import React, { Component } from "react"
import { connect } from 'react-redux'
import { clearSecureLoadingData } from "../../../actions/actionCreators";
import { ServicesOverviewRender } from "./ServicesOverview.render"

class ServicesOverview extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (this.props.passthrough && this.props.passthrough.service) {
      this.openService(this.props.passthrough.service)
      this.props.dispatch(clearSecureLoadingData())
    }
  }

  openService(service) {
    this.props.navigation.navigate("Service", { service });
  }

  render() {
    return ServicesOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    passthrough: state.secureLoading.successData,
    activeAccount: state.authentication.activeAccount
  }
};

export default connect(mapStateToProps)(ServicesOverview);