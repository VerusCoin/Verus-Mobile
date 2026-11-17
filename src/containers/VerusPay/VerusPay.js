/*
  This component handles VerusPay, the Verus Mobile one step
  payment solution. It should be as general as possible, and 
  able to handle as many different kinds of payment protocols
  as possible while still looking and feeling the same from the
  user side of things.
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Alert, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import base64url from 'base64url';
import { URL } from 'react-native-url-polyfill';
import { primitives } from 'verusid-ts-client';
import {
  CALLBACK_HOST,
  INCOMPATIBLE_APP,
  ONLY_ADDRESS,
  SUPPORTED_DLS,
} from '../../utils/constants/constants';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  IS_PBAAS,
} from '../../utils/constants/intervalConstants';
import {
  conditionallyUpdateWallet,
  readDeeplinkFromNfc,
} from '../../actions/actionDispatchers';
import store from '../../store';
import { Portal } from 'react-native-paper';
import SubWalletSelectorModal from '../SubWalletSelect/SubWalletSelectorModal';
import {
  createAlert,
  resolveAlert,
} from '../../actions/actions/alert/dispatchers/alert';
import QrScanner from '../../utils/QrScanner/QrScanner';
import BarcodeReader from '../../components/BarcodeReader/BarcodeReader';
import { useNfcSupported } from '../../hooks/useNfcSupported';
import { openSubwalletSendModal } from '../../actions/actions/sendModal/dispatchers/sendModal';
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
} from '../../utils/constants/sendModal';
import { SET_DEEPLINK_DATA } from '../../utils/constants/storeType';
import { getCurrency } from '../../utils/api/channels/verusid/callCreators';
import { CommonActions } from '@react-navigation/routers';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { useAppTheme } from '../../theme/app';
import signedInCopy from '../../copy/signedIn';
import AcknowledgeSheet from '../../components/AcknowledgeSheet';
import { ASSET_NOT_ACTIVE } from '../../utils/QrScanner/QrScanner';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import { addManagedAsset } from '../../utils/assets/assetManagementService';
import { isTestnetAccount } from '../../utils/assets/assetIdentity';
import {
  getRecipientAddressType,
  SEND_WIZARD_MODE,
} from '../SendWizard/wizardUtils';
import { countFundedSendCards } from '../SendWizard/scanRequest';

const UNUSABLE_QR = {
  title: 'Can’t use this QR code',
  message: 'It is not an address or a payment request.',
  confirmLabel: 'Scan again',
};

const VerusPay = (props) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [coinObj, setCoinObj] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [amount, setAmount] = useState(null);
  const [note, setNote] = useState(null);
  const [subWalletSelectorOpen, setSubWalletSelectorOpen] = useState(false);
  const [subWalletSelectorCoin, setSubWalletSelectorCoin] = useState(null);
  const [subWalletSelectorDisplayTicker, setSubWalletSelectorDisplayTicker] =
    useState(null);
  // The Scan tab answers a code it cannot pay with a sheet, not an alert.
  const [sheet, setSheet] = useState(UNUSABLE_QR);
  const [sheetVisible, setSheetVisible] = useState(false);
  const scanBusy = useRef(false);

  // A scan that opened Send, or a closed sheet, frees the scanner again.
  useFocusEffect(
    useCallback(() => {
      scanBusy.current = false;
    }, []),
  );

  const activeCoinsForUser = useObjectSelector(
    (state) => state.coins.activeCoinsForUser,
  );
  const activeCoin = useObjectSelector((state) => state.coins.activeCoin);
  const activeAccount = useObjectSelector(
    (state) => state.authentication.activeAccount,
  );
  const allSubWallets = useObjectSelector(
    (state) => state.coinMenus.allSubWallets,
  );
  const activeAlert = useObjectSelector((state) => state.alert.active);
  const sendModal = useObjectSelector((state) => state.sendModal);

  const { containerStyle, acceptAddressOnly, channel, coinObj: propCoinObj, button, cameraDisabled } = props;
  const theme = useAppTheme();
  const nfcSupported = useNfcSupported();
  // The general Scan screen also reads Verus NFC cards. Address-only scanners
  // and callers with their own button keep their current controls.
  const showNfcClaim = nfcSupported && !acceptAddressOnly && button == null;

  useEffect(() => {
    return () => {
      refresh();
    };
  }, []);

  useEffect(() => {
    if (coinObj) {
      handleUpdates();
    }
  }, [coinObj]);

  const refresh = useCallback(() => {
    activeCoinsForUser.forEach(async (coinObj) => {
      await conditionallyUpdateWallet(
        store.getState(),
        dispatch,
        coinObj.id,
        API_GET_FIATPRICE,
      );
      await conditionallyUpdateWallet(
        store.getState(),
        dispatch,
        coinObj.id,
        API_GET_BALANCES,
      );
      await conditionallyUpdateWallet(
        store.getState(),
        dispatch,
        coinObj.id,
        API_GET_INFO,
      );
    });
  }, [activeCoinsForUser, dispatch]);

  const tryProcessDeeplink = (urlstring) => {
    const genericRequest = (() => {
      try {
        return primitives.GenericRequest.fromWalletDeeplinkUri(
          urlstring,
        );
      } catch (e) {
        return null;
      }
    })();

    if (genericRequest != null) {
      dispatch({
        type: SET_DEEPLINK_DATA,
        payload: {
          id: primitives.GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
          data: genericRequest.toBuffer().toString('hex'),
        },
      });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'DeepLink' }],
        }),
      );
      return;
    }

    const url = new URL(urlstring);

    if (url.host !== CALLBACK_HOST)
      throw new Error('Unsupported deeplink host url.');

    const id = url.pathname.split('/')[1];

    if (!SUPPORTED_DLS.includes(id)) {
      throw new Error('Unsupported deeplink url path.');
    }

    let dl;

    if (id === primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid) {
      dl = new primitives.LoginConsentRequest();
      dl.fromBuffer(
        base64url.toBuffer(
          url.searchParams.get(primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid),
        ),
      );
    } else if (id === primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid) {
      dl = primitives.VerusPayInvoice.fromWalletDeeplinkUri(urlstring);
    }

    dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id,
        data: dl.toJson(),
      },
    });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'DeepLink' }],
      }),
    );
  };

  const showSheet = content => {
    setSheet(content);
    setSheetVisible(true);
  };

  // A request that names a network other than its asset's own warns on Confirm.
  const getNetworkNotice = async (coin, system) => {
    if (!system || !coin.tags?.includes(IS_PBAAS) || system === coin.system_id) {
      return null;
    }
    let name = null;
    try {
      const response = await getCurrency(coin.system_id, system);
      name = response.error ? null : response.result.fullyqualifiedname;
    } catch (e) {}
    return `This request is for ${coin.display_ticker} on ${
      name || 'another network'
    }. Check the network before you send.`;
  };

  // Every payment QR code opens Send. A request with an amount opens Confirm
  // when one card can pay; Amount and Select asset fill the gaps.
  const openScanSend = scan => {
    const params = {
      mode: SEND_WIZARD_MODE.SEND,
      ...(scan.coinId ? {initialCoinId: scan.coinId} : {}),
      scan,
    };
    const toConfirm =
      scan.amount &&
      scan.coinId &&
      countFundedSendCards(store.getState(), scan.coinId, scan.address) === 1;

    navigation.navigate(
      'SendWizard',
      toConfirm ? {...params, screen: 'SendWizardConfirm', initial: false} : params,
    );
  };

  const scanToSend = async raw => {
    const request = QrScanner.processGenericPaymentRequest(raw);
    const {coinObj: coin, address, amount, note, system} = request;

    if (coin == null) {
      if (!getRecipientAddressType(address)) throw new Error(UNUSABLE_QR.message);
      openScanSend({address});
      return;
    }
    if (!coin.apps?.hasOwnProperty('wallet')) {
      showSheet({...UNUSABLE_QR, message: `This wallet can’t send ${coin.display_ticker}.`});
      return;
    }
    openScanSend({
      address,
      amount:
        amount != null && BigNumber(amount).isGreaterThan(0)
          ? BigNumber(amount).toFixed()
          : null,
      note: note || null,
      notice: await getNetworkNotice(coin, system),
      coinId: coin.id,
    });
  };

  const offerToAddAsset = (notActive, raw) => {
    let coin = null;
    try {
      coin = CoinDirectory.findCoinObj(notActive.coinId);
    } catch (e) {}
    if (!coin) {
      showSheet(UNUSABLE_QR);
      return;
    }
    // Never add a mainnet asset to a testnet wallet, or the other way round.
    if (Boolean(coin.testnet) !== isTestnetAccount(activeAccount)) {
      showSheet({
        ...UNUSABLE_QR,
        message: `This request is for ${coin.testnet ? 'testnet' : 'mainnet'}. Open a ${
          coin.testnet ? 'testnet' : 'mainnet'
        } wallet and scan it again.`,
      });
      return;
    }
    const name = coin.display_name;
    showSheet({
      title: `Add ${name}?`,
      message: `This request asks for ${
        notActive.amount ? `${notActive.amount} ` : ''
      }${coin.display_ticker}. ${name} is not in your wallet yet.`,
      confirmLabel: `Add ${name}`,
      dismissLabel: 'Not now',
      onConfirm: async () => {
        scanBusy.current = true;
        setLoading(true);
        try {
          const added = await addManagedAsset({coin});
          // Load the new asset's balance first, so Send can find a card to pay from.
          if (added?.id) {
            await conditionallyUpdateWallet(
              store.getState(),
              dispatch,
              added.id,
              API_GET_BALANCES,
            );
          }
          await scanToSend(raw);
        } catch (e) {
          showSheet({...UNUSABLE_QR, message: `Couldn’t add ${name}. Try again.`});
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const onSuccess = async (codes) => {
    if (scanBusy.current) return;
    scanBusy.current = true;
    try {
      let result = codes[0].value;

      try {
        tryProcessDeeplink(result);
        return;
      } catch (dlError) {
        console.log(
          `Could not find deeplink uri in QR scan, falling back to payment request, error:  ${dlError.message}`,
        );
      }

      if (!acceptAddressOnly) {
        try {
          await scanToSend(result);
        } catch (scanError) {
          if (scanError.code === ASSET_NOT_ACTIVE) offerToAddAsset(scanError, result);
          else showSheet(UNUSABLE_QR);
        }
        return;
      }
      scanBusy.current = false;

      const paymentRequest = QrScanner.processGenericPaymentRequest(result);
      const {
        coinObj: scannedCoinObj,
        address: scannedAddress,
        note: scannedNote,
        amount: scannedAmount,
        system,
      } = paymentRequest;

      if (scannedCoinObj == null) {
        addressOnly(scannedAddress);
      } else if (!acceptAddressOnly || activeCoin.id === scannedCoinObj.id) {
        if (scannedAmount === null) {
          handleMissingAmount(
            scannedCoinObj,
            scannedAddress,
            scannedNote,
            system,
          );
        } else {
          preConfirm(
            scannedCoinObj,
            activeAccount,
            scannedAddress,
            scannedAmount,
            scannedNote,
            false,
            system,
          );
        }
      } else {
        canExitWallet(
          activeCoin.display_ticker,
          scannedCoinObj.display_ticker,
        ).then((res) => {
          if (res) {
            if (scannedAmount === null) {
              handleMissingAmount(
                scannedCoinObj,
                scannedAddress,
                scannedNote,
                system,
              );
            } else {
              preConfirm(
                scannedCoinObj,
                activeAccount,
                scannedAddress,
                scannedAmount,
                scannedNote,
                true,
                system,
              );
            }
          } else {
            cancelHandler();
          }
        });
      }
    } catch (e) {
      console.warn(e);
      scanBusy.current = false;
      errorHandler(e.message);
    }
  };

  const errorHandler = (error) => {
    createAlert('Error', error);

    cancelHandler();
  };

  const cancelHandler = () => {
    setLoading(false);
  };

  const handleMissingAmount = (coinObj, address, note, system) => {
    if (coinObj.apps.hasOwnProperty('wallet')) {
      preConfirm(coinObj, activeAccount, address, '', note, false, system);
    } else {
      errorHandler(INCOMPATIBLE_APP);
    }
  };

  const preConfirm = async (
    coinObj,
    activeUser,
    address,
    amount,
    note,
    sourceSwitch = false,
    system,
  ) => {
    const subWallet = channel && !sourceSwitch ? channel : null;

    if (coinObj.tags.includes(IS_PBAAS) && system != null) {
      const getCurrencyRes = await getCurrency(coinObj.system_id, system);
      if (getCurrencyRes.error)
        Alert.alert(
          'Network Warning',
          `This invoice was created using the network with ID ${system}. Ensure that you send ${coinObj.display_ticker} on that network. You can send across networks through the convert or cross-chain modal under the send tab.`,
        );
      else {
        const name = getCurrencyRes.result.fullyqualifiedname;
        Alert.alert(
          'Network Warning',
          `This invoice was created using the ${name} network. Ensure that you send ${coinObj.display_ticker} on the ${name} network. You can send across networks through the convert or cross-chain modal under the send tab.`,
        );
      }
    }

    setCoinObj(coinObj);
    setActiveUser(activeUser);
    setAddress(address);
    setAmount(amount);
    setNote(note);

    openSendModal(subWallet, coinObj, address, amount);
  };

  const canExitWallet = (fromTicker, toTicker) => {
    return createAlert(
      'Leaving Wallet',
      `This invoice is requesting funds in ${toTicker}, but you are currently in the ${fromTicker} wallet. Would you like to proceed?`,
      [
        {
          text: 'No, take me back',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => resolveAlert(true) },
      ],
    );
  };

  const openSendModal = (subWallet, sendCoinObj = coinObj, sendAddress = address, sendAmount = amount) => {
    if (subWallet != null) {
      setSubWalletSelectorOpen(false);
      setSubWalletSelectorCoin(null);
      openSubwalletSendModal(sendCoinObj, subWallet, {
        [SEND_MODAL_TO_ADDRESS_FIELD]: sendAddress,
        [SEND_MODAL_AMOUNT_FIELD]: sendAmount ? sendAmount.toString() : '',
        [SEND_MODAL_MEMO_FIELD]: '',
      });
    } else {
      setSubWalletSelectorCoin(sendCoinObj.id);
      setSubWalletSelectorDisplayTicker(sendCoinObj.display_ticker);

      const subWallets = allSubWallets[sendCoinObj.id];

      if (subWallets.length === 1) {
        openSendModal(subWallets[0], sendCoinObj, sendAddress, sendAmount);
      } else {
        setSubWalletSelectorOpen(true);
      }
    }
  };

  const handleUpdates = async () => {
    setLoading(true);

    const updates = [API_GET_BALANCES, API_GET_INFO];

    for (const update of updates) {
      await conditionallyUpdateWallet(
        store.getState(),
        dispatch,
        coinObj.id,
        update,
      );
    }

    setLoading(false);
  };

  const addressOnly = (address) => {
    if (acceptAddressOnly) {
      preConfirm(propCoinObj, activeAccount, address, null, null, false);
    } else {
      errorHandler(ONLY_ADDRESS);
    }
  };

  const cameraActive =
    !cameraDisabled &&
    !sheetVisible &&
    !subWalletSelectorOpen &&
    activeAlert == null &&
    !sendModal.visible;
  const scanActions = showNfcClaim
    ? [{label: 'Scan NFC card', onPress: () => readDeeplinkFromNfc()}]
    : [];

  return (
    <SafeAreaView
      edges={acceptAddressOnly ? [] : ['top', 'left', 'right']}
      style={[scanStyles.screen, {backgroundColor: theme.colors.background}, containerStyle]}>
      <Portal>
        {subWalletSelectorOpen && (
          <SubWalletSelectorModal
            visible={subWalletSelectorOpen}
            chainTicker={subWalletSelectorCoin}
            cancel={() => {
              setSubWalletSelectorOpen(false);
              setSubWalletSelectorCoin(null);
            }}
            animationType="slide"
            subWallets={
              subWalletSelectorCoin == null
                ? []
                : allSubWallets[subWalletSelectorCoin]
            }
            onSelect={(wallet) => openSendModal(wallet)}
            displayTicker={subWalletSelectorDisplayTicker}
          />
        )}
      </Portal>
      {acceptAddressOnly ? null : (
        <View style={scanStyles.header}>
          <Text
            accessibilityRole="header"
            style={[theme.typography.headlineMd, {color: theme.colors.textPrimary}]}>
            {signedInCopy.navigation.scan}
          </Text>
        </View>
      )}
      <BarcodeReader
        actions={scanActions}
        active={cameraActive}
        busy={loading || Boolean(props.showSpinner)}
        includeBottomInset={false}
        onScan={(codes) => onSuccess(codes)}>
        {button ? button() : null}
      </BarcodeReader>
      <AcknowledgeSheet
        confirmLabel={sheet.confirmLabel}
        dismissLabel={sheet.dismissLabel}
        message={sheet.message}
        onAcknowledged={sheet.onConfirm}
        onClose={() => {
          setSheetVisible(false);
          scanBusy.current = false;
        }}
        testID="scan-sheet"
        title={sheet.title}
        visible={sheetVisible}
      />
    </SafeAreaView>
  );
};

const scanStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // The Services title spacing.
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
});

export default VerusPay;