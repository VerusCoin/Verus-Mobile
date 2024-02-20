import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List } from "react-native-paper";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES } from "../../../utils/constants/iso3166";
import { renderPersonalBankAccount } from "../../../utils/personal/displayUtils";
import Colors from "../../../globals/colors";

export const PersonalPaymentMethodsRender = function () {
  return (
    <SafeAreaView style={[Styles.defaultRoot,
      {
        backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
      }
    ]}>
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
        }}
        >{"Bank accounts"}</List.Subheader>
        <Divider 
         style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        {this.state.payment_methods.bank_accounts == null
          ? null
          : this.state.payment_methods.bank_accounts.map((bankAccount, index) => {
              const { title, description } = renderPersonalBankAccount(bankAccount)

              return (
                <React.Fragment key={index}>
                  <List.Item
                  titleStyle={{
                    color:this.props.darkMode?Colors.secondaryColor:'black'
                  }} 
                    key={index}
                    title={title}
                    description={description}
                    descriptionStyle={{color:this.props.darkMode ? Colors.secondaryColor : Colors.defaultGrayColor}}
                    right={(props) => (
                      <List.Icon 
                      {...props} 
                      color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
                      icon={"account-edit"} size={20} />
                    )}
                    onPress={() => this.openEditBankAccount(index)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          titleStyle={{
            color:this.props.darkMode?Colors.secondaryColor:'black'
          }}
          title={"Add bank account"}
          right={(props) => <List.Icon 
            {...props} 
            color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
            icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditBankAccount()}
        />
        <Divider 
         style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
