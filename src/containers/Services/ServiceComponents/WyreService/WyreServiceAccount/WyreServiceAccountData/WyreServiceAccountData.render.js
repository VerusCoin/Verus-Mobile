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
import MissingInfoRedirect from "../../../../../../components/MissingInfoRedirect/MissingInfoRedirect";

export const WyreServiceAccountDataRender = function () {
  const wyreFieldData =
    this.state.params.wyreFieldData == null
      ? {}
      : this.state.params.wyreFieldData;
  const options = this.state.params.options == null ? [] : this.state.params.options
  const missingDataDisplay = this.state.params.missingDataDisplay

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
      {options.length == 0 && (
        <MissingInfoRedirect
          icon={missingDataDisplay.icon}
          label={missingDataDisplay.label}
          buttonLabel="edit personal profile"
          loading={this.props.loading}
          onPress={() =>
            this.goToPersonalInfoScreen(
              this.state.params.configureRoute,
              this.state.params.configureRouteParams
            )
          }
        />
      )}
      {options.length > 0 && (
        <ScrollView style={Styles.flexBackground}>
          <Divider />
          <List.Subheader>{"Submitted data"}</List.Subheader>
          <Divider />
          <List.Item
            title={
              wyreFieldData.value == null ||
              (Array.isArray(wyreFieldData.value) && wyreFieldData.value.length == 0)
                ? "None"
                : Array.isArray(wyreFieldData.value)
                ? "Submitted"
                : renderWyreDataField(wyreFieldData.fieldId, wyreFieldData.value).title
            }
            titleStyle={{
              color:
                wyreFieldData.value == null ||
                (Array.isArray(wyreFieldData.value) && wyreFieldData.value.length == 0)
                  ? Colors.verusDarkGray
                  : Colors.quaternaryColor,
            }}
            description={this.state.params.label}
          />
          <Divider />
          <List.Item
            title={
              wyreFieldData.note != null
                ? wyreFieldData.note
                : wyreFieldData.status === WYRE_DATA_SUBMISSION_OPEN
                ? "None"
                : wyreFieldData.status === WYRE_DATA_SUBMISSION_PENDING
                ? "Pending approval"
                : wyreFieldData.status === WYRE_DATA_SUBMISSION_APPROVED
                ? "Approved"
                : "Unknown"
            }
            titleStyle={{
              color:
                wyreFieldData.status === WYRE_DATA_SUBMISSION_OPEN || wyreFieldData.note != null
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
          <React.Fragment>
            <List.Subheader>{this.state.params.selectLabel}</List.Subheader>
            <Divider />
            {options.map((option, index) => {
              return (
                <React.Fragment key={index}>
                  <List.Item
                    title={option.title}
                    description={option.description}
                    left={option.left}
                    onPress={() =>
                      option.incomplete
                        ? this.alertIncompleteOption()
                        : this.submitOption(option.submission)
                    }
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
          </React.Fragment>
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
                right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
              />
              <Divider />
            </React.Fragment>
          )}
          {this.state.params.addRoute != null && (
            <React.Fragment>
              <List.Item
                title={this.state.params.addLabel}
                onPress={() => {}}
                right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
              />
              <Divider />
            </React.Fragment>
          )}
        </ScrollView>
      )}
    </React.Fragment>
  );
};