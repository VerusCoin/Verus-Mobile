/*
  This component represents the overview screen for KYC info given to a service
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { ServiceProvidedInfoOverviewRender } from "./ServiceProvidedInfoOverview.render"

class ServiceProvidedInfoOverview extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return ServiceProvidedInfoOverviewRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(ServiceProvidedInfoOverview);