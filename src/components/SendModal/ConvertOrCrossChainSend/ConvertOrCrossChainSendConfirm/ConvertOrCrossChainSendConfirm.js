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
import { coinsToSats, satsToCoins, truncateDecimal } from "../../../../utils/math";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import BigNumber from "bignumber.js";
import { TransferDestination } from "verus-typescript-primitives";

function ConvertOrCrossChainSendConfirm({ navigation, route, setLoading, setModalHeight, setPreventExit }) {
  const [params, setParams] = useState(route.params.preflight);
  const [confirmationFields, setConfirmationFields] = useState([]);
  const [closedAccordions, setClosedAccordions] = useState({});
  const dispatch = useDispatch();
  const balances = route.params.balances;


  useEffect(() => {
    setLoading(true);

    // Destructuring params
    const {
      output,
      validation,
      hex,
      names,
      deltas,
      source
    } = params;

    /**
     * @type {Map}
     */
    const deltaMap = deltas;

    /**
     * @type {Map}
     */
    const nameMap = names;

    /**
     * @type {string}
     */
    const txHex = hex;

    const {
      change,
      fees,
      sent
    } = validation;

    // const validation = {
    //   change: {iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq: '399690000'},
    //   fees: {iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq: '0'},
    //   in: {iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq: '2399990000'},
    //   out: {iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq: '2399990000'},
    //   sent: {iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq: '2000300000'},
    //   valid: true,
    // };

    const {
      currency,
      satoshis,
      address,
      convertto,
      exportto,
      feecurrency,
      via,
      feesatoshis,
      refundto,
      preconvert,
      burn,
      burnweight,
      mintnew,
    } = output;

    /**
     * @type {TransferDestination}
     */
    const destination = address;

    const remainingBalances = {};

    deltaMap.forEach((value, key) => {
      if (balances.hasOwnProperty(key)) {
        const satBalance = coinsToSats(BigNumber(balances[key]));

        remainingBalances[key] = (satBalance.plus(value)).toString();
      }
    })

    const destAddrString = destination.getAddressString();
    const toAddress = nameMap.has(destAddrString) ? nameMap.get(destAddrString) : destAddrString;

    const createAccordion = (label, description, left, currencies) => {
      const fields = []

      for (const key in currencies) {
        const value = currencies[key]
        const currencyName = nameMap.has(key) ? nameMap.get(key) : key;
        const readableValue = satsToCoins(BigNumber(value)).toString()

        fields.push({
          data: `${readableValue} ${currencyName}`,
          numLines: 100,
          onPress: () =>
            copyToClipboard(readableValue, {
              title: 'Amount copied',
              message: `${readableValue} copied to clipboard.`,
            }),
        });
      }

      return {
        accordion: true,
        label,
        description,
        left,
        fields
      }
    }

    setConfirmationFields([
      {
        key: 'Source',
        data: source,
        numLines: 100,
        onPress: () =>
          copyToClipboard(source, {
            title: 'Address copied',
            message: `${source} copied to clipboard.`,
          })
      },
      {
        key: 'Destination',
        data: toAddress,
        numLines: 100,
        onPress: () =>
          copyToClipboard(toAddress, {
            title: 'Address copied',
            message: `${toAddress} copied to clipboard.`,
          }),
      },
      createAccordion(
        'Currency sent',
        'The currencies that are being sent as part of this transaction',
        props => <List.Icon {...props} icon="folder" />,
        sent
      ),
      createAccordion(
        'Fees',
        'Fees deducted from your wallet to pay for this transaction',
        props => <List.Icon {...props} icon="folder" />,
        fees
      ),
      createAccordion(
        'Remaining balances',
        'Your currency remaining in the address you\'re sending from after subtracting currency sent and fees (only affected balances shown)',
        props => <List.Icon {...props} icon="folder" />,
        remainingBalances
      ),
    ]);

    setLoading(false);
  }, []);

  const toggleAccordion = (key) => {    
    setClosedAccordions({
      ...closedAccordions,
      [key]: !(closedAccordions[key])
    })
  }

  const goBack = () => {
    setModalHeight()
    navigation.navigate(SEND_MODAL_FORM_STEP_FORM)
  }

  const submitData = async () => {
    await setLoading(true)
    await setPreventExit(true)

    // const {
    //   toAddress,
    //   tradSendFee,
    //   coinObj,
    //   finalTxAmount,
    //   memo,
    //   channel,
    //   fullResult
    // } = params;

    // try {
    //   const res = await traditionalCryptoSend(coinObj, channel, toAddress, BigNumber(
    //     truncateDecimal(
    //       finalTxAmount,
    //       coinObj.decimals
    //     )
    //   ), memo, tradSendFee, false, fullResult)

    //   if (res.txid == null) throw new Error("Transaction failed.")
  
    //   navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, { txResult: res });
    // } catch(e) {
    //   Alert.alert("Error", e.message)
    // }

    // dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
    // dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));
    // dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));

    setPreventExit(false)
    setLoading(false)
  };

  const renderItem = (item, index, divide = true) => {
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
          {divide && <Divider />}
        </TouchableOpacity>
      </React.Fragment>
    );
  }

  return (
    <ScrollView style={{ ...Styles.fullWidth, ...Styles.backgroundColorWhite }}>
      {confirmationFields.map((item, index) => {
        if ((item.accordion || item.data != null) && (item.condition == null || item.condition === true))
          if (item.accordion) {
            const key = index.toString();

            return (
              <React.Fragment>
                <List.Accordion
                  title={item.label}
                  onPress={() => toggleAccordion(key)}
                  expanded={!closedAccordions[key]}>
                  {item.fields.map((x, i) => {
                    return renderItem(x, i, false);
                  })}
                </List.Accordion>
                <Divider />
              </React.Fragment>
            );
          } else {
            return (
              renderItem(item, index)
            );
          }
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
          color={Colors.warningButtonColor}
          style={{ width: 148 }}
          onPress={goBack}
        >
          Back
        </Button>
        <Button
          color={Colors.verusGreenColor}
          style={{ width: 148 }}
          onPress={submitData}
        >
          Send
        </Button>
      </View>
    </ScrollView>
  );
}

export default ConvertOrCrossChainSendConfirm;
