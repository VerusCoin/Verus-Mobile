import React, { useState } from "react";
import BigNumber from "bignumber.js";
import { Alert, ScrollView, View, TouchableWithoutFeedback, Keyboard, Dimensions } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useSelector } from 'react-redux';
import { traditionalCryptoSend, TraditionalCryptoSendFee } from "../../../../actions/actionDispatchers";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getRecommendedBTCFees } from "../../../../utils/api/channels/general/callCreators";
import { USD } from "../../../../utils/constants/currencies";
import { API_GET_BALANCES, API_GET_FIATPRICE, API_SEND, DLIGHT_PRIVATE, ELECTRUM } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_FORM_STEP_CONFIRM, SEND_MODAL_MEMO_FIELD, SEND_MODAL_TO_ADDRESS_FIELD } from "../../../../utils/constants/sendModal";
import { isNumber, truncateDecimal } from "../../../../utils/math";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { useEffect } from "react";
import { CoinDirectory } from "../../../../utils/CoinData/CoinDirectory";
import { selectAddressBlocklist } from "../../../../selectors/settings";
import { addressIsBlocked } from "../../../../utils/addressBlocklist";

const TraditionalCryptoSendForm = ({ setLoading, setModalHeight, updateSendFormData, navigation }) => {
  const { height } = Dimensions.get("window");
  const [amountFiat, setAmountFiat] = useState(false);
  const sendModal = useSelector(state => state.sendModal);
  const addressBlocklist = useSelector(selectAddressBlocklist);
  const balances = useSelector(state => {
    const chainTicker = state.sendModal.coinObj.id;
    const balance_channel = state.sendModal.subWallet.api_channels[API_GET_BALANCES];
    return {
      results: state.ledger.balances[balance_channel]
        ? state.ledger.balances[balance_channel][chainTicker]
        : null,
      errors: state.errors[API_GET_BALANCES][balance_channel][chainTicker],
    };
  });
  const rates = useSelector(state => state.ledger.rates[state.sendModal.subWallet.api_channels[API_GET_FIATPRICE]]);
  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);
  const [price, setPrice] = useState(0);
  const networkName = useSelector(state => {
    try {
      const subwallet = state.sendModal.subWallet;

      return subwallet.network ? CoinDirectory.getBasicCoinObj(subwallet.network).display_ticker : null;
    } catch(e) {
      console.error(e);
      return null;
    }
  });

  useEffect(() => {
    setPrice(getPrice());
  }, [rates[sendModal.coinObj.id], sendModal.data[SEND_MODAL_AMOUNT_FIELD]]);

  const FEE_CALCULATORS = {
    ["BTC"]: {
      [ELECTRUM]: {
        calculator: getRecommendedBTCFees,
        isPerByte: true,
      },
    },
    ["TESTNET"]: {
      [ELECTRUM]: {
        calculator: () => getRecommendedBTCFees(true),
        isPerByte: true,
      },
    },
  };

  const translateAmount = (amount, fromFiat = false) => {
    let _price =
      rates[sendModal.coinObj.id] != null
        ? rates[sendModal.coinObj.id][displayCurrency]
        : null;

    return _price == null
      ? fromFiat
        ? "0"
        : amount
      : amountFiat
      ? fromFiat
        ? BigNumber(amount).dividedBy(BigNumber(_price)).toString()
        : BigNumber(amount).multipliedBy(BigNumber(_price)).toString()
      : amount;
  };

  const fillAmount = (amount) => {
    let displayAmount = BigNumber(translateAmount(amount));
    if (displayAmount.isLessThan(BigNumber(0))) {
      displayAmount = BigNumber(0);
    }

    updateSendFormData(
      SEND_MODAL_AMOUNT_FIELD,
      amountFiat ? truncateDecimal(displayAmount, 2) : displayAmount.toString()
    );
  };

  const getPrice = () => {
    const { coinObj } = sendModal

    const amount = Number(sendModal.data[SEND_MODAL_AMOUNT_FIELD]);

    let _price = rates[coinObj.id] != null ? rates[coinObj.id][displayCurrency] : null;

    if (amount == null || !isNumber(amount) || !_price) {
      return 0;
    }

    if (amountFiat) {
      return truncateDecimal(amount / _price, 5);
    } else {
      return truncateDecimal(amount * _price, 2);
    }
  };

  const getProcessedAmount = () => {
    const { data } = sendModal;

    const amount =
      (data[SEND_MODAL_AMOUNT_FIELD].includes(".") &&
        data[SEND_MODAL_AMOUNT_FIELD].includes(",")) ||
      !data[SEND_MODAL_AMOUNT_FIELD]
        ? data[SEND_MODAL_AMOUNT_FIELD]
        : data[SEND_MODAL_AMOUNT_FIELD].replace(/,/g, ".");

    if (!amount || amount.length < 0) {
      return null;
    } else if (!isNumber(Number(amount))) {
      return null;
    } else {
      return translateAmount(amount, amountFiat);
    }
  }

  const formHasError = () => {
    const { subWallet, coinObj, data } = sendModal;
    const channel = subWallet.api_channels[API_SEND]

    const spendableBalance = balances.results.confirmed;

    const toAddress =
      data[SEND_MODAL_TO_ADDRESS_FIELD] != null ? data[SEND_MODAL_TO_ADDRESS_FIELD].trim() : "";

    const amount = getProcessedAmount();

    if (!toAddress || toAddress.length < 1) {
      createAlert("Required Field", "Address is a required field.");
      return true;
    } else if (addressIsBlocked(toAddress, addressBlocklist)) {
      createAlert("Blocked Address", "The address you are trying to send to is included in your address blocklist.");
      return true;
    }

    if (amount == null) {
      createAlert("Invalid Amount", "Please enter a valid number amount.");
      return true;
    } else {
      if (Number(amount) > Number(spendableBalance)) {
        const message =
          "Insufficient funds, " +
          (spendableBalance < 0
            ? "available amount is less than fee"
            : spendableBalance +
              " confirmed " +
              coinObj.display_ticker +
              " available." +
              (channel === DLIGHT_PRIVATE
                ? "\n\nFunds from private transactions require 10 confirmations (~10 minutes) before they can be spent."
                : ""));

        createAlert("Insufficient Funds", message);
        return true;
      }
    }

    return false;
  };

  const submitData = async () => {
    if (formHasError()) return;

    setLoading(true);

    const { subWallet, coinObj, data } = sendModal;
    const channel = subWallet.api_channels[API_SEND]
    const address = data[SEND_MODAL_TO_ADDRESS_FIELD];
    const amount = getProcessedAmount()
    const memo = data[SEND_MODAL_MEMO_FIELD];

    let tradCryptoFees;

    try {
      if (FEE_CALCULATORS[coinObj.id] && FEE_CALCULATORS[coinObj.id][channel]) {
        const feeData = FEE_CALCULATORS[coinObj.id][channel];

        const feeResult = await feeData.calculator();

        if (!feeResult) throw new Error("Failed to calculate fees");
  
        tradCryptoFees = new TraditionalCryptoSendFee(
          feeResult.average,
          feeData.isPerByte
        );
      }

      const res = await traditionalCryptoSend(
        coinObj,
        channel,
        address,
        BigNumber(truncateDecimal(amount, coinObj.decimals)),
        memo,
        tradCryptoFees,
        true
      );

      setModalHeight(height >= 720 ? 696 : height - 24);

      if (res.feeTakenMessage != null) {
        Alert.alert("Amount changed", res.feeTakenMessage)
      }

      navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, { txConfirmation: res });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    setLoading(false);
  };

  const maxAmount = () => {
    fillAmount(BigNumber(balances.results.confirmed));
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={{
          backgroundColor: Colors.secondaryColor,
          ...Styles.fullWidth,
        }}
        contentContainerStyle={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          backgroundColor: Colors.secondaryColor,
        }}>
        <View style={Styles.wideBlock}>
          <TextInput
            label="Sending from"
            value={sendModal.subWallet.name}
            mode="outlined"
            disabled={true}
          />
          {
            networkName != null ? (
              <Text style={{marginTop: 8, fontSize: 14, color: Colors.verusDarkGray}}>
                {`on ${networkName} network`}
              </Text>
            ) : null
          }
        </View>
        <View style={{...Styles.wideBlock, paddingTop: 0}}>
          <TextInput
            returnKeyType="done"
            label="Recipient address"
            value={sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD]}
            mode="outlined"
            onChangeText={text =>
              updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, text)
            }
            autoCapitalize={'none'}
            autoCorrect={false}
          />
        </View>
        <View style={{...Styles.wideBlock, paddingTop: 0}}>
          <View style={Styles.flexRow}>
            <TextInput
              returnKeyType="done"
              label={`Amount${
                rates[sendModal.coinObj.id] && rates[sendModal.coinObj.id][displayCurrency] != null && price != 0
                  ? ` (~${price} ${
                      amountFiat ? sendModal.coinObj.display_ticker : displayCurrency
                    })`
                  : ''
              }`}
              keyboardType={'decimal-pad'}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={sendModal.data[SEND_MODAL_AMOUNT_FIELD]}
              mode="outlined"
              onChangeText={text =>
                updateSendFormData(SEND_MODAL_AMOUNT_FIELD, text)
              }
              style={{
                flex: 1,
              }}
            />
            {
              rates[sendModal.coinObj.id] &&
                rates[sendModal.coinObj.id][displayCurrency] != null &&
                balances.results != null && (
                  <Button
                    onPress={() => setAmountFiat(!amountFiat)}
                    textColor={Colors.primaryColor}
                    style={{
                      alignSelf: 'center',
                      marginTop: 6,
                    }}
                    compact>
                    {amountFiat ? displayCurrency : sendModal.coinObj.display_ticker}
                  </Button>
                )
            }
            <Button
              onPress={() => maxAmount()}
              textColor={Colors.primaryColor}
              style={{
                alignSelf: 'center',
                marginTop: 6,
              }}
              disabled={balances.results == null}
              compact>
              {'Max'}
            </Button>
          </View>
        </View>
        {sendModal.subWallet.api_channels[API_SEND] === DLIGHT_PRIVATE &&
          sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD] != null &&
          (sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD].includes(':private') ||
            (sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD][0] === 'z' &&
              !sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD].includes('@'))) && (
            <View style={{...Styles.wideBlock, paddingTop: 0}}>
              <TextInput
                returnKeyType="done"
                label="Memo"
                value={sendModal.data[SEND_MODAL_MEMO_FIELD]}
                mode="outlined"
                onChangeText={text =>
                  updateSendFormData(SEND_MODAL_MEMO_FIELD, text)
                }
              />
            </View>
          )}
        <View style={{...Styles.wideBlock, paddingTop: 0}}>
          <Button mode="contained" onPress={() => submitData()}>
            Send
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

export default TraditionalCryptoSendForm;
