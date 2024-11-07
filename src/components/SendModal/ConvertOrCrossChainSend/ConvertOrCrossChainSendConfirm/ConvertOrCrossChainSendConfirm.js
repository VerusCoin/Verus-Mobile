import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, View, TouchableOpacity, Alert} from 'react-native';
import {Button, List, Divider, Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {expireCoinData} from '../../../../actions/actionCreators';
import {copyToClipboard} from '../../../../utils/clipboard/clipboard';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_TRANSACTIONS,
  API_SEND,
  ERC20,
  ETH,
} from '../../../../utils/constants/intervalConstants';
import {
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_PRICE_ESTIMATE,
} from '../../../../utils/constants/sendModal';
import {
  coinsToSats,
  satsToCoins,
  truncateDecimal
} from '../../../../utils/math';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import BigNumber from 'bignumber.js';
import {TransferDestination} from 'verus-typescript-primitives';
import {sendCurrencyTransfer} from '../../../../utils/api/channels/vrpc/callCreators';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import { sendConvertOrCrossChain } from '../../../../utils/api/routers/sendConvertOrCrossChain';

function ConvertOrCrossChainSendConfirm({
  navigation,
  route,
  setLoading,
  setModalHeight,
  setPreventExit,
}) {
  const sendModal = useSelector(state => state.sendModal);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const networkName = useSelector(state => {
    try {
      const subwallet = state.sendModal.subWallet;

      return subwallet.network
        ? CoinDirectory.getBasicCoinObj(subwallet.network).display_ticker
        : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  });

  const [params, setParams] = useState(route.params.preflight);
  const [confirmationFields, setConfirmationFields] = useState([]);
  const [closedAccordions, setClosedAccordions] = useState({});
  const dispatch = useDispatch();
  const balances = route.params.balances;
  const scrollRef = useRef();

  useEffect(() => {
    setLoading(true);

    // Destructuring params
    const {
      output,
      validation,
      hex,
      names,
      deltas,
      source,
      inputs,
      converterdef,
      submittedsats,
      estimate,
    } = params;

    /**
     * @type {Map}
     */
    const deltaMap = deltas;

    /**
     * @type {Map}
     */
    const nameMap = names;

    const {change, fees, sent} = validation;

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

    const primaryCurrencyAmountSats = sent[currency] ? sent[currency] : 0;
    const primaryCurrencyAmount = satsToCoins(BigNumber(primaryCurrencyAmountSats)).toNumber();

    const remainingBalances = {};

    deltaMap.forEach((value, key) => {
      if (balances.hasOwnProperty(key) && !value.isEqualTo(BigNumber(0))) {
        const satBalance = coinsToSats(BigNumber(balances[key]));

        remainingBalances[key] = satBalance.plus(value).toString();
      }
    });

    let conversionFeeMultiplier = BigNumber(0);

    if (convertto != null && via != null) {
      conversionFeeMultiplier = BigNumber(0.0005);
    } else if (convertto != null) {
      conversionFeeMultiplier = BigNumber(0.00025);
    }

    const conversionFee = BigNumber(truncateDecimal(satsToCoins(BigNumber(satoshis)).multipliedBy(
      conversionFeeMultiplier,
    ), 8))

    const destAddrString = destination.getAddressString();
    const toAddress = nameMap.has(destAddrString)
      ? `${nameMap.get(destAddrString)}@ (${destAddrString})`
      : destAddrString;

    const createAccordion = (
      label,
      description,
      left,
      currencies,
      showZeroValues = false,
    ) => {
      const fields = [];

      for (const key in currencies) {
        const value = currencies[key];
        const currencyName = nameMap.has(key) ? nameMap.get(key) : key;
        const valueBn = satsToCoins(BigNumber(value));

        if (showZeroValues || !valueBn.isEqualTo(BigNumber(0))) {
          const readableValue = valueBn.toString();

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
      }

      return {
        accordion: true,
        label,
        description,
        left,
        fields,
      };
    };

    const tryRenderFriendlyName = address => {
      return nameMap.has(address) ? nameMap.get(address) : address;
    };

    setConfirmationFields([
      {
        key: 'Source',
        data: source,
        numLines: 100,
        onPress: () =>
          copyToClipboard(source, {
            title: 'Address copied',
            message: `${source} copied to clipboard.`,
          }),
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
      {
        key: 'Converting To',
        data:
          via != null && via.length > 0
            ? `${tryRenderFriendlyName(convertto)} via ${tryRenderFriendlyName(
                via,
              )}`
            : tryRenderFriendlyName(convertto),
        numLines: 100,
        onPress: () =>
          copyToClipboard(tryRenderFriendlyName(convertto), {
            title: 'Currency copied',
            message: `${tryRenderFriendlyName(convertto)} copied to clipboard.`,
          }),
        condition: convertto != null && convertto.length > 0,
      },
      {
        key: 'Estimated To Receive',
        data:
          estimate != null
            ? `${estimate.estimatedcurrencyout} ${tryRenderFriendlyName(
                convertto,
              )}`
            : !!(sendModal.data[SEND_MODAL_PRICE_ESTIMATE]) ? `${Number(
                (
                  primaryCurrencyAmount * sendModal.data[SEND_MODAL_PRICE_ESTIMATE].price
                ).toFixed(8),
              )} ${tryRenderFriendlyName(convertto)}` : "",
        numLines: 100,
        onPress: () =>
          copyToClipboard(tryRenderFriendlyName(convertto), {
            title: 'Amount copied',
            message: `${estimate.estimatedcurrencyout} copied to clipboard.`,
          }),
        condition:
          (estimate != null || !!(sendModal.data[SEND_MODAL_PRICE_ESTIMATE])) && convertto != null && convertto.length > 0,
      },
      {
        key: 'Estimated Time Until Arrival',
        data:
          ((sendModal.coinObj.proto === ETH ||
            sendModal.coinObj.proto === ERC20) && convertto != null && exportto == null) ?
            '40-90 minutes' :
            exportto != null
              ? '20-90 minutes'
              : convertto != null
                ? '2-10 minutes'
                : '1-5 minutes',
        numLines: 100,
        condition: preconvert != true
      },
      {
        key: 'Preconvert',
        data:
          tryRenderFriendlyName(convertto) +
          " hasn't launched yet. You will receive your converted funds or have your transaction refunded once the currency launches or fails to launch.",
        numLines: 100,
        condition: preconvert != null && preconvert,
      },
      {
        key: 'From Network',
        data: networkName,
        numLines: 100,
        onPress: () =>
          copyToClipboard(networkName, {
            title: 'Currency copied',
            message: `${networkName} copied to clipboard.`,
          }),
        condition:
          networkName != null && exportto != null && exportto.length > 0,
      },
      {
        key: 'To Network',
        data: tryRenderFriendlyName(exportto),
        numLines: 100,
        onPress: () =>
          copyToClipboard(tryRenderFriendlyName(exportto), {
            title: 'Currency copied',
            message: `${tryRenderFriendlyName(exportto)} copied to clipboard.`,
          }),
        condition: exportto != null && exportto.length > 0,
      },
      createAccordion(
        'Currency to send',
        'The currencies that are being sent as part of this transaction',
        props => <List.Icon {...props} icon="folder" />,
        sent,
      ),
      createAccordion(
        (sendModal.coinObj.proto === ETH || sendModal.coinObj.proto === ERC20) ? 'Maximum Transaction Fees' : 'Transaction Fees',
        'Fees deducted from your wallet to pay for this transaction',
        props => <List.Icon {...props} icon="folder" />,
        fees,
      ),
      {
        key: 'Conversion Fee (taken from send amount)',
        data: `${conversionFee.toString()} ${tryRenderFriendlyName(currency)}`,
        numLines: 100,
        onPress: () =>
          copyToClipboard(conversionFee.toString(), {
            title: 'Fee copied',
            message: `${conversionFee.toString()} copied to clipboard.`,
          }),
        condition: !conversionFee.isEqualTo(BigNumber(0)),
      },
      createAccordion(
        'Remaining Balances',
        "Your currency remaining in the address you're sending from after subtracting currency sent and fees (only affected balances shown)",
        props => <List.Icon {...props} icon="folder" />,
        remainingBalances,
        true,
      ),
    ]);

    setLoading(false);
    setTimeout(() => {
      scrollRef.current.flashScrollIndicators();
    }, 500);
  }, []);

  const toggleAccordion = key => {
    setClosedAccordions({
      ...closedAccordions,
      [key]: !closedAccordions[key],
    });
  };

  const goBack = () => {
    setModalHeight();
    navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  };

  const submitData = async () => {
    await setLoading(true);
    await setPreventExit(true);

    const {output, validation, hex, names, deltas, source, inputs} = params;

    try {
      const destAddrString = output.address.getAddressString();
      const toAddress = names.hasOwnProperty(destAddrString)
        ? names[destAddrString]
        : destAddrString;

      const res = await sendConvertOrCrossChain(
        sendModal.coinObj,
        activeAccount,
        sendModal.subWallet.api_channels[API_SEND],
        params
      );

      if (res.err) throw new Error(res.result);
      else
        navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
          ...res.result,
          output,
          destination: toAddress,
        });
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    dispatch(expireCoinData(sendModal.coinObj.id, API_GET_FIATPRICE));
    dispatch(expireCoinData(sendModal.coinObj.id, API_GET_TRANSACTIONS));
    dispatch(expireCoinData(sendModal.coinObj.id, API_GET_BALANCES));

    setPreventExit(false);
    setLoading(false);
  };

  const renderItem = (item, index, divide = true) => {
    return (
      <React.Fragment key={index}>
        <TouchableOpacity
          disabled={item.onPress == null}
          onPress={() => item.onPress()}>
          <List.Item
            title={item.data}
            description={item.key}
            titleNumberOfLines={item.numLines || 1}
            right={props =>
              item.right ? (
                <Text
                  {...props}
                  style={{
                    fontSize: 16,
                    alignSelf: 'center',
                    color: Colors.verusDarkGray,
                    fontWeight: '300',
                    marginRight: 8,
                  }}>
                  {item.right}
                </Text>
              ) : null
            }
          />
          {divide && <Divider />}
        </TouchableOpacity>
      </React.Fragment>
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: Colors.secondaryColor}}>
      <ScrollView
        style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
        persistentScrollbar={true}
        showsVerticalScrollIndicator={true}
        ref={scrollRef}>
        {confirmationFields.map((item, index) => {
          if (
            (item.accordion || item.data != null) &&
            (item.condition == null || item.condition === true)
          )
            if (item.accordion) {
              const key = index.toString();

              return (
                <React.Fragment>
                  <List.Accordion
                    title={item.label}
                    style={{
                      backgroundColor: Colors.secondaryColor
                    }}
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
              return renderItem(item, index);
            }
          else return null;
        })}
      </ScrollView>
      <View
        style={{
          ...Styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <Button
          textColor={Colors.warningButtonColor}
          style={{width: 148}}
          onPress={goBack}>
          Back
        </Button>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          labelStyle={{color: Colors.secondaryColor}}
          style={{width: 148}}
          onPress={submitData}
          mode="contained">
          Send
        </Button>
      </View>
    </View>
  );
}

export default ConvertOrCrossChainSendConfirm;
