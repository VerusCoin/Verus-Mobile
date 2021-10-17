import React from "react";
import {
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { TextInput, Button, Card, Title, List, Text } from "react-native-paper";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { RenderSquareLogo } from "../../../../utils/CoinData/Graphics";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_FROM_CURRENCY_FIELD,
  SEND_MODAL_SOURCE_FIELD,
} from "../../../../utils/constants/sendModal";
import AnimatedActivityIndicatorBox from "../../../AnimatedActivityIndicatorBox";

export const DepositSendFormRender = function () {
  return this.state.loading ? (
    <AnimatedActivityIndicatorBox />
  ) : this.state.selectCurrencyModalParams.open ? (
    ConversionCurrencyListRender.call(this)
  ) : this.state.sourceListParams.open ? (
    DestinationListRender.call(this)
  ) : (
    DepositSendFormRenderInputForm.call(this)
  );
};

export const DepositSendFormRenderInputForm = function () {
  const { data, coinObj } = this.props.sendModal;
  const { depositAmount, chargeAmount } = this.state;
  const fromCurrency = data[SEND_MODAL_FROM_CURRENCY_FIELD].sourceCurrencyId;
  const amount = data[SEND_MODAL_AMOUNT_FIELD];
  const price =
    data[SEND_MODAL_FROM_CURRENCY_FIELD].price == null
      ? 0
      : data[SEND_MODAL_FROM_CURRENCY_FIELD].price;

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
            <Title style={{ color: Colors.primaryColor }}>Source</Title>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <View style={Styles.flexRow}>
                <TextInput
                  returnKeyType="done"
                  label={"Amount"}
                  keyboardType={"decimal-pad"}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  onChangeText={(text) => this.updateFormAmount(text, false)}
                  value={
                    this.state.controlAmounts ? amount : chargeAmount == null ? "" : chargeAmount
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
                  onPress={() => this.openSourceCurrencyOptions()}
                >
                  <TextInput
                    label={"Currency"}
                    editable={false}
                    pointerEvents="none"
                    value={fromCurrency}
                    mode="outlined"
                  />
                </TouchableOpacity>
              </View>
              <View style={Styles.flexRow}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                  }}
                  onPress={() => this.openSourceOptions()}
                >
                  <TextInput
                    editable={false}
                    pointerEvents="none"
                    label={"Source"}
                    value={
                      data[SEND_MODAL_SOURCE_FIELD] == null
                        ? ""
                        : data[SEND_MODAL_SOURCE_FIELD].displayName
                    }
                    mode="outlined"
                  />
                </TouchableOpacity>
              </View>
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
            <Title style={{ color: Colors.primaryColor }}>Receive (estimated)</Title>
            <View style={Styles.flexRow}>
              <TextInput
                returnKeyType="done"
                label={"Amount"}
                keyboardType={"decimal-pad"}
                autoCapitalize={"none"}
                autoCorrect={false}
                value={
                  this.state.controlAmounts
                    ? (Number(amount) * price).toFixed(8)
                    : depositAmount == null
                    ? ""
                    : depositAmount
                }
                onChangeText={(text) => this.updateFormAmount(text, true)}
                mode="outlined"
                style={{
                  flex: 2,
                  marginRight: 4,
                }}
              />
              <TextInput
                label={"Currency"}
                style={{
                  flex: 1,
                  paddingLeft: 4,
                }}
                editable={false}
                pointerEvents="none"
                value={coinObj.display_ticker}
                mode="outlined"
              />
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
              fromCurrency == null ? "-" : fromCurrency
            }: ${coinObj == null ? "-" : `${price} ${coinObj.display_ticker}`}`}</Title>
          </Card>
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={() => this.submitData()}>
            Deposit
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export const ConversionCurrencyListRender = function () {
  return (
    <View style={{ ...Styles.centerContainer, backgroundColor: Colors.secondaryColor }}>
      <List.Item
        title={"Back"}
        description={"Return to deposit form"}
        left={(props) => <List.Icon {...props} icon={"keyboard-backspace"} size={20} />}
        onPress={() => this.selectCurrencyOption(null)}
        style={{
          width: "100%",
        }}
      />
      <FlatList
        style={Styles.fullWidth}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity onPress={() => this.selectCurrencyOption(item.value)}>
              <List.Item title={item.title} description={item.description} />
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

export const DestinationListRender = function () {
  return (
    <View style={{ ...Styles.centerContainer, backgroundColor: Colors.secondaryColor }}>
      <List.Item
        title={"Back"}
        description={"Return to deposit form"}
        left={(props) => <List.Icon {...props} icon={"keyboard-backspace"} size={20} />}
        onPress={() => this.selectSourceOption(null)}
        style={{
          width: "100%",
        }}
      />
      <FlatList
        style={Styles.fullWidth}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity onPress={() => this.selectSourceOption(item.value)}>
              <List.Item
                title={item.title}
                description={item.description}
                left={() =>
                  item.country == null ? null : (
                    <Text style={{ fontSize: 40 }}>{item.country.emoji}</Text>
                  )
                }
              />
            </TouchableOpacity>
          );
        }}
        data={this.state.sourceListParams.options}
      />
    </View>
  );
};
