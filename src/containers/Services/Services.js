/*
  This component represents the screen the user will
  use to configure connected wallet services like Wyre
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import SignedInServicesHome from './SignedInServicesHome';

class Services extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <SignedInServicesHome navigation={this.props.navigation} />;
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(Services);
