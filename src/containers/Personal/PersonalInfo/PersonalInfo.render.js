import React from "react";
import {
  Text
} from "react-native";

export const PersonalInfoRender = function() {
  // return (
  //   <Portal.Host>
  //     <SafeAreaView style={[Styles.flex, Styles.backgroundColorWhite]}>
  //       <Text>{"Profile"}</Text>
  //     </SafeAreaView>
  //   </Portal.Host>
  // );
  return <Text>{`${this.state.attributes.name.first} ${this.state.attributes.name.middle} ${this.state.attributes.name.last}`}</Text>
};
