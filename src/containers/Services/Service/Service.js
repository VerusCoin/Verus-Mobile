/*
  This component represents the screen flow for a service
*/  

import React, { Component } from "react"
import { PBAAS_PRECONVERT_SERVICE_ID, VERUSID_SERVICE_ID, WYRE_SERVICE_ID, ATTESTATION_SERVICE_ID } from "../../../utils/constants/services";
import VerusIdService from "../ServiceComponents/VerusIdService/VerusIdService";
import WyreService from "../ServiceComponents/WyreService/WyreService";
import PbaasPreconvertService from "../ServiceComponents/PbaasPreconvertService/PbaasPreconvertService";
import AttestationService from "../ServiceComponents/AttestationService/AttestationService";
class Service extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeService: props.route.params.service
    }

    this.SERVICE_COMPONENTS = {
      [WYRE_SERVICE_ID]: <WyreService navigation={props.navigation}/>,
      [VERUSID_SERVICE_ID]: <VerusIdService navigation={props.navigation}/>,
      [PBAAS_PRECONVERT_SERVICE_ID]: <PbaasPreconvertService navigation={props.navigation}/>,
      [ATTESTATION_SERVICE_ID]: <AttestationService navigation={props.navigation}/>,
    }
  }

  render() {
    return this.SERVICE_COMPONENTS[this.state.activeService]
  }
}

export default Service;