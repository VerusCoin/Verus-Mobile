import React from "react";
import { ScrollView, View } from "react-native";
import { List, Divider } from "react-native-paper";
import AnimatedActivityIndicator from "../../../../../../components/AnimatedActivityIndicator";
import Colors from "../../../../../../globals/colors";
import Styles from "../../../../../../styles";
import {
  WYRE_DATA_SUBMISSION_OPEN,
  WYRE_DATA_SUBMISSION_PENDING,
  WYRE_DATA_SUBMISSION_APPROVED,
} from "../../../../../../utils/constants/services";
import { renderWyreDataField } from "../../../../../../utils/services/translationUtils";

export const WyreServiceAccountDataRender = function () {
  const wyreFieldData =
    this.state.params.wyreFieldData == null
      ? {}
      : this.state.params.wyreFieldData;
  const options = this.state.params.options == null ? [] : this.state.params.options

  return (
    <React.Fragment>
      {this.props.loading && (
        <View
          style={{
            ...Styles.centerContainer,
            ...Styles.backgroundColorWhite,
            width: "100%",
            height: "100%",
            position: "absolute",
            zIndex: 999,
          }}
        >
          <AnimatedActivityIndicator
            style={{
              width: 128,
            }}
          />
        </View>
      )}
      <ScrollView style={Styles.flexBackground}>
        <Divider />
        <List.Subheader>{"Submitted data"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            wyreFieldData.value == null
              ? "None"
              : renderWyreDataField(wyreFieldData.fieldId, wyreFieldData.value).title
          }
          titleStyle={{
            color:
              wyreFieldData.value == null
                ? Colors.verusDarkGray
                : Colors.quaternaryColor,
          }}
          description={this.state.params.label}
        />
        <Divider />
        <List.Item
          title={
            wyreFieldData.status === WYRE_DATA_SUBMISSION_OPEN
              ? "None"
              : wyreFieldData.status === WYRE_DATA_SUBMISSION_PENDING
              ? "Pending approval"
              : wyreFieldData.status === WYRE_DATA_SUBMISSION_APPROVED
              ? "Approved"
              : "Unknown"
          }
          titleStyle={{
            color:
              wyreFieldData.status === WYRE_DATA_SUBMISSION_OPEN
                ? Colors.verusDarkGray
                : wyreFieldData.status === WYRE_DATA_SUBMISSION_PENDING
                ? Colors.infoButtonColor
                : wyreFieldData.status === WYRE_DATA_SUBMISSION_APPROVED
                ? Colors.verusGreenColor
                : Colors.verusDarkGray,
          }}
          description={"Submission status"}
        />
        <Divider />
        {options.length > 0 && (
          <React.Fragment>
            <List.Subheader>{this.state.params.selectLabel}</List.Subheader>
            <Divider />
            {options.map((option, index) => {
              return (
                <React.Fragment key={index}>
                  <List.Item
                    title={option.title}
                    description={option.description}
                    onPress={() => this.submitOption(option.submission)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        )}
        <List.Subheader>{this.state.params.optionsLabel}</List.Subheader>
        <Divider />
        {this.state.params.configureRoute != null && (
          <React.Fragment>
            <List.Item
              title={this.state.params.configureLabel}
              onPress={() =>
                this.goToPersonalInfoScreen(
                  this.state.params.configureRoute,
                  this.state.params.configureRouteParams
                )
              }
              right={(props) => (
                <List.Icon {...props} icon={"chevron-right"} size={20} />
              )}
            />
            <Divider />
          </React.Fragment>
        )}
        {this.state.params.addRoute != null && (
          <React.Fragment>
            <List.Item
              title={this.state.params.addLabel}
              onPress={() => {}}
              right={(props) => (
                <List.Icon {...props} icon={"plus"} size={20} />
              )}
            />
            <Divider />
          </React.Fragment>
        )}
      </ScrollView>
    </React.Fragment>
  );
};