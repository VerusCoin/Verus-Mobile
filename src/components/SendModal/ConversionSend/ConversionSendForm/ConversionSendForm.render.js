import React from "react";
import {
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { TextInput, Button, Card, Title, List, Avatar } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { RenderSquareCoinLogo } from "../../../../utils/CoinData/Graphics";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_TO_CURRENCY_FIELD,
  SEND_MODAL_FROM_CURRENCY_FIELD
} from "../../../../utils/constants/sendModal";
import AnimatedActivityIndicatorBox from "../../../AnimatedActivityIndicatorBox";

export const ConversionSendFormRender = function () {
  return this.state.loading ? (
    <AnimatedActivityIndicatorBox />
  ) : this.state.selectCurrencyModalParams.open ? (
    ConversionCurrencyListRender.call(this)
  ) : ConversionSendFormRenderInputForm.call(this)
};

export const ConversionSendFormRenderInputForm = function() {
  const { data } = this.props.sendModal;
  const { sendAmount, receiveAmount } = this.state;
  const fromCurrency = data[SEND_MODAL_FROM_CURRENCY_FIELD];
  const toCurrency = data[SEND_MODAL_TO_CURRENCY_FIELD];
  const amount = data[SEND_MODAL_AMOUNT_FIELD];
  const price =
    this.state.selectedConversionPath != null ? this.state.selectedConversionPath.price : 0;

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
          paddingTop: 16,
        }}
      >
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Card
            elevation={2}
            onPress={Keyboard.dismiss}
            style={{
              backgroundColor: Colors.secondaryColor,
              padding: 16,
              paddingTop: 8,
            }}
          >
            <Title style={{ color: Colors.primaryColor }}>Send</Title>
            <View style={Styles.flexRow}>
              <TextInput
                label={"Amount"}
                keyboardType={"decimal-pad"}
                autoCapitalize={"none"}
                autoCorrect={false}
                value={this.state.controlAmounts ? amount : sendAmount == null ? "" : sendAmount}
                onChangeText={(text) => this.updateFormAmount(text, true)}
                mode="outlined"
                style={{
                  flex: 2,
                  marginRight: 4,
                }}
              />
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingLeft: 4,
                }}
                onPress={() => this.openSourceOptions()}
              >
                <TextInput
                  label={"Currency"}
                  editable={false}
                  pointerEvents="none"
                  value={fromCurrency == null ? null : fromCurrency.display_ticker}
                  mode="outlined"
                />
              </TouchableOpacity>
            </View>
          </Card>
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Card
            elevation={2}
            onPress={Keyboard.dismiss}
            style={{
              backgroundColor: Colors.secondaryColor,
              padding: 16,
              paddingTop: 8,
            }}
          >
            <Title style={{ color: Colors.primaryColor }}>Receive</Title>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <View style={Styles.flexRow}>
                <TextInput
                  label={"Amount"}
                  keyboardType={"decimal-pad"}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  onChangeText={(text) => this.updateFormAmount(text, false)}
                  value={
                    this.state.controlAmounts
                      ? (Number(amount) * price).toFixed(8)
                      : receiveAmount == null
                      ? ""
                      : receiveAmount
                  }
                  mode="outlined"
                  style={{
                    flex: 2,
                    marginRight: 4,
                  }}
                />
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingLeft: 4,
                  }}
                  onPress={() => this.openDestinationOptions()}
                >
                  <TextInput
                    label={"Currency"}
                    editable={false}
                    pointerEvents="none"
                    value={toCurrency == null ? null : toCurrency.display_ticker}
                    mode="outlined"
                  />
                </TouchableOpacity>
              </View>
              {/* <View style={Styles.flexRow}>
                <TextInput
                  label={"Address"}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  // value={data[SEND_MODAL_AMOUNT_FIELD]}
                  mode="outlined"
                  // onChangeText={(text) => this.props.updateSendFormData(SEND_MODAL_AMOUNT_FIELD, text)}
                  style={{
                    flex: 1,
                    marginTop: 2,
                  }}
                />
              </View> */}
            </View>
          </Card>
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Card
            elevation={2}
            onPress={Keyboard.dismiss}
            style={{
              backgroundColor: Colors.secondaryColor,
              padding: 16,
            }}
          >
            <Title style={{ color: Colors.basicButtonColor, fontSize: 16 }}>{`Price per ${
              fromCurrency == null ? "-" : fromCurrency.display_ticker
            }: ${toCurrency == null ? "-" : `${price} ${toCurrency.display_ticker}`}`}</Title>
          </Card>
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={() => this.submitData()}>
            Convert
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

export const ConversionCurrencyListRender = function () {
  return (
    <View style={{ ...Styles.centerContainer, backgroundColor: Colors.secondaryColor }}>
      <List.Item
        title={"Back"}
        description={"Return to conversion form"}
        left={(props) => <List.Icon {...props} icon={"keyboard-backspace"} size={20} />}
        onPress={() => this.selectOption(null)}
        style={{
          width: "100%",
        }}
      />
      <FlatList
        style={Styles.fullWidth}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity onPress={() => this.selectOption(item.value)}>
              <List.Item
                title={item.title}
                left={() => (
                  <View
                    style={{
                      paddingLeft: 8,
                      paddingRight: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {RenderSquareCoinLogo(item.key)}
                  </View>
                )}
                description={item.description}
              />
            </TouchableOpacity>
          );
        }}
        data={this.state.selectCurrencyModalParams.options.map((option) => {
          return this.LIST_OPTIONS[this.state.selectCurrencyModalParams.type].formatData(option);
        })}
      />
    </View>
  );
};