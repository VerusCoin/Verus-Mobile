import React, { Component } from "react"
import { 
  View, 
  FlatList,
  ScrollView,
  RefreshControl,
  Animated
} from "react-native";
import { openConversionSendModal } from "../../../actions/actions/sendModal/dispatchers/sendModal";
import Styles from '../../../styles/index'
import { List, Text, Card, IconButton, Provider, Portal, TouchableRipple } from 'react-native-paper';
import { CoinLogos, getCoinLogo } from "../../../utils/CoinData/CoinData";
import Colors from "../../../globals/colors";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_FROM_CURRENCY_FIELD,
  SEND_MODAL_TO_CURRENCY_FIELD,
} from "../../../utils/constants/sendModal";
import AnimatedActivityIndicatorBox from "../../../components/AnimatedActivityIndicatorBox";

export const ConvertCoinRender = function () {
  const conversions = this.props.conversions == null ? [] : this.props.conversions;
  const activeCoin = this.props.activeCoin

  return conversions.length == 0 ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <View style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth} contentContainerStyle={Styles.horizontalCenterContainer}>
        {Object.values(conversions)
          .sort((a, b) => a.destination.id.localeCompare(b.destination.id))
          .map((conversion, index) => {
            const { destination, price } = conversion;
            const Logo = getCoinLogo(destination.id)

            return (
              <View
                key={index}
                style={{
                  height: 58,
                  marginBottom: 4,
                  marginTop: index > 0 ? 8 : 12,
                  width: "95%",
                }}
              >
                <TouchableRipple
                  onPress={() =>
                    openConversionSendModal(this.props.activeCoin, this.props.subWallet, {
                      [SEND_MODAL_AMOUNT_FIELD]: "",
                      [SEND_MODAL_FROM_CURRENCY_FIELD]: activeCoin,
                      [SEND_MODAL_TO_CURRENCY_FIELD]: destination,
                    })
                  }
                  rippleColor="rgba(0, 0, 0, .32)"
                >
                  <Card
                    elevation={2}
                    style={{
                      height: "100%",
                      backgroundColor: destination.theme_color,
                      overflow: "hidden",
                      paddingTop: 4,
                    }}
                  >
                    <List.Item
                      left={(props) => (
                        <View
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Logo
                            style={{
                              alignSelf: "center",
                              marginLeft: 8,
                              marginRight: 8,
                            }}
                            width={24}
                            height={24}
                          />
                          <View
                            {...props}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              marginLeft: 8,
                            }}
                          >
                            <View
                              style={{
                                fontSize: 14,
                                textAlign: "left",
                                display: "flex",
                                flexDirection: "row",
                              }}
                            >
                              <Text style={{ fontWeight: "500", color: Colors.secondaryColor }}>
                                {activeCoin.display_ticker}
                              </Text>
                              <Text style={{ fontWeight: "300", color: Colors.secondaryColor }}>
                                {" to "}
                              </Text>
                              <Text style={{ fontWeight: "500", color: Colors.secondaryColor }}>
                                {destination.display_ticker}
                              </Text>
                            </View>
                            <View
                              style={{
                                fontSize: 14,
                                textAlign: "left",
                                display: "flex",
                                flexDirection: "row",
                              }}
                            >
                              <Text style={{ fontWeight: "300", color: Colors.secondaryColor }}>
                                {"1 "}
                              </Text>
                              <Text style={{ fontWeight: "300", color: Colors.secondaryColor }}>
                                {activeCoin.display_ticker}
                              </Text>
                              <Text style={{ fontWeight: "300", color: Colors.secondaryColor }}>
                                {" = "}
                              </Text>
                              <Text style={{ fontWeight: "500", color: Colors.secondaryColor }}>
                                {price}
                              </Text>
                              <Text
                                style={{ fontWeight: "300", color: Colors.secondaryColor }}
                              >{` ${destination.display_ticker}`}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                      style={{ padding: 8, paddingRight: 0 }}
                    />
                  </Card>
                </TouchableRipple>
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
};
