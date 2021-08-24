/*
  This component is responsible for managing fiat withdrawals/deposits
  or any other "manage" functions that may be implemented in the future
*/

import React, { Component } from "react"
import { connect } from 'react-redux'
import { ManageCoinRender } from "./ManageCoin.render"

class ManageCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return ManageCoinRender.call(this)
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(ManageCoin);