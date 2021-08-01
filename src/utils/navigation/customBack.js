import { HeaderBackButton } from "@react-navigation/stack";
import React from "react"
import Colors from "../../globals/colors";

export const provideCustomBackButton = (self, route, params) => {
  self.props.navigation.setOptions({
    headerLeft: () =>
      renderCustomBackButton(self.props.navigation, route, params),
  });

  self.props.navigation.addListener("blur", () => {
    self.props.navigation.setOptions({
      headerLeft: undefined
    });
  });
}

export const renderCustomBackButton = (navigation, route, params) => {
  return (
    <HeaderBackButton
      label={"Back"}
      tintColor={Colors.secondaryColor}
      onPress={() => {
        navigation.goBack();
        navigation.navigate(route, params);
      }}
    />
  );
};