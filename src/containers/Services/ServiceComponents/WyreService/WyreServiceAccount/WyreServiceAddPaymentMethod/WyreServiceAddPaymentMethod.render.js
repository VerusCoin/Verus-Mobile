import React from "react";
import { ScrollView, View } from "react-native";
import { List, Divider } from "react-native-paper";
import AnimatedActivityIndicator from "../../../../../../components/AnimatedActivityIndicator";
import Styles from "../../../../../../styles";
import { renderPersonalBankAccount } from "../../../../../../utils/personal/displayUtils";
import MissingInfoRedirect from "../../../../../../components/MissingInfoRedirect/MissingInfoRedirect";

export const WyreServiceAddPaymentMethodRender = function () {
  const hasPersonalBankAccounts = !(this.state.payment_methods.bank_accounts == null ||
    this.state.payment_methods.bank_accounts.length == 0)

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
      {!hasPersonalBankAccounts && (
        <MissingInfoRedirect 
          loading={this.props.loading}
          icon="bank"
          label="You'll need to add at least one bank account to your personal profile to submit one here."
          buttonLabel="edit personal profile"
          onPress={() => this.goToPersonalInfoScreen("PersonalPaymentMethods")}
        />
      )}
      {hasPersonalBankAccounts && (
        <ScrollView style={Styles.flexBackground}>
          <Divider />
          <List.Subheader>{"Select account"}</List.Subheader>
          <Divider />
          {this.state.payment_methods.bank_accounts.map((account, index) => {
            const { title, description } = renderPersonalBankAccount(account);

            return (
              <React.Fragment key={index}>
                <List.Item
                  title={title}
                  description={description}
                  onPress={() => this.selectAccount(account)}
                />
                <Divider />
              </React.Fragment>
            );
          })}
          <List.Subheader>{"Account options"}</List.Subheader>
          <Divider />
          <List.Item
            title={"Configure bank info"}
            onPress={() => this.goToPersonalInfoScreen("PersonalPaymentMethods")}
            right={(props) => (
              <List.Icon {...props} icon={"chevron-right"} size={20} />
            )}
          />
          <Divider />
        </ScrollView>
      )}
    </React.Fragment>
  );
};