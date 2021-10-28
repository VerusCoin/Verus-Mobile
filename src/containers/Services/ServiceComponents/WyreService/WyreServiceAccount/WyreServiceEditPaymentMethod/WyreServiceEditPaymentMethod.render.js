import React from "react";
import { ScrollView, View } from "react-native";
import { List, Divider, Avatar, Text } from "react-native-paper";
import AnimatedActivityIndicator from "../../../../../../components/AnimatedActivityIndicator";
import Colors from "../../../../../../globals/colors";
import Styles from "../../../../../../styles";
import { PERSONAL_DOCUMENT_BANK_STATEMENT } from "../../../../../../utils/constants/personal";
import { ISO_3166_COUNTRIES } from "../../../../../../utils/constants/iso3166";
import {
  WYRE_DATA_SUBMISSION_PENDING,
  WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP,
  WYRE_DATA_SUBMISSION_ACTIVE,
  WYRE_DATA_SUBMISSION_REJECTED,
} from "../../../../../../utils/constants/services";

export const WyreServiceEditPaymentMethodRender = function () {
  const paymentMethod =
    this.state.paymentMethod == null
      ? {}
      : this.state.paymentMethod;
  const documents = this.state.documents
  const { name, countryCode, supportsPayment, status } = paymentMethod
  const submittedDocuments = paymentMethod.documents
  const bankStatementSubmitted = submittedDocuments != null && submittedDocuments.length > 0;

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
          title={name}
          description={`${
            ISO_3166_COUNTRIES[countryCode] == null
              ? countryCode
              : ISO_3166_COUNTRIES[countryCode].emoji
          } ${supportsPayment ? "" : "recipient "}account`}
        />
        <Divider />
        <List.Item
          title={
            status === WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP
              ? supportsPayment
                ? "Awaiting bank statement"
                : "Active as recipient"
              : status === WYRE_DATA_SUBMISSION_PENDING
              ? "Pending approval"
              : status === WYRE_DATA_SUBMISSION_ACTIVE
              ? "Approved"
              : status === WYRE_DATA_SUBMISSION_REJECTED
              ? "Rejected"
              : "Unknown"
          }
          description={"Submission status"}
          titleStyle={{
            color:
              status === WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP
                ? Colors.verusDarkGray
                : status === WYRE_DATA_SUBMISSION_PENDING
                ? Colors.infoButtonColor
                : status === WYRE_DATA_SUBMISSION_ACTIVE
                ? Colors.verusGreenColor
                : status === WYRE_DATA_SUBMISSION_REJECTED
                ? Colors.warningButtonColor
                : Colors.verusDarkGray,
          }}
        />
        <Divider />
        <List.Item
          title={bankStatementSubmitted ? "Submitted" : "None"}
          description={"Bank statement"}
          titleStyle={{
            color: bankStatementSubmitted ? Colors.verusGreenColor : Colors.verusDarkGray,
          }}
        />
        <Divider />
        {status === WYRE_DATA_SUBMISSION_AWAITING_FOLLOWUP && !supportsPayment && (
          <React.Fragment>
            <Text
              style={{
                fontSize: 14,
                color: Colors.verusDarkGray,
                textAlign: "center",
                padding: 16,
              }}
            >
              {
                "This bank account is ready to receive funds, but you will not be able to fund your wallet from it until you submit a bank statement and it is approved"
              }
            </Text>
            <Divider />
          </React.Fragment>
        )}
        <List.Subheader>{"Select a bank statement no older than 3 months"}</List.Subheader>
        {documents
          .filter((document) => document.image_type === PERSONAL_DOCUMENT_BANK_STATEMENT)
          .map((document, index) => {
            return (
              <React.Fragment key={index}>
                <Divider />
                <List.Item
                  title={`${document.uris.length} pages`}
                  description={document.description}
                  left={(props) => {
                    return (
                      <Avatar.Image
                        {...props}
                        size={96}
                        source={{
                          uri: document.uris[0],
                        }}
                      />
                    );
                  }}
                  onPress={() => this.submitOption(paymentMethod, document.uris)}
                />
              </React.Fragment>
            );
          })}
        <Divider />
        <List.Item
          title={"Configure personal documents"}
          onPress={() => this.goToPersonalInfoScreen("PersonalImages")}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
        />
        <Divider />
        <List.Subheader>{"Account options"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Remove account"}
          titleStyle={{
            color: Colors.warningButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"close"} size={20} />}
          onPress={() => this.deletePaymentMethod(paymentMethod)}
        />
        <Divider />
      </ScrollView>
    </React.Fragment>
  );
};