/*
  This component is responsible for allowing a user to create
  conversion transactions/transfers (if the card they are using allows it)
*/

import React, { Component } from "react"
import { connect } from 'react-redux'
import { ConvertCoinRender } from "./ConvertCoin.render"

class ConvertCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return ConvertCoinRender.call(this)
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(ConvertCoin);