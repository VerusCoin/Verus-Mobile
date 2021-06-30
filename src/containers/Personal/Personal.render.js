import React from "react";
import PersonalInfo from "./PersonalInfo/PersonalInfo";
import PersonalIntroSlider from "./PersonalIntroSlider/PersonalIntroSlider";

export const PersonalRender = function() {
  return this.props.attributes == null ? (
    <PersonalIntroSlider />
  ) : (
    <PersonalInfo navigation={this.props.navigation} />
  );
};
