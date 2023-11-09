import React, { Component } from "react"
import { connect } from 'react-redux'
import { VALU_SERVICE_ID } from "../../../../utils/constants/services";
import { ValuServiceRender } from "./ValuService.render";

class ValuService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    }
    this.props.navigation.setOptions({ title: "VALU" })
  }

  render() {
    return ValuServiceRender.call(this)
  }
}

const mapStateToProps = (state) => {
  return {
    encryptedSeeds: state.authentication.activeAccount.seeds,
    loading: state.services.loading[VALU_SERVICE_ID]
  }
};

export default connect(mapStateToProps)(ValuService);