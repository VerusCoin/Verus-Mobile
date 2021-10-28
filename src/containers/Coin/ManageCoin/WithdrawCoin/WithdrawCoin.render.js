import React, { Component } from "react"
import { 
  View, 
  ScrollView
} from "react-native";
import { List, Text, Divider } from "react-native-paper"
import Styles from '../../../../styles/index'
import AnimatedActivityIndicatorBox from "../../../../components/AnimatedActivityIndicatorBox";
import { ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";
import { openWithdrawSendModal } from "../../../../actions/actions/sendModal/dispatchers/sendModal";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_DESTINATION_FIELD,
  SEND_MODAL_TO_CURRENCY_FIELD,
} from "../../../../utils/constants/sendModal";
import MissingInfoRedirect from "../../../../components/MissingInfoRedirect/MissingInfoRedirect";

export const WithdrawCoinRender = function () {
  const hasDestinations = this.props.withdrawDestinations != null && this.props.withdrawDestinations.length > 0
  const destinations = this.props.withdrawDestinations == null ? [] : this.props.withdrawDestinations;
  
  return this.props.withdrawDestinations == null ? (
    <AnimatedActivityIndicatorBox />
  ) : !hasDestinations ? (
    <MissingInfoRedirect
      icon={"bank-transfer-in"}
      label={"Add withdraw destinations under the services tab to see them here."}
      onPress={() =>
        this.props.navigation.navigate("Home", {
          screen: "ServicesHome",
          initial: false,
        })
      }
    />
  ) : (
    <View style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth} contentContainerStyle={Styles.horizontalCenterContainer}>
        <View style={Styles.fullWidth}>
          <List.Subheader style={Styles.wide}>{"Select an account to withdraw to"}</List.Subheader>
          <Divider />
        </View>
        {destinations.map((destination, index) => {
          const { displayName, countryCode, currencies } = destination;
          const isoCountry =
            ISO_3166_COUNTRIES[countryCode] == null ? {} : ISO_3166_COUNTRIES[countryCode];

          return (
            <View
              key={index}
              style={{
                width: "100%",
              }}
            >
              <List.Item
                left={() =>
                  isoCountry.emoji == null ? null : (
                    <Text style={{ fontSize: 40 }}>{isoCountry.emoji}</Text>
                  )
                }
                onPress={() => {
                  openWithdrawSendModal(this.props.activeCoin, this.props.subWallet, {
                    [SEND_MODAL_AMOUNT_FIELD]: "",
                    [SEND_MODAL_DESTINATION_FIELD]: destination,
                    [SEND_MODAL_TO_CURRENCY_FIELD]: currencies[Object.keys(currencies)[0]],
                  });
                }}
                title={displayName}
                description={isoCountry.name}
              />
              <Divider />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
