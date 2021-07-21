/*
  This component represents the screen flow for a service
*/  

import React, { Component } from "react"
import { WYRE_SERVICE_ID } from "../../../utils/constants/services";
import WyreService from "../ServiceComponents/WyreService/WyreService";

class Service extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeService: props.route.params.service
    }

    this.SERVICE_COMPONENTS = {
      [WYRE_SERVICE_ID]: <WyreService navigation={props.navigation}/>
    }
  }

  render() {
    return this.SERVICE_COMPONENTS[this.state.activeService]
  }
}

export default Service;