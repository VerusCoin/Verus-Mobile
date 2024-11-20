import React, { useEffect, useState } from "react";
import { ScrollView, View, TouchableOpacity, Alert } from "react-native";
import { Button, List, Divider, Text } from "react-native-paper";
import { useDispatch, useSelector } from 'react-redux'
import { expireCoinData } from "../../../../actions/actionCreators";
import { traditionalCryptoSend } from "../../../../actions/actionDispatchers";
import { copyToClipboard } from "../../../../utils/clipboard/clipboard";
import { USD } from "../../../../utils/constants/currencies";
import { API_GET_BALANCES, API_GET_FIATPRICE, API_GET_TRANSACTIONS } from "../../../../utils/constants/intervalConstants";
import { SEND_MODAL_FORM_STEP_FORM, SEND_MODAL_FORM_STEP_RESULT } from "../../../../utils/constants/sendModal";
import { truncateDecimal } from "../../../../utils/math";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import BigNumber from "bignumber.js";

function TraditionalCryptoSendConfirm({ navigation, route, setLoading, setModalHeight, setPreventExit }) {
  const [params, setParams] = useState(route.params.txConfirmation);
  const [confirmationFields, setConfirmationFields] = useState([]);
  const dispatch = useDispatch();

  const balance_channel = useSelector(state => state.sendModal.subWallet.api_channels[API_GET_BALANCES]);
  const rates_channel = useSelector(state => state.sendModal.subWallet.api_channels[API_GET_FIATPRICE]);
  const chainTicker = params.coinObj.id

  const balances = {
    results: useSelector(state => state.ledger.balances[balance_channel]
      ? state.ledger.balances[balance_channel][chainTicker]
      : null),
    errors: useSelector(state => state.errors[API_GET_BALANCES][balance_channel][chainTicker]),
  };

  const rates = useSelector(state => state.ledger.rates[rates_channel]);

  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);

  useEffect(() => {
    setLoading(true);

    // Destructuring params
    const {
      toAddress,
      fromAddress,
      identity,
      amountSubmitted,
      coinObj,
      fees,
      finalTxAmount,
      balanceDelta,
      memo,
      names
    } = params;

    const renderCurrencyName = (id) => {
      return names != null && names.has(id) ? names.get(id) : id;
    }

    const balance = balances.results.total;
    const fee = fees[0];
    const remainingBalance = BigNumber(balanceDelta).plus(BigNumber(balance));
    const deductedAmount = BigNumber(balanceDelta).absoluteValue()

    const validFiatMultiplier =
      rates[coinObj.id] != null &&
      rates[coinObj.id][displayCurrency] != null;
    const fiatMultiplier = validFiatMultiplier
      ? BigNumber(rates[coinObj.id][displayCurrency])
      : null;

    const validFeeFiatMultiplier =
      fee.currency == coinObj.id
        ? validFiatMultiplier
        : rates[fee.currency] != null &&
          rates[fee.currency][displayCurrency] != null;
    const feeFiatMultiplier =
      fee.currency == coinObj.id
        ? fiatMultiplier
        : validFeeFiatMultiplier
        ? BigNumber(rates[fee.currency][displayCurrency])
        : null;

    setConfirmationFields([
      {
        key: 'Destination',
        data: identity == null ? toAddress : `${identity} (${toAddress})`,
        numLines: 100,
        onPress: () =>
          copyToClipboard(toAddress, {
            title: 'Address copied',
            message: `${toAddress} copied to clipboard.`,
          }),
      },
      {
        key: 'Source',
        data: fromAddress,
        numLines: 100,
        onPress: () =>
          copyToClipboard(fromAddress, {
            title: 'Address copied',
            message: `${fromAddress} copied to clipboard.`,
          }),
        condition: fromAddress != null,
      },
      {
        key: 'Amount Requested',
        data:
          truncateDecimal(amountSubmitted, coinObj.decimals || 8) +
          ' ' +
          coinObj.display_ticker,
        right: validFiatMultiplier
          ? `${fiatMultiplier.multipliedBy(amountSubmitted).toFixed(2)} ${
              displayCurrency
            }`
          : null,
        condition: amountSubmitted !== '0' && amountSubmitted !== finalTxAmount,
      },
      {
        key: 'Amount Sent',
        data:
          truncateDecimal(finalTxAmount, coinObj.decimals || 8) +
          ' ' +
          coinObj.display_ticker,
        right: validFiatMultiplier
          ? `${fiatMultiplier.multipliedBy(finalTxAmount).toFixed(2)} ${
              displayCurrency
            }`
          : null,
      },
      {
        key: 'Fee',
        data: fee.amount + ' ' + renderCurrencyName(fee.currency),
        right: validFeeFiatMultiplier
          ? `${feeFiatMultiplier.multipliedBy(fee.amount).toFixed(2)} ${
              displayCurrency
            }`
          : null,
      },
      {
        key: 'Amount Deducted',
        data:
          truncateDecimal(deductedAmount, coinObj.decimals || 8) +
          ' ' +
          coinObj.display_ticker,
        right: validFiatMultiplier
          ? `${fiatMultiplier.multipliedBy(deductedAmount).toFixed(2)} ${
              displayCurrency
            }`
          : null,
      },
      {
        key: 'Remaining Balance',
        data: remainingBalance + ' ' + coinObj.display_ticker,
        condition: remainingBalance !== 0,
        right: validFiatMultiplier
          ? `${fiatMultiplier.multipliedBy(remainingBalance).toFixed(2)} ${
              displayCurrency
            }`
          : null,
      },
      {
        key: 'Message',
        numLines: 100,
        data: memo,
        condition: memo != null && memo.length > 0,
      },
    ]);


    setLoading(false);
  }, []);

  const goBack = () => {
    setModalHeight()
    navigation.navigate(SEND_MODAL_FORM_STEP_FORM)
  }

  const submitData = async () => {
    await setLoading(true)
    await setPreventExit(true)

    const {
      toAddress,
      tradSendFee,
      coinObj,
      finalTxAmount,
      memo,
      channel,
      fullResult
    } = params;

    try {
      const res = await traditionalCryptoSend(coinObj, channel, toAddress, BigNumber(
        truncateDecimal(
          finalTxAmount,
          coinObj.decimals
        )
      ), memo, tradSendFee, false, fullResult)

      if (res.txid == null) throw new Error("Transaction failed.")
  
      navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, { txResult: res });
    } catch(e) {
      Alert.alert("Error", e.message)
    }

    dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
    dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));
    dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));

    setPreventExit(false)
    setLoading(false)
  };

  return (
    <ScrollView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      {confirmationFields.map((item, index) => {
        if (item.data != null && (item.condition == null || item.condition === true))
          return (
            <React.Fragment key={index}>
              <TouchableOpacity disabled={item.onPress == null} onPress={() => item.onPress()}>
                <List.Item
                  title={item.data}
                  description={item.key}
                  titleNumberOfLines={item.numLines || 1}
                  right={(props) =>
                    item.right ? (
                      <Text
                        {...props}
                        style={{
                          fontSize: 16,
                          alignSelf: "center",
                          color: Colors.verusDarkGray,
                          fontWeight: "300",
                          marginRight: 8,
                        }}
                      >
                        {item.right}
                      </Text>
                    ) : null
                  }
                />
                <Divider />
              </TouchableOpacity>
            </React.Fragment>
          );
        else return null;
      })}
      <View
        style={{
          ...Styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <Button
          textColor={Colors.warningButtonColor}
          style={{ width: 148 }}
          onPress={goBack}
        >
          Back
        </Button>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{ width: 148 }}
          labelStyle={{ color: Colors.secondaryColor }}
          onPress={submitData}
          mode="contained"
        >
          Send
        </Button>
      </View>
    </ScrollView>
  );
}

export default TraditionalCryptoSendConfirm;
