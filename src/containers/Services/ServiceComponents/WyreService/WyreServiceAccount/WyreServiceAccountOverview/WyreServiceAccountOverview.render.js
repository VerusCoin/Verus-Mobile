import React from "react";
import { ScrollView, View } from "react-native";
import { List, Divider } from "react-native-paper";
import Colors from "../../../../../../globals/colors";
import Styles from "../../../../../../styles";
import {
  WYRE_DATA_SUBMISSION_OPEN,
  WYRE_DATA_SUBMISSION_PENDING,
} from "../../../../../../utils/constants/services";

export const WyreServiceAccountOverviewRender = function () {
  return (
    <ScrollView
      style={Styles.flexBackground}
    >
      <List.Subheader>{"Submitted personal information"}</List.Subheader>
      {this.WYRE_ACCOUNT_PERSONAL_INFO_FORM_ORDER.map((formKey, index) => {
        const form = this.WYRE_ACCOUNT_PERSONAL_INFO_SCHEMA[formKey]
        const value = this.renderValueField(formKey)
        const status = this.getProfileFieldStatus(formKey)

        return (
          <React.Fragment key={index}>
            <Divider />
            <List.Item
              title={value == null ? form.placeholder : value}
              description={form.label}
              titleStyle={{
                color:
                  value == null ? Colors.verusDarkGray : Colors.quaternaryColor,
              }}
              right={(props) => (
                <View style={{ flexDirection: "row" }}>
                  {status == null ||
                  status == WYRE_DATA_SUBMISSION_OPEN ? null : status ==
                    WYRE_DATA_SUBMISSION_PENDING ? (
                    <List.Icon {...props} color={Colors.infoButtonColor} icon={"timer-sand"} size={20} />
                  ) : (
                    <List.Icon {...props} color={Colors.verusGreenColor} icon={"check"} size={20} />
                  )}
                  <List.Icon {...props} icon={"chevron-right"} size={20} />
                </View>
              )}
              onPress={() => this.openAccountData(formKey)}
            />
          </React.Fragment>
        );
      })}
      <Divider />
    </ScrollView>
  );
};