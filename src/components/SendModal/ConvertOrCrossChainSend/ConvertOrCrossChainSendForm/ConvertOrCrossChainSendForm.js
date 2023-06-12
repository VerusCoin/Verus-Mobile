import React, { useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { Alert, View, TouchableWithoutFeedback, Keyboard, FlatList, Animated, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, Divider, Checkbox, List, Text, IconButton } from "react-native-paper";
import { useSelector } from 'react-redux';
import { traditionalCryptoSend, ConvertOrCrossChainSendFee } from "../../../../actions/actionDispatchers";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { getRecommendedBTCFees } from "../../../../utils/api/channels/general/callCreators";
import { API_GET_BALANCES, API_SEND, DLIGHT_PRIVATE, ELECTRUM } from "../../../../utils/constants/intervalConstants";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../../../utils/constants/sendModal';
import { coinsToSats, isNumber, truncateDecimal } from "../../../../utils/math";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { useEffect } from "react";
import { getConversionPaths } from "../../../../utils/api/routers/getConversionPaths";
import AnimatedActivityIndicatorBox from "../../../AnimatedActivityIndicatorBox";
import { getCoinLogo } from "../../../../utils/CoinData/CoinData";
import { getCurrency, getIdentity } from "../../../../utils/api/channels/verusid/callCreators";
import selectAddresses from "../../../../selectors/address";
import MissingInfoRedirect from "../../../MissingInfoRedirect/MissingInfoRedirect";
import { getAddressBalances, preflightConvertOrCrossChain } from "../../../../utils/api/channels/vrpc/callCreators";
import { DEST_ID, DEST_PKH, TransferDestination, fromBase58Check } from "verus-typescript-primitives";

const ConvertOrCrossChainSendForm = ({ setLoading, setModalHeight, updateSendFormData, navigation }) => {
  const sendModal = useSelector(state => state.sendModal);
  const addresses = useSelector(state => selectAddresses(state));
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  
  const FIELD_TITLES = {
    [SEND_MODAL_EXPORTTO_FIELD]: "Destination network",
    [SEND_MODAL_VIA_FIELD]: "Convert via",
    [SEND_MODAL_CONVERTTO_FIELD]: "Convert to"
  }

  const [searchMode, setSearchMode] = useState(false);
  const [selectedField, setSelectedField] = useState("");

  const [processedAmount, setProcessedAmount] = useState(null);

  const [localNetworkDefinition, setLocalNetworkDefinition] = useState(null);
  const [localBalances, setLocalBalances] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionBase, setSuggestionBase] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [conversionPaths, setConversionPaths] = useState(null);

  const [isConversion, setIsConversion] = useState(
    sendModal.data[SEND_MODAL_CONVERTTO_FIELD] &&
      sendModal.data[SEND_MODAL_CONVERTTO_FIELD].length,
  );
  const [isVia, setIsVia] = useState(
    sendModal.data[SEND_MODAL_VIA_FIELD] &&
      sendModal.data[SEND_MODAL_VIA_FIELD].length,
  );
  const [isExport, setIsExport] = useState(
    sendModal.data[SEND_MODAL_EXPORTTO_FIELD] &&
      sendModal.data[SEND_MODAL_EXPORTTO_FIELD].length,
  );

  const [showConversionField, setShowConversionField] = useState(
    sendModal.data[SEND_MODAL_SHOW_CONVERTTO_FIELD] || 
    isConversion
  )

  const [showViaField, setShowViaField] = useState(
    sendModal.data[SEND_MODAL_SHOW_VIA_FIELD] || 
    isVia
  )

  const [showExportField, setShowExportField] = useState(
    sendModal.data[SEND_MODAL_SHOW_EXPORTTO_FIELD] || 
    isExport
  )

  const fadeSearchMode = useRef(new Animated.Value(0)).current;
  const fadeNormalForm = useRef(new Animated.Value(1)).current;

  const enterSearchMode = () => {
    Animated.timing(fadeNormalForm, {
      toValue: 0, // Final value
      duration: 200, // Length of animation
      useNativeDriver: true
    }).start();

    setTimeout(() => {
      setSearchMode(true);
      Animated.timing(fadeSearchMode, {
        toValue: 1, // Final value
        duration: 200, // Length of animation
        useNativeDriver: true
      }).start();
    }, 200)
  };
  
  const leaveSearchMode = () => {
    Animated.timing(fadeSearchMode, {
      toValue: 0, // Final value
      duration: 200, // Length of animation
      useNativeDriver: true
    }).start();

    setTimeout(() => {
      setSearchMode(false);
      setSuggestions([]);
      Animated.timing(fadeNormalForm, {
        toValue: 1, // Final value
        duration: 200, // Length of animation
        useNativeDriver: true
      }).start();
    }, 200)
  };

  const fetchSuggestions = (text = "", base = suggestionBase) => {    
    if (text.length == 0) return base;
    else return base.filter(x => {
      for (const keyword of x.keywords) {
        const keywordLc = keyword.toLowerCase();
        const textLc = text.trim().toLowerCase();

        if (keywordLc.includes(textLc) || textLc.includes(keywordLc)) {
          return true;
        }
      }

      return false;
    })
  }

  const getFieldPlaceholder = (field) => {
    const FIELD_PLACEHOLDERS = {
      [SEND_MODAL_CONVERTTO_FIELD]: `Could not find any currencies to convert to from ${
        sendModal.coinObj.display_ticker
      }, enter a currency manually or leave this field blank.`,
      [SEND_MODAL_VIA_FIELD]: isConversion ? (`Could not find any currencies to convert via when converting from ${
        sendModal.coinObj.display_ticker
      } to ${
        sendModal.data[SEND_MODAL_CONVERTTO_FIELD]
      }. Try entering a currency manually or leave blank to convert directly.`) 
      : 
      (`Could not find any currencies to convert via when converting from ${
        sendModal.coinObj.display_ticker
      }.`),
      [SEND_MODAL_EXPORTTO_FIELD]: `Could not find any networks to send ${
        sendModal.coinObj.display_ticker
      } to, enter a network manually or leave this field blank.`
    }

    if (FIELD_PLACEHOLDERS[field]) return FIELD_PLACEHOLDERS[field]
    else return ""
  }

  const fetchSuggestionsBase = async (field) => {
    if (loadingSuggestions) return;
    let newSuggestionsBase = []
    
    try {
      setLoadingSuggestions(true)

      // {[destinationid: string]: Array<{
      //   via?: CurrencyDefinition;
      //   destination: CurrencyDefinition;
      //   exportto?: CurrencyDefinition;
      //   price: number;
      //   viapriceinroot?: number;
      //   destpriceinvia?: number;
      //   gateway: boolean;
      // }>}
      
      const paths = conversionPaths
        ? conversionPaths
        : await getConversionPaths(
            sendModal.coinObj,
            sendModal.subWallet.api_channels[API_SEND],
            {
              src: sendModal.coinObj.currency_id,
            },
          );

      let flatPaths = []

      for (const destinationid in paths) {
        flatPaths = flatPaths.concat(paths[destinationid])
      }
      
      setConversionPaths(paths)

      switch (field) {
        case SEND_MODAL_CONVERTTO_FIELD:
          newSuggestionsBase = flatPaths.map((path, index) => {
            const priceFixed = Number(path.price.toFixed(2))
    
            return {
              title: path.destination.fullyqualifiedname,
              logoid: path.destination.currencyid,
              key: index.toString(),
              description: path.via
                ? `${
                    path.exportto
                      ? path.gateway
                        ? `off-system to ${path.exportto.fullyqualifiedname} network `
                        : `off-chain to ${path.exportto.fullyqualifiedname} network `
                      : ''
                  }via ${path.via.fullyqualifiedname}`
                : path.exportto
                ? path.gateway && path.exportto
                  ? `off-system to ${path.exportto.fullyqualifiedname} network`
                  : `off-chain to ${path.exportto.fullyqualifiedname} network`
                : 'direct',
              values: {
                [SEND_MODAL_VIA_FIELD]: path.via ? path.via.fullyqualifiedname : '',
                [SEND_MODAL_CONVERTTO_FIELD]: path.destination.fullyqualifiedname,
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                  ? path.exportto.fullyqualifiedname
                  : '',
                [SEND_MODAL_PRICE_ESTIMATE]: path.price
              },
              right: `${
                priceFixed === 0
                  ? '<0.01'
                  : priceFixed === path.price
                  ? priceFixed
                  : `~${priceFixed}`
              }`,
              keywords: [path.destination.currencyid, path.destination.fullyqualifiedname]
            };
          });

          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_VIA_FIELD:
          newSuggestionsBase = flatPaths.filter(x => {
            if (isConversion) {
              const destinationCurrency = sendModal.data[SEND_MODAL_CONVERTTO_FIELD];
              return (
                x.via != null &&
                (x.destination.currencyid === destinationCurrency ||
                  destinationCurrency.toLowerCase() ===
                    x.destination.fullyqualifiedname.toLowerCase())
              );
            } else return x.via != null;
          }).map((path, index) => {
            const priceFixed = Number(path.price.toFixed(2))
    
            return {
              title: path.via.fullyqualifiedname,
              logoid: path.via.currencyid,
              key: index.toString(),
              description: `${
                    path.exportto
                      ? path.gateway
                        ? `off-system to ${path.exportto.fullyqualifiedname} network `
                        : `off-chain to ${path.exportto.fullyqualifiedname} network `
                      : ''
                  }to ${path.destination.fullyqualifiedname}`,
              values: {
                [SEND_MODAL_VIA_FIELD]: path.via.fullyqualifiedname,
                [SEND_MODAL_CONVERTTO_FIELD]: path.destination.fullyqualifiedname,
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                  ? path.exportto.fullyqualifiedname
                  : '',
                [SEND_MODAL_PRICE_ESTIMATE]: path.price
              },
              right: `${
                priceFixed === 0
                  ? '<0.01'
                  : priceFixed === path.price
                  ? priceFixed
                  : `~${priceFixed}`
              }`,
              keywords: [path.via.currencyid, path.via.fullyqualifiedname]
            };
          })

          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_EXPORTTO_FIELD:
          const seenSystems = {}
          newSuggestionsBase = flatPaths.filter(x => {
            if (x.exportto == null) return false;

            const seen = seenSystems[x.exportto.currencyid] != null;

            if (!seen) {
              seenSystems[x.exportto.currencyid] = true;
              return true
            } else return false;
          }).map((path, index) => {    
            return {
              title: path.exportto.fullyqualifiedname,
              logoid: path.exportto.currencyid,
              key: index.toString(),
              description: path.exportto.currencyid,
              values: {
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto.fullyqualifiedname,
              },
              right: "",
              keywords: [path.exportto.currencyid, path.exportto.fullyqualifiedname]
            };
          });

          setSuggestionBase(newSuggestionsBase);
          break;
        default:
          setSuggestionBase(newSuggestionsBase);
          break;
      }
    } catch(e) {
      createAlert("Failed to fetch conversion paths, enter your currency manually", e.message)
    }

    setLoadingSuggestions(false);
    return newSuggestionsBase;
  };

  const handleSearch = async (text) => {
    if (sendModal.data[SEND_MODAL_PRICE_ESTIMATE] != null) {
      updateSendFormData(SEND_MODAL_PRICE_ESTIMATE, null)
    }

    updateSendFormData(selectedField, text);

    setSuggestions(fetchSuggestions(text))
  };

  const handleFieldFocus = async (field) => {
    const selectField = () => {
      setSelectedField(field);
      enterSearchMode();
    }

    selectField();
    
    setSuggestions(fetchSuggestions("", await fetchSuggestionsBase(field)));
  };

  const handleDoneSearching = () => {
    leaveSearchMode();
  };

  const selectSuggestion = (suggestion) => {
    const { values } = suggestion
    
    for (const key in values) {
      updateSendFormData(key, values[key]);
    }
    
    leaveSearchMode();
  };

  const fetchLocalNetworkDefinition = async () => {
    const [channelName, address, systemId] = sendModal.subWallet.api_channels[API_SEND].split('.');

    const response = await getCurrency(sendModal.coinObj, systemId);

    if (response.error) createAlert("Error", "Error fetching current network.");
    else {
      setLocalNetworkDefinition(response.result);
      
      const balanceRes = await getAddressBalances(response.result.currencyid, [address]);

      if (balanceRes.error) createAlert("Error", "Error fetching balances.");

      setLocalBalances(balanceRes.result.currencybalance);
    }
  }

  useEffect(() => {
    setShowConversionField(sendModal.data[SEND_MODAL_SHOW_CONVERTTO_FIELD] || isConversion)
  }, [sendModal.data[SEND_MODAL_SHOW_CONVERTTO_FIELD], isConversion])

  useEffect(() => {
    setShowViaField(sendModal.data[SEND_MODAL_SHOW_VIA_FIELD] || isVia)
  }, [sendModal.data[SEND_MODAL_SHOW_VIA_FIELD], isVia])

  useEffect(() => {
    setShowExportField(sendModal.data[SEND_MODAL_SHOW_EXPORTTO_FIELD] || isExport)
  }, [sendModal.data[SEND_MODAL_SHOW_EXPORTTO_FIELD], isExport])

  useEffect(() => {
    setProcessedAmount(getProcessedAmount())
  }, [sendModal.data[SEND_MODAL_AMOUNT_FIELD]])

  useEffect(() => {
    fetchLocalNetworkDefinition()
  }, [sendModal.subWallet.api_channels[API_SEND]])

  useEffect(() => {
    setIsConversion(sendModal.data[SEND_MODAL_CONVERTTO_FIELD] &&
      sendModal.data[SEND_MODAL_CONVERTTO_FIELD].length)
  }, [sendModal.data[SEND_MODAL_CONVERTTO_FIELD]])

  useEffect(() => {
    setIsVia(sendModal.data[SEND_MODAL_VIA_FIELD] &&
      sendModal.data[SEND_MODAL_VIA_FIELD].length)
  }, [sendModal.data[SEND_MODAL_VIA_FIELD]])

  useEffect(() => {
    setIsExport(sendModal.data[SEND_MODAL_EXPORTTO_FIELD] &&
      sendModal.data[SEND_MODAL_EXPORTTO_FIELD].length)
  }, [sendModal.data[SEND_MODAL_EXPORTTO_FIELD]])

  const fillAmount = (amount) => {
    let displayAmount = BigNumber(amount);
    if (displayAmount.isLessThan(BigNumber(0))) {
      displayAmount = BigNumber(0);
    }

    updateSendFormData(
      SEND_MODAL_AMOUNT_FIELD,
      displayAmount.toString()
    );
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
      return amount;
    }
  }

  const formHasError = () => {
    const { subWallet, coinObj, data } = sendModal;
    const channel = subWallet.api_channels[API_SEND];

    if (!localBalances) {
      createAlert("Balances Not Loaded", "Have not loaded local balances yet, cannot send transaction.");
      return true;
    }

    const spendableBalance = localBalances.hasOwnProperty(coinObj.currency_id) ? localBalances[coinObj.currency_id] : null;

    const toAddress =
      data[SEND_MODAL_TO_ADDRESS_FIELD] != null ? data[SEND_MODAL_TO_ADDRESS_FIELD].trim() : "";

    const amount = getProcessedAmount()

    if (!toAddress || toAddress.length < 1) {
      createAlert("Required Field", "Address is a required field.");
      return true;
    }

    if (amount == null) {
      createAlert("Invalid Amount", "Please enter a valid number amount.");
      return true;
    } else {
      if (spendableBalance == null || Number(amount) > Number(spendableBalance)) {
        const message =
          'Insufficient funds, ' +
          (spendableBalance == null
            ? `no ${coinObj.display_ticker} in wallet.`
            : spendableBalance < 0
            ? 'available amount is less than fee'
            : spendableBalance +
              ' confirmed ' +
              coinObj.display_ticker +
              ' available.' +
              (channel === DLIGHT_PRIVATE
                ? '\n\nFunds from private transactions require 10 confirmations (~10 minutes) before they can be spent.'
                : ''));

        createAlert("Insufficient Funds", message);
        return true;
      }
    }

    return false;
  };

  const submitData = async () => {
    if (formHasError()) return;

    setLoading(true);

    const { coinObj, data } = sendModal;

    try {
      const selectData = (data) => data == null || data.length == 0 ? undefined : data;
      const channel = sendModal.subWallet.api_channels[API_SEND];

      const selectAddress = async (addr) => {
        let keyhash;

        if (addr.endsWith("@")) {
          const identityRes = await getIdentity(coinObj, addr);

          if (identityRes.error) throw new Error("Failed to fetch " + addr);

          keyhash = identityRes.result.identity.identityaddress;
        } else keyhash = addr;

        const { hash, version } = fromBase58Check(keyhash);

        return new TransferDestination({
          destination_bytes: hash,
          type: version === 60 ? DEST_PKH : DEST_ID
        })
      }

      let output = {
        currency: coinObj.currency_id,
        convertto: selectData(data[SEND_MODAL_CONVERTTO_FIELD]),
        exportto: selectData(data[SEND_MODAL_EXPORTTO_FIELD]),
        via: selectData(data[SEND_MODAL_VIA_FIELD]),
        address: await selectAddress(data[SEND_MODAL_TO_ADDRESS_FIELD]),
        satoshis: coinsToSats(BigNumber(data[SEND_MODAL_AMOUNT_FIELD])).toString(),
        preconvert: selectData(data[SEND_MODAL_IS_PRECONVERT]),
      }

      for (const key in output) {
        if (output[key] == null) delete output[key]
      }

      const res = await preflightConvertOrCrossChain(coinObj, channel, activeAccount, output)

      setModalHeight(696);

      if (res.err) {
        throw new Error(res.result);
      }

      navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, { preflight: res.result, balances: localBalances });
    } catch (e) {
      Alert.alert("Error", e.message);
    }

    setLoading(false);
  };

  const maxAmount = () => {
    const { coinObj } = sendModal;

    const spendableBalance = localBalances.hasOwnProperty(coinObj.currency_id) ? localBalances[coinObj.currency_id] : 0;

    fillAmount(BigNumber(spendableBalance));
  };

  const setAddressSelf = () => {
    const addr = addresses.results[0]

    updateSendFormData(
      SEND_MODAL_TO_ADDRESS_FIELD,
      addr
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{flex: 1, backgroundColor: Colors.secondaryColor}}>
        {searchMode ? (
          <Animated.View
            style={{
              backgroundColor: Colors.secondaryColor,
              ...Styles.fullWidth,
              justifyContent: 'flex-start',
              alignItems: 'center',
              backgroundColor: Colors.secondaryColor,
              flex: 1,
              opacity: fadeSearchMode
            }}>
              <View style={{ width: '92%', paddingTop: 8 }}>
                <View style={Styles.flexRow}>
                  <TextInput
                    label={FIELD_TITLES[selectedField]}
                    value={sendModal.data[selectedField]}
                    onChangeText={handleSearch}
                    mode="outlined"
                    style={{
                      flex: 1
                    }}
                  />
                  <Button
                    onPress={() => handleSearch("")}
                    color={Colors.primaryColor}
                    style={{
                      alignSelf: 'center',
                      marginTop: 6,
                    }}
                    compact>
                    {'Clear'}
                  </Button>
                </View>
              </View>
              {
                loadingSuggestions ? (
                  <AnimatedActivityIndicatorBox />
                ) : suggestions.length == 0 ? (
                  <MissingInfoRedirect
                    icon={'alert-circle-outline'}
                    label={getFieldPlaceholder(selectedField)}
                  />
                ) : (
                  <FlatList
                    data={suggestions}
                    style={{
                      width: '100%',
                    }}
                    ListHeaderComponent={
                      <List.Item
                        title={
                          <Text style={{...Styles.listItemTableCell, fontWeight: 'bold'}}>
                            {'Name'}
                          </Text>
                        }
                        right={() =>
                          selectedField !== SEND_MODAL_EXPORTTO_FIELD ? (
                            <Text style={{...Styles.listItemTableCell, fontWeight: 'bold'}}>
                              {sendModal.coinObj.display_ticker + ' price estimate'}
                            </Text>
                          ) : null
                        }
                      />
                    }
                    renderItem={({item, index}) => (
                      <List.Item
                        title={item.title}
                        key={index.toString()}
                        description={item.description}
                        onPress={() => selectSuggestion(item)}
                        right={() => (
                          <Text style={Styles.listItemTableCell}>{item.right}</Text>
                        )}
                        left={props => {
                          const Logo = getCoinLogo(item.logoid);

                          return (
                            <View style={{justifyContent: 'center', paddingLeft: 8}}>
                              <Logo
                                width={36}
                                height={36}
                                style={{
                                  alignSelf: 'center',
                                }}
                              />
                            </View>
                          );
                        }}
                      />
                    )}
                  />
                )
              }
          </Animated.View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeNormalForm }}>
            <KeyboardAwareScrollView
              style={{
                backgroundColor: Colors.secondaryColor,
                ...Styles.fullWidth,
                flex: 1
              }}
              contentContainerStyle={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                backgroundColor: Colors.secondaryColor,
              }}
              resetScrollToCoords={{x: 0, y: 0}}
              scrollEnabled={true}
              enableOnAndroid={true}
              extraScrollHeight={150}
              keyboardShouldPersistTaps="handled">
              <View style={{...Styles.wideBlockDense, paddingBottom: 2}}>
                <TextInput
                  label="Sending from"
                  value={sendModal.subWallet.name}
                  mode="outlined"
                  disabled={true}
                />
              </View>
              <View style={{...Styles.wideBlockDense, paddingTop: 0, paddingBottom: 2}}>
                <View style={Styles.flexRow}>
                  <TextInput
                    returnKeyType="done"
                    label="Recipient address"
                    value={sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD]}
                    mode="outlined"
                    multiline={true}
                    onChangeText={text =>
                      updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, text)
                    }
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    style={{
                      flex: 1,
                    }}
                  />
                  <Button
                    onPress={() => setAddressSelf()}
                    color={Colors.primaryColor}
                    style={{
                      alignSelf: 'center',
                      marginTop: 6,
                      width: 64
                    }}
                    compact>
                    {'Self'}
                  </Button>
                </View>
              </View>
              <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
                <View style={Styles.flexRow}>
                  <TextInput
                    returnKeyType="done"
                    label={'Amount'}
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
                  <Button
                    onPress={() => maxAmount()}
                    color={Colors.primaryColor}
                    style={{
                      alignSelf: 'center',
                      marginTop: 6,
                      width: 64
                    }}
                    disabled={localBalances == null}
                    compact>
                    {'Max'}
                  </Button>
                </View>
                {
                  isConversion && sendModal.data[SEND_MODAL_PRICE_ESTIMATE] != null && processedAmount != null ? (
                    <Text style={{marginTop: 8, fontSize: 14, color: Colors.verusDarkGray}}>
                      {`≈ ${Number((processedAmount*sendModal.data[SEND_MODAL_PRICE_ESTIMATE]).toFixed(8))} ${sendModal.data[SEND_MODAL_CONVERTTO_FIELD]}`}
                    </Text>
                  ) : null
                }
              </View>
              {
                showConversionField || showViaField ? (
                  <React.Fragment>
                    <View style={{...Styles.wideBlockDense}}>
                      <Divider />
                    </View>
                    {
                      showConversionField && (
                        <View style={{...Styles.wideBlockDense}}>
                          <TouchableOpacity
                            onPress={() => handleFieldFocus(SEND_MODAL_CONVERTTO_FIELD)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderWidth: 1,
                              borderColor: Colors.verusDarkGray,
                              borderRadius: 4,
                            }}>
                            <Text
                              style={{
                                fontSize: 16,
                                color: isConversion ? Colors.quaternaryColor : Colors.verusDarkGray,
                              }}>
                              {isConversion
                                ? `Convert to: ${sendModal.data[SEND_MODAL_CONVERTTO_FIELD]}`
                                : 'Select currency to convert to'}
                            </Text>
                            <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
                          </TouchableOpacity>
                        </View>
                      )
                    }
                    {
                      showViaField && (
                        <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
                          <TouchableOpacity
                            onPress={() => handleFieldFocus(SEND_MODAL_VIA_FIELD)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderWidth: 1,
                              borderColor: Colors.verusDarkGray,
                              borderRadius: 4,
                            }}>
                            <Text
                              style={{
                                fontSize: 16,
                                color:
                                  isVia || isConversion
                                    ? Colors.quaternaryColor
                                    : Colors.verusDarkGray,
                              }}>
                              {isVia
                                ? `Convert via: ${sendModal.data[SEND_MODAL_VIA_FIELD]}`
                                : isConversion
                                ? 'Direct conversion'
                                : 'Select currency to convert via'}
                            </Text>
                            <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
                          </TouchableOpacity>
                        </View>
                      )
                    }
                  </React.Fragment>
                ) : null
              }
              {
                showExportField && (
                  <React.Fragment>
                    <View style={{...Styles.wideBlockDense}}>
                      <Divider />
                    </View>
                    <View style={{...Styles.wideBlockDense}}>
                      <TouchableOpacity
                        onPress={() => handleFieldFocus(SEND_MODAL_EXPORTTO_FIELD)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: Colors.verusDarkGray,
                          borderRadius: 4,
                        }}>
                        <Text
                          style={{
                            fontSize: 16,
                            color:
                              isExport || isConversion
                                ? Colors.quaternaryColor
                                : Colors.verusDarkGray,
                          }}>
                          {isExport
                            ? `To network: ${sendModal.data[SEND_MODAL_EXPORTTO_FIELD]}`
                            : isConversion
                            ? `On ${
                                localNetworkDefinition
                                  ? localNetworkDefinition.fullyqualifiedname
                                  : 'current'
                              } network`
                            : 'Select network to send to'}
                        </Text>
                        <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
                      </TouchableOpacity>
                    </View>
                  </React.Fragment>
                )
              }
              {
                sendModal.data[SEND_MODAL_IS_PRECONVERT] && (
                  <React.Fragment>
                    <View style={{...Styles.wideBlockDense}}>
                      <Divider />
                    </View>
                    <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
                      <Checkbox.Item
                        color={Colors.primaryColor}
                        disabled={true}
                        label={'Send as preconvert'}
                        status={
                          sendModal.data[SEND_MODAL_IS_PRECONVERT] ? 'checked' : 'unchecked'
                        }
                        // onPress={() =>
                        //   updateSendFormData(
                        //     SEND_MODAL_IS_PRECONVERT,
                        //     !sendModal.data[SEND_MODAL_IS_PRECONVERT],
                        //   )
                        // }
                        mode="android"
                      />
                    </View>
                  </React.Fragment>
                )
              }
            </KeyboardAwareScrollView>
          </Animated.View>
        )}
        <Button
          onPress={searchMode ? handleDoneSearching : submitData}
          mode="contained"
          loading={loadingSuggestions}
          disabled={loadingSuggestions || (!searchMode && localBalances == null)}
          style={{width: 100, alignSelf: 'center'}}>
          {searchMode ? 'Done' : 'Send'}
        </Button>
      </View>
    </TouchableWithoutFeedback>
  );

};

export default ConvertOrCrossChainSendForm;
