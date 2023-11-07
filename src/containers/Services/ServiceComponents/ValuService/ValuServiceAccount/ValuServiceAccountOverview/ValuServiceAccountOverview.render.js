import React from "react";
import { ScrollView, View } from "react-native";
import { List, Divider, Avatar } from "react-native-paper";
import Colors from "../../../../../../globals/colors";
import Styles from "../../../../../../styles";
import {
  VALU_DATA_SUBMISSION_AWAITING_FOLLOWUP,
  VALU_DATA_SUBMISSION_OPEN,
  VALU_DATA_SUBMISSION_PENDING,
  VALU_DATA_SUBMISSION_REJECTED,
  VALU_INDIVIDUAL_EMAIL,
} from "../../../../../../utils/constants/services";
import {
  ISO_3166_COUNTRIES
} from "../../../../../../utils/constants/iso3166";

export const ValuServiceAccountOverviewRender = function () {
  return (
    <ScrollView style={Styles.flexBackground}>
      <List.Subheader>{"Cash In / Out"}</List.Subheader>
      
      <List.Subheader>{"Submitted personal information"}</List.Subheader>
      {this.VALU_ACCOUNT_PERSONAL_INFO_FORM_ORDER.filter(formKey => {
        const submittedEmail = this.getValuProfileFieldData(VALU_INDIVIDUAL_EMAIL)
        
        return (
          formKey === VALU_INDIVIDUAL_EMAIL ||
          (submittedEmail != null && submittedEmail.value != null)
        );
      }).map((formKey, index) => {
        const form = this.VALU_ACCOUNT_PERSONAL_INFO_SCHEMA[formKey];
        const valueField = this.renderValueField(formKey);
        const title = valueField == null ? null : valueField.title;
        const status = this.getProfileFieldStatus(formKey);

        return (
          <React.Fragment key={index}>
            <Divider />
            <List.Item
              title={title == null ? form.placeholder : title}
              description={form.label}
              titleStyle={{
                color: title == null ? Colors.verusDarkGray : Colors.quaternaryColor,
              }}
              right={(props) => (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {status == null || status == VALU_DATA_SUBMISSION_OPEN ? null : status ==
                    VALU_DATA_SUBMISSION_PENDING ? (
                    <List.Icon
                      {...props}
                      color={Colors.infoButtonColor}
                      icon={"timer-sand"}
                      size={20}
                    />
                  ) : (
                    <List.Icon {...props} color={Colors.verusGreenColor} icon={"check"} size={20} />
                  )}
                  <List.Icon {...props} icon={"chevron-right"} size={20} />
                </View>
              )}
              onPress={() => this.openAccountData(this.VALU_ACCOUNT_PERSONAL_INFO_SCHEMA[formKey])}
            />
          </React.Fragment>
        );
      })}
      <Divider />
      {this.props.valuPaymentMethods != null && this.props.valuPaymentMethods.list.length > 0 && (
        <React.Fragment>
          <List.Subheader>{"Connected bank accounts"}</List.Subheader>
          {this.props.valuPaymentMethods != null &&
            this.props.valuPaymentMethods.list.map((paymentMethodId, index) => {
              const { name, countryCode, status, supportsPayment } =
                this.props.valuPaymentMethods.mapping[paymentMethodId];

              return (
                <React.Fragment key={index}>
                  <Divider />
                  <List.Item
                    title={name}
                    description={`${
                      ISO_3166_COUNTRIES[countryCode] == null
                        ? countryCode
                        : ISO_3166_COUNTRIES[countryCode].emoji
                    } ${supportsPayment ? "" : "recipient "}account`}
                    right={(props) => (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {status == VALU_DATA_SUBMISSION_AWAITING_FOLLOWUP ? null : status ==
                          VALU_DATA_SUBMISSION_PENDING ? (
                          <List.Icon
                            {...props}
                            color={Colors.infoButtonColor}
                            icon={"timer-sand"}
                            size={20}
                          />
                        ) : status == VALU_DATA_SUBMISSION_REJECTED ? (
                          <List.Icon
                            {...props}
                            color={Colors.warningButtonColor}
                            icon={"close"}
                            size={20}
                          />
                        ) : (
                          <List.Icon
                            {...props}
                            color={Colors.verusGreenColor}
                            icon={"check"}
                            size={20}
                          />
                        )}
                        <List.Icon {...props} icon={"chevron-right"} size={20} />
                      </View>
                    )}
                    onPress={() =>
                      this.props.navigation.navigate("ValuServiceEditPaymentMethod", {
                        paymentMethodId,
                      })
                    }
                  />
                </React.Fragment>
              );
            })}
          <Divider />
          {/* <List.Item
          title={"Connect bank account"}
          right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
          onPress={() => this.props.navigation.navigate("ValuServiceAddPaymentMethod")}
        />
        <Divider /> */}
        </React.Fragment>
      )}
      {/* <List.Subheader>{"Submitted documents"}</List.Subheader>
      {this.VALU_ACCOUNT_DOCUMENTS_FORM_ORDER.map((formKey, index) => {
        const form = this.VALU_ACCOUNT_DOCUMENTS_SCHEMA[formKey];
        const title =
          this.state.documentRenders[formKey] == null ||
          this.state.documentRenders[formKey].documentIds == null ||
          this.state.documentRenders[formKey].documentIds.length == 0
            ? null
            : `${this.state.documentRenders[formKey].documentIds.length} ${
                this.state.documentRenders[formKey].documentIds.length == 1 ? "image" : "images"
              }`;
        const status = this.getProfileFieldStatus(formKey);

        return (
          <React.Fragment key={index}>
            <Divider />
            <List.Item
              title={title == null ? form.placeholder : title}
              description={form.label}
              titleStyle={{
                color: title == null ? Colors.verusDarkGray : Colors.quaternaryColor,
              }}
              left={(props) => {
                return this.state.documentRenders[formKey] == null ? null : (
                  <Avatar.Image
                    {...props}
                    size={96}
                    source={{
                      uri: this.state.documentRenders[formKey].uri,
                    }}
                  />
                );
              }}
              right={(props) => (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {status == null || status == VALU_DATA_SUBMISSION_OPEN ? null : status ==
                    VALU_DATA_SUBMISSION_PENDING ? (
                    <List.Icon
                      {...props}
                      color={Colors.infoButtonColor}
                      icon={"timer-sand"}
                      size={20}
                    />
                  ) : (
                    <List.Icon {...props} color={Colors.verusGreenColor} icon={"check"} size={20} />
                  )}
                  <List.Icon {...props} icon={"chevron-right"} size={20} />
                </View>
              )}
              onPress={() => this.openAccountData(this.VALU_ACCOUNT_DOCUMENTS_SCHEMA[formKey])}
            />
          </React.Fragment>
        );
      })}
      <Divider /> */}
    </ScrollView>
  );
};