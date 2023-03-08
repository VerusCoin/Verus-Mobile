import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { API_SEND, DLIGHT_PRIVATE } from "../../../../utils/constants/intervalConstants";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
} from "../../../../utils/constants/sendModal";

export const TraditionalCryptoSendFormRender = function () {
  const { subWallet, data, coinObj } = this.props.sendModal;
  const channel = subWallet.api_channels[API_SEND]
  const {
    balances,
    rates,
    displayCurrency,
  } = this.props;
  const { amountFiat } = this.state
  const _price = this.getPrice();
  const fiatEnabled =
    rates[coinObj.id] && rates[coinObj.id][displayCurrency] != null;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={{
          ...Styles.flexBackground,
          ...Styles.fullWidth,
        }}
        contentContainerStyle={{
          ...Styles.centerContainer,
          justifyContent: "flex-start",
        }}
      >
        <View style={Styles.wideBlock}>
          <TextInput
            returnKeyType="done"
            label="Recipient address"
            value={data[SEND_MODAL_TO_ADDRESS_FIELD]}
            mode="outlined"
            onChangeText={(text) =>
              this.props.updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
          />
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <View style={Styles.flexRow}>
            <TextInput
              returnKeyType="done"
              label={`Amount${
                fiatEnabled && _price != 0
                  ? ` (~${_price} ${amountFiat ? coinObj.display_ticker : displayCurrency})`
                  : ""
              }`}
              keyboardType={"decimal-pad"}
              autoCapitalize={"none"}
              autoCorrect={false}
              value={data[SEND_MODAL_AMOUNT_FIELD]}
              mode="outlined"
              onChangeText={(text) => this.props.updateSendFormData(SEND_MODAL_AMOUNT_FIELD, text)}
              style={{
                flex: 1,
              }}
            />
            <Button
              onPress={() =>
                this.setState({
                  amountFiat: !amountFiat,
                })
              }
              color={Colors.primaryColor}
              disabled={!fiatEnabled || balances.results == null}
              style={{
                alignSelf: "center",
                marginTop: 6,
              }}
              compact
            >
              {amountFiat ? displayCurrency : coinObj.display_ticker}
            </Button>
            <Button
              onPress={() => this.maxAmount()}
              color={Colors.primaryColor}
              style={{
                alignSelf: "center",
                marginTop: 6,
              }}
              disabled={balances.results == null}
              compact
            >
              {"Max"}
            </Button>
          </View>
        </View>
        {channel === DLIGHT_PRIVATE &&
          data[SEND_MODAL_TO_ADDRESS_FIELD] != null &&
          (data[SEND_MODAL_TO_ADDRESS_FIELD].includes(":private") ||
            (data[SEND_MODAL_TO_ADDRESS_FIELD][0] === "z" &&
              !data[SEND_MODAL_TO_ADDRESS_FIELD].includes("@"))) && (
            <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
              <TextInput
                returnKeyType="done"
                label="Memo"
                value={data[SEND_MODAL_MEMO_FIELD]}
                mode="outlined"
                onChangeText={(text) => this.props.updateSendFormData(SEND_MODAL_MEMO_FIELD, text)}
              />
            </View>
          )}
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={() => this.submitData()}>
            Send
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};