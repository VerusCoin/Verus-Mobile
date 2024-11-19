import React, { useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { Alert, View, TouchableWithoutFeedback, Keyboard, FlatList, Animated, TouchableOpacity, Dimensions } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, Divider, Checkbox, List, Text, IconButton } from "react-native-paper";
import { useSelector } from 'react-redux';
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { API_SEND, DLIGHT_PRIVATE, ERC20, ETH } from "../../../../utils/constants/intervalConstants";
import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONTINUE_IMMEDIATELY,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DESTINATION_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_STRICT_AMOUNT,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../../../utils/constants/sendModal';
import { coinsToSats, isNumber, satsToCoins } from "../../../../utils/math";
import Colors from "../../../../globals/colors";
import Styles from "../../../../styles";
import { useEffect } from "react";
import { getConversionPaths } from "../../../../utils/api/routers/getConversionPaths";
import AnimatedActivityIndicatorBox from "../../../AnimatedActivityIndicatorBox";
import { getCoinLogo, getSystemNameFromSystemId } from "../../../../utils/CoinData/CoinData";
import { getCurrency } from "../../../../utils/api/channels/verusid/callCreators";
import selectAddresses from "../../../../selectors/address";
import MissingInfoRedirect from "../../../MissingInfoRedirect/MissingInfoRedirect";
import { getInfo, preflightCurrencyTransfer } from "../../../../utils/api/channels/vrpc/callCreators";
import { DEST_ETH, DEST_ID, DEST_PKH, TransferDestination, fromBase58Check, toIAddress } from "verus-typescript-primitives";
import { CoinDirectory } from "../../../../utils/CoinData/CoinDirectory";
import { ethers } from "ethers";
import CoreSendFormModule from "../../../FormModules/CoreSendFormModule";
import ConvertFormModule from "../../../FormModules/ConvertFormModule";
import ExportFormModule from "../../../FormModules/ExportFormModule";
import { getAddressBalances } from "../../../../utils/api/routers/getAddressBalance";
import { coinsList } from "../../../../utils/CoinData/CoinsList";
import { ETH_CONTRACT_ADDRESS, VETH } from "../../../../utils/constants/web3Constants";
import { preflightConvertOrCrossChain } from "../../../../utils/api/routers/preflightConvertOrCrossChain";
import { getIdentity } from "../../../../utils/api/routers/getIdentity";
import { addressIsBlocked } from "../../../../utils/addressBlocklist";
import { selectAddressBlocklist } from "../../../../selectors/settings";
import { I_ADDRESS_VERSION, R_ADDRESS_VERSION } from "../../../../utils/constants/constants";
import { getWeb3ProviderForNetwork } from "../../../../utils/web3/provider";

