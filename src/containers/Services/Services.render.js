import React from "react";
import ServicesOverview from "./ServicesOverview/ServicesOverview";

export const ServicesRender = function() {
  return <ServicesOverview navigation={this.props.navigation} />
};
