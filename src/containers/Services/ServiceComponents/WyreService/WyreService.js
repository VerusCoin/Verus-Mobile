import React, { Component } from "react"
import { connect } from 'react-redux'
import { WYRE_SERVICE_ID } from "../../../../utils/constants/services";
import { WyreServiceRender } from "./WyreService.render";

class WyreService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
    this.props.navigation.setOptions({ title: "Wyre" })
  }

  render() {
    return WyreServiceRender.call(this)
  }
}

const mapStateToProps = (state) => {
  return {
    encryptedSeeds: state.authentication.activeAccount.seeds,
    loading: state.services.loading[WYRE_SERVICE_ID]
  }
};

export default connect(mapStateToProps)(WyreService);