const ConvertOrCrossChainSendForm = ({ setLoading, setModalHeight, updateSendFormData, navigation }) => {
  const { height } = Dimensions.get('window');
  const sendModal = useSelector(state => state.sendModal);
  const activeUser = useSelector(state => state.authentication.activeAccount);
  const addresses = useSelector(state => selectAddresses(state));
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const addressBlocklist = useSelector(selectAddressBlocklist);
  const networkName = useSelector(state => {
    try {
      const subwallet = state.sendModal.subWallet;

      return subwallet.network ? CoinDirectory.getBasicCoinObj(subwallet.network).display_ticker : null;
    } catch(e) {
      console.error(e);
      return null;
    }
  });
  
  const FIELD_TITLES = {
    [SEND_MODAL_EXPORTTO_FIELD]: "Destination network",
    [SEND_MODAL_VIA_FIELD]: "Convert via",
    [SEND_MODAL_CONVERTTO_FIELD]: sendModal.data[SEND_MODAL_IS_PRECONVERT] ? "Preconvert to" : "Convert to",
    [SEND_MODAL_MAPPING_FIELD]: "Receive as"
  }

  const [searchMode, setSearchMode] = useState(false);
  const [selectedField, setSelectedField] = useState("");

  const [processedAmount, setProcessedAmount] = useState(null);

  const [localNetworkName, setLocalNetworkName] = useState(null);

  const [localBalances, setLocalBalances] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionBase, setSuggestionBase] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [conversionPaths, setConversionPaths] = useState(null);

  const [isConversion, setIsConversion] = useState(
   !!(sendModal.data[SEND_MODAL_CONVERTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_CONVERTTO_FIELD].length > 0)
  );
  const [isVia, setIsVia] = useState(
    !!(sendModal.data[SEND_MODAL_VIA_FIELD] != null &&
      sendModal.data[SEND_MODAL_VIA_FIELD].length > 0)
  );
  const [isExport, setIsExport] = useState(
    !!(sendModal.data[SEND_MODAL_EXPORTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_EXPORTTO_FIELD].length > 0)
  );
  const [isMapping, setIsMapping] = useState(
    !!(sendModal.data[SEND_MODAL_MAPPING_FIELD] != null &&
      sendModal.data[SEND_MODAL_MAPPING_FIELD].length > 0)
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

  const [showMappingField, setShowMappingField] = useState(
    sendModal.data[SEND_MODAL_MAPPING_FIELD] || 
    isMapping
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

  const processConverttoSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':        
        return flatPaths.filter(x => {
          if (sendModal.data[SEND_MODAL_IS_PRECONVERT]) {
            return !x.mapping && x.prelaunch
          } else return !x.mapping && !x.prelaunch
        }).map((path, index) => {
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
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: path.destination.fullyqualifiedname }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: [path.destination.currencyid, path.destination.fullyqualifiedname]
          };
        });
      case 'eth':
      case 'erc20':
        return flatPaths.filter(x => {
          return !x.mapping
        }).map((path, index) => {
          const addr = path.ethdest ? path.destination.address : null;
          
          const name = path.ethdest
            ? path.destination.address === ETH_CONTRACT_ADDRESS ? path.destination.name : `${path.destination.name} (${
                addr.substring(0, 8) + '...' + addr.substring(addr.length - 8)
              })`
            : path.destination.fullyqualifiedname;

          return {
            title: name,
            logoid: path.ethdest ? path.destination.address : path.destination.currencyid,
            logoproto: path.ethdest ? "erc20" : null,
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
              [SEND_MODAL_CONVERTTO_FIELD]: path.ethdest ? path.destination.mapto.fullyqualifiedname : path.destination.fullyqualifiedname,
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                ? path.exportto.fullyqualifiedname
                : '',
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: name }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: path.ethdest
              ? [path.destination.address, path.destination.symbol, path.destination.name]
              : [path.destination.currencyid, path.destination.fullyqualifiedname]
          };
        });
      default:
        return []
    }
  }

  const processViaSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':
        return flatPaths.filter(x => {
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
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: path.destination.fullyqualifiedname }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: [path.via.currencyid, path.via.fullyqualifiedname]
          };
        })
      case 'eth':
      case 'erc20':
        return flatPaths.filter(x => {
          if (isConversion) {
            const destinationCurrency = sendModal.data[SEND_MODAL_CONVERTTO_FIELD];
            const destinationCurrencyMatch = !x.ethdest && (x.destination.currencyid === destinationCurrency ||
              destinationCurrency.toLowerCase() ===
                x.destination.fullyqualifiedname.toLowerCase())
            const destinationTokenMatch = x.ethdest && (x.destination.address === destinationCurrency ||
              destinationCurrency.toLowerCase() ===
                x.destination.address.toLowerCase())
            
            return (
              x.via != null &&
              (destinationCurrencyMatch || destinationTokenMatch)
            );
          } else return x.via != null;
        }).map((path, index) => {
          const priceFixed = Number(path.price.toFixed(2))
          const destname = path.ethdest
            ? path.destination.address === ETH_CONTRACT_ADDRESS ? path.destination.name : `${path.destination.name} (${
                path.destination.address.substring(0, 8) + '...' + path.destination.address.substring(path.destination.address.length - 8)
              })`
            : path.destination.fullyqualifiedname;
    
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
                }to ${destname}`,
            values: {
              [SEND_MODAL_VIA_FIELD]: path.via.fullyqualifiedname,
              [SEND_MODAL_CONVERTTO_FIELD]: path.ethdest ? path.destination.mapto.fullyqualifiedname : path.destination.fullyqualifiedname,
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                ? path.exportto.fullyqualifiedname
                : '',
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: destname }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: [path.via.currencyid, path.via.fullyqualifiedname]
          };
        })
      default:
        return []
    }
  }

  const processExporttoSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':
        const seenSystems = {}
        return flatPaths.filter(x => {
          if (x.exportto == null) return false;

          if (sendModal.data[SEND_MODAL_IS_PRECONVERT]) {
            if (
              !x.prelaunch || (!x.mapping && flatPaths.find(
                y =>
                  y.mapping &&
                  y.exportto != null &&
                  y.exportto.currencyid === x.exportto.currencyid,
              ) != null)
            )
              return false;
          } else {
            if (
              x.prelaunch || (!x.mapping && flatPaths.find(
                y =>
                  y.mapping &&
                  y.exportto != null &&
                  y.exportto.currencyid === x.exportto.currencyid,
              ) != null)
            )
              return false;
          }

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
              [SEND_MODAL_MAPPING_FIELD]: path.mapping ? path.destination.symbol : coinObj.display_ticker
            },
            right: "",
            keywords: [path.exportto.currencyid, path.exportto.fullyqualifiedname]
          };
        });
      case 'eth':
      case 'erc20':
        return [
          {
            title: coinObj.testnet
              ? coinsList.VRSCTEST.display_name
              : coinsList.VRSC.display_name,
            logoid: coinObj.testnet ? coinsList.VRSCTEST.id : coinsList.VRSC.id,
            key: 0,
            description: coinObj.testnet
              ? 'Send to the Verus testnet'
              : 'Send to the Verus network',
            values: {
              [SEND_MODAL_EXPORTTO_FIELD]: coinObj.testnet
                ? coinsList.VRSCTEST.display_ticker
                : coinsList.VRSC.display_ticker,
            },
            right: '',
            keywords: coinObj.testnet
              ? [coinsList.VRSCTEST.display_name, coinsList.VRSCTEST.id]
              : [coinsList.VRSC.display_name, coinsList.VRSCTEST.id],
          },
        ];
      default:
        return []
    }
  }

  const processMappingSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':
        return flatPaths
          .filter(x => {
            return x.mapping;
          })
          .map((path, index) => {
            const name =
              path.destination.address === ETH_CONTRACT_ADDRESS
                ? path.destination.name
                : `${path.destination.name} (${
                    path.destination.address.substring(0, 8) +
                    '...' +
                    path.destination.address.substring(path.destination.address.length - 8)
                  })`;

            return {
              title: name,
              logoid: path.destination.address,
              logoproto: 'erc20',
              key: index.toString(),
              description: path.destination.address === ETH_CONTRACT_ADDRESS ? "receive as Ethereum" : `receive as the ${path.destination.symbol} ERC20 token`,
              values: {
                [SEND_MODAL_VIA_FIELD]: '',
                [SEND_MODAL_MAPPING_FIELD]: path.destination.symbol,
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto.fullyqualifiedname,
                [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: name },
              },
              right: "",
              keywords: [
                path.destination.symbol,
                path.destination.name,
              ],
            };
          });
      case 'eth':
      case 'erc20':
        return flatPaths
          .filter(x => {
            return x.mapping;
          })
          .map((path, index) => {
            return {
              title: path.destination.fullyqualifiedname,
              logoid: path.destination.currencyid,
              key: index.toString(),
              description: `receive on ${path.exportto.fullyqualifiedname} network`,
              values: {
                [SEND_MODAL_VIA_FIELD]: '',
                [SEND_MODAL_MAPPING_FIELD]: path.destination.fullyqualifiedname,
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto.fullyqualifiedname,
                [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: path.destination.fullyqualifiedname },
              },
              right: "",
              keywords: [
                path.destination.currencyid,
                path.destination.fullyqualifiedname,
              ],
            };
          });
      default:
        return [];
    }
  };

  const fetchSuggestionsBase = async (field) => {
    if (loadingSuggestions) return;
    let newSuggestionsBase = []
    
    try {
      setLoadingSuggestions(true)

      // {[destinationid: string]: Array<{
      //   via?: CurrencyDefinition;
      //   destination: CurrencyDefinition;
      //   exportto?: string;
      //   price: number;
      //   viapriceinroot?: number;
      //   destpriceinvia?: number;
      //   gateway: boolean;
      //   mapping: boolean;
      //   bounceback: boolean;
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
          newSuggestionsBase = await processConverttoSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_VIA_FIELD:
          newSuggestionsBase = await processViaSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_EXPORTTO_FIELD:
          newSuggestionsBase = await processExporttoSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_MAPPING_FIELD:
          newSuggestionsBase = await processMappingSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
        default:
          setSuggestionBase(newSuggestionsBase);
          break;
      }
    } catch(e) {
      Alert.alert("Failed to fetch conversion paths, enter your currency manually", e.message)
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
    updateSendFormData(SEND_MODAL_PRICE_ESTIMATE, null)
    
    for (const key in values) {
      updateSendFormData(key, values[key]);
    }
    
    leaveSearchMode();
  };

  const fetchLocalNetworkInfo = async () => {
    let address;

    if (sendModal.coinObj.proto === 'erc20' || sendModal.coinObj.proto === 'eth') {
      address =
        sendModal.coinObj.proto === 'erc20'
          ? activeUser.keys[sendModal.coinObj.id][ERC20].addresses[0]
          : activeUser.keys[sendModal.coinObj.id][ETH].addresses[0];

      setLocalNetworkName(coinsList.ETH.display_ticker);
    } else {
      const [channelName, channelAddress, systemId] = sendModal.subWallet.api_channels[API_SEND].split('.');

      address = channelAddress;

      const response = await getCurrency(systemId, sendModal.coinObj.system_id);

      if (response.error) Alert.alert("Error fetching current network", response.error.message);
      else {
        setLocalNetworkName(response.result.fullyqualifiedname);
      }
    }

    try {
      const balances = await getAddressBalances(
        sendModal.coinObj,
        sendModal.subWallet.api_channels[API_SEND],
        {address},
      );

      setLocalBalances(balances);
    } catch(e) {
      console.error(e)
      Alert.alert("Error fetching balances", e.message);
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
    setShowMappingField(sendModal.data[SEND_MODAL_SHOW_MAPPING_FIELD] || isMapping)
  }, [sendModal.data[SEND_MODAL_SHOW_MAPPING_FIELD], isMapping])

  useEffect(() => {
    setProcessedAmount(getProcessedAmount())
  }, [sendModal.data[SEND_MODAL_AMOUNT_FIELD]])

  useEffect(() => {
    fetchLocalNetworkInfo()
  }, [sendModal.subWallet.api_channels[API_SEND]])

  useEffect(() => {
    setIsConversion(!!(sendModal.data[SEND_MODAL_CONVERTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_CONVERTTO_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_CONVERTTO_FIELD]])

  useEffect(() => {
    setIsVia(!!(sendModal.data[SEND_MODAL_VIA_FIELD] != null &&
      sendModal.data[SEND_MODAL_VIA_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_VIA_FIELD]])

  useEffect(() => {
    setIsExport(!!(sendModal.data[SEND_MODAL_EXPORTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_EXPORTTO_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_EXPORTTO_FIELD]])

  useEffect(() => {
    setIsMapping(!!(sendModal.data[SEND_MODAL_MAPPING_FIELD] != null &&
      sendModal.data[SEND_MODAL_MAPPING_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_MAPPING_FIELD]])

  useEffect(() => {
    if (localBalances != null && sendModal.data[SEND_MODAL_CONTINUE_IMMEDIATELY]) {
      updateSendFormData(SEND_MODAL_CONTINUE_IMMEDIATELY, false);
      submitData();
    }
  }, [localBalances])
  
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
    } else if (addressIsBlocked(toAddress, addressBlocklist)) {
      createAlert("Blocked Address", "The address you are trying to send to is included in your address blocklist.");
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
          const identityRes = await getIdentity(coinObj, activeAccount, channel, addr);

          if (identityRes.error) throw new Error("Failed to fetch " + addr);

          keyhash = identityRes.result.identity.identityaddress;
        } else keyhash = addr;

        const keyhashIsEth = () => {
          try {
            return ethers.utils.isAddress(keyhash);
          } catch(e) {
            return false;
          }
        }

        if (keyhashIsEth()) {
          return new TransferDestination({
            destination_bytes: Buffer.from(keyhash.substring(2), 'hex'),
            type: DEST_ETH
          })
        } else {
          const { hash, version } = fromBase58Check(keyhash);
          let type;

          if (version === R_ADDRESS_VERSION) type = DEST_PKH;
          else if (version === I_ADDRESS_VERSION) type = DEST_ID;
          else throw new Error("Incompatible address type.");

          return new TransferDestination({
            destination_bytes: hash,
            type
          })
        }        
      }

      const amount = getProcessedAmount();

      let output = {
        currency: coinObj.currency_id,
        mapto: selectData(data[SEND_MODAL_MAPPING_FIELD]),
        convertto: selectData(data[SEND_MODAL_CONVERTTO_FIELD]),
        exportto: selectData(data[SEND_MODAL_EXPORTTO_FIELD]),
        via: selectData(data[SEND_MODAL_VIA_FIELD]),
        address: await selectAddress(data[SEND_MODAL_TO_ADDRESS_FIELD]),
        satoshis: coinsToSats(BigNumber(amount)).toString(),
        preconvert: selectData(data[SEND_MODAL_IS_PRECONVERT])
      }

      if (
        coinObj.proto === 'vrsc' &&
          output.exportto != null &&
          (output.exportto.toLowerCase() === toIAddress(VETH, coinObj.testnet ? 'VRSCTEST' : 'VRSC').toLowerCase() || output.exportto.toLowerCase() === 'veth')
      ) {
        try {
          const provider = getWeb3ProviderForNetwork(
            coinObj.testnet ? 'goerli' : 'homestead',
          );

          if (!(await provider.isVerusBridgeDelegatorActive())) {
            output.feecurrency = toIAddress(
              VETH,
              coinObj.testnet ? 'VRSCTEST' : 'VRSC',
            );
            output.bridgeprelaunch = true;
          }
        } catch (e) {
          console.warn(e);
        }
      }

      for (const key in output) {
        if (output[key] == null) delete output[key]
      }

      const res = await preflightConvertOrCrossChain(coinObj, activeAccount, channel, output)

      setModalHeight(height >= 720 ? 696 : height - 24);

      if (res.err) {
        throw new Error(res.result);
      }

      const {
        converterdef,
        submittedsats,
        estimate,
        output: resout
      } = res.result;

      if (resout.convertto != null && estimate == null && sendModal.data[SEND_MODAL_PRICE_ESTIMATE] == null) {
        Alert.alert("Could not estimate conversion result", 'Failed to calculate an estimated result for this conversion.')
      }
  
      if (converterdef != null && converterdef.proofprotocol === 2) {
        Alert.alert("Centralized currency", `You are converting to ${
          converterdef.fullyqualifiedname
        }, a centralized currency. The controller, ${converterdef.fullyqualifiedname}@, has the ability to mint new supply.`)
      }
  
      if (submittedsats !== resout.satoshis) {
        if (sendModal.data[SEND_MODAL_STRICT_AMOUNT]) {
          throw new Error(
            `You have insufficient funds to send your submitted amount of ${satsToCoins(
              BigNumber(submittedsats),
            ).toString()} ${coinObj.display_ticker} plus the transaction fee.`,
          );
        } else {
          Alert.alert(
            'Amount changed',
            `You have insufficient funds to send your submitted amount of ${satsToCoins(
              BigNumber(submittedsats),
            ).toString()} ${coinObj.display_ticker} with the transaction fee, so the transaction amount has been changed to the maximum sendable value of ${satsToCoins(
              BigNumber(resout.satoshis),
            ).toString()} ${coinObj.display_ticker}.`,
          );
        }
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

  return localBalances == null ? (<AnimatedActivityIndicatorBox />) : (
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
              opacity: fadeSearchMode,
            }}>
            <View style={{width: '92%', paddingTop: 8}}>
              <View style={Styles.flexRow}>
                <TextInput
                  label={FIELD_TITLES[selectedField]}
                  value={sendModal.data[selectedField]}
                  onChangeText={handleSearch}
                  mode="outlined"
                  style={{
                    flex: 1,
                  }}
                />
                <Button
                  onPress={() => handleSearch('')}
                  textColor={Colors.primaryColor}
                  style={{
                    alignSelf: 'center',
                    marginTop: 6,
                  }}
                  compact>
                  {'Clear'}
                </Button>
              </View>
            </View>
            {loadingSuggestions ? (
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
                      <Text
                        style={{...Styles.listItemTableCell, fontWeight: 'bold'}}>
                        {'Name'}
                      </Text>
                    }
                    right={() =>
                      selectedField !== SEND_MODAL_EXPORTTO_FIELD &&
                      selectedField !== SEND_MODAL_MAPPING_FIELD ? (
                        <Text
                          style={{
                            ...Styles.listItemTableCell,
                            fontWeight: 'bold',
                          }}>
                          {'est. price in ' + sendModal.coinObj.display_ticker}
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
                      const Logo = getCoinLogo(
                        item.logoid,
                        item.logoproto,
                        'dark',
                      );

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
            )}
          </Animated.View>
        ) : (
          <Animated.View style={{flex: 1, opacity: fadeNormalForm}}>
            <KeyboardAwareScrollView
              style={{
                backgroundColor: Colors.secondaryColor,
                ...Styles.fullWidth,
                flex: 1,
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
              <CoreSendFormModule
                destDisabled={
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                    SEND_MODAL_TO_ADDRESS_FIELD
                  ]
                }
                amountDisabled={
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                  sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                    SEND_MODAL_AMOUNT_FIELD
                  ]
                }
                sendingFromValue={sendModal.subWallet.name}
                recipientAddressValue={
                  sendModal.data[SEND_MODAL_TO_ADDRESS_FIELD]
                }
                onRecipientAddressChange={text =>
                  updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, text)
                }
                onSelfPress={() => setAddressSelf()}
                amountValue={sendModal.data[SEND_MODAL_AMOUNT_FIELD]}
                onAmountChange={text =>
                  updateSendFormData(SEND_MODAL_AMOUNT_FIELD, text)
                }
                onMaxPress={() => maxAmount()}
                maxButtonDisabled={localBalances == null}
                networkName={networkName}
                estimatedResultSubtitle={
                  isConversion &&
                  sendModal.data[SEND_MODAL_PRICE_ESTIMATE] != null &&
                  processedAmount != null
                    ? `≈ ${Number(
                        (
                          processedAmount *
                          sendModal.data[SEND_MODAL_PRICE_ESTIMATE].price
                        ).toFixed(8),
                      )} ${sendModal.data[SEND_MODAL_PRICE_ESTIMATE].name}`
                    : null
                }
              />
              {showConversionField || showViaField ? (
                <ConvertFormModule
                  convertDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_CONVERTTO_FIELD
                    ]
                  }
                  viaDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_VIA_FIELD
                    ]
                  }
                  isConversion={isConversion}
                  isPreconvert={sendModal.data[SEND_MODAL_IS_PRECONVERT]}
                  advancedForm={sendModal.data[SEND_MODAL_ADVANCED_FORM]}
                  convertToField={sendModal.data[SEND_MODAL_CONVERTTO_FIELD]}
                  viaField={sendModal.data[SEND_MODAL_VIA_FIELD]}
                  handleFieldFocusVia={() =>
                    handleFieldFocus(SEND_MODAL_VIA_FIELD)
                  }
                  handleFieldFocusConvertTo={() =>
                    handleFieldFocus(SEND_MODAL_CONVERTTO_FIELD)
                  }
                  onViaChange={text =>
                    updateSendFormData(SEND_MODAL_VIA_FIELD, text)
                  }
                  onConvertToChange={text =>
                    updateSendFormData(SEND_MODAL_CONVERTTO_FIELD, text)
                  }
                  isVia={isVia}
                  showConversionField={showConversionField}
                  showViaField={showViaField}
                />
              ) : null}
              {showExportField && (
                <ExportFormModule
                  exporttoDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_EXPORTTO_FIELD
                    ]
                  }
                  mappingDisabled={
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS] &&
                    sendModal.data[SEND_MODAL_DISABLED_INPUTS][
                      SEND_MODAL_MAPPING_FIELD
                    ]
                  }
                  isExport={isExport}
                  isConversion={isConversion}
                  exportToField={sendModal.data[SEND_MODAL_EXPORTTO_FIELD]}
                  handleNetworkFieldFocus={() =>
                    handleFieldFocus(SEND_MODAL_EXPORTTO_FIELD)
                  }
                  onSystemChange={text =>
                    updateSendFormData(SEND_MODAL_EXPORTTO_FIELD, text)
                  }
                  localNetworkName={localNetworkName}
                  advancedForm={sendModal.data[SEND_MODAL_ADVANCED_FORM]}
                  isPreconvert={sendModal.data[SEND_MODAL_IS_PRECONVERT]}
                  showMappingField={sendModal.data[SEND_MODAL_SHOW_MAPPING_FIELD]}
                  mappingField={sendModal.data[SEND_MODAL_MAPPING_FIELD]}
                  handleMappingFieldFocus={() =>
                    handleFieldFocus(SEND_MODAL_MAPPING_FIELD)
                  }
                  onMappingChange={text =>
                    updateSendFormData(SEND_MODAL_MAPPING_FIELD, text)
                  }
                />
              )}
              {(sendModal.data[SEND_MODAL_IS_PRECONVERT] ||
                sendModal.data[SEND_MODAL_ADVANCED_FORM]) &&
                sendModal.data[SEND_MODAL_SHOW_IS_PRECONVERT] && (
                  <React.Fragment>
                    <View style={{...Styles.wideBlockDense}}>
                      <Divider />
                    </View>
                    <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
                      <Checkbox.Item
                        color={Colors.primaryColor}
                        disabled={
                          sendModal.data[SEND_MODAL_ADVANCED_FORM] ? false : true
                        }
                        label={'Send as preconvert'}
                        status={
                          sendModal.data[SEND_MODAL_IS_PRECONVERT]
                            ? 'checked'
                            : 'unchecked'
                        }
                        onPress={
                          sendModal.data[SEND_MODAL_ADVANCED_FORM]
                            ? () =>
                                updateSendFormData(
                                  SEND_MODAL_IS_PRECONVERT,
                                  !sendModal.data[SEND_MODAL_IS_PRECONVERT],
                                )
                            : undefined
                        }
                        mode="android"
                      />
                    </View>
                  </React.Fragment>
                )}
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
