import React, { Component } from "react"
import { connect } from 'react-redux'
import { WyreServiceRender } from "./WyreService.render";

class WyreService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
    this.props.navigation.setOptions({ title: "Wyre" })
  }

  setLoading(loading, callback) {
    this.setState({
      loading
    }, callback)
  }

  render() {
    return WyreServiceRender.call(this)
  }
}

const mapStateToProps = (state) => {
  return {
    encryptedSeeds: state.authentication.activeAccount.seeds
  }
};

export default connect(mapStateToProps)(WyreService);