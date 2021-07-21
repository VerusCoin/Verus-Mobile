/*
  This component represents the screen the the user can use to oversee all of the
  services they can connect to Verus Mobile
*/  

import React, { Component } from "react"
import { connect } from 'react-redux'
import { ServicesOverviewRender } from "./ServicesOverview.render"

class ServicesOverview extends Component {
  constructor(props) {
    super(props);
  }

  openService(service) {
    this.props.navigation.navigate("Service", { service });
  }

  render() {
    return ServicesOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(ServicesOverview);