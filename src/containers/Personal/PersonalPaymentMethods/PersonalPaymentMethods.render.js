import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List } from "react-native-paper";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES } from "../../../utils/constants/iso3166";
import { renderPersonalBankAccount } from "../../../utils/personal/displayUtils";

export const PersonalPaymentMethodsRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader>{"Bank accounts"}</List.Subheader>
        <Divider />
        {this.state.payment_methods.bank_accounts == null
          ? null
          : this.state.payment_methods.bank_accounts.map((bankAccount, index) => {
              const { title, description } = renderPersonalBankAccount(bankAccount)

              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={title}
                    description={description}
                    right={(props) => (
                      <List.Icon {...props} icon={"account-edit"} size={20} />
                    )}
                    onPress={() => this.openEditBankAccount(index)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          title={"Add bank account"}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditBankAccount()}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
