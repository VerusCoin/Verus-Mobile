import React, { Component } from "react"
import { connect } from 'react-redux'
import { VerusIdServiceRender } from "./VerusIdService.render";

class VerusIdService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
    this.props.navigation.setOptions({ title: "VerusID" })
  }

  render() {
    return VerusIdServiceRender.call(this)
  }
}

const mapStateToProps = (state) => {
  return {
    encryptedSeeds: state.authentication.activeAccount.seeds,
    loading: state.services.loading
  }
};

export default connect(mapStateToProps)(VerusIdService);