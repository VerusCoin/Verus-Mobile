/*
  This component handles VerusPay, the Verus Mobile one step
  payment solution. It should be as general as possible, and 
  able to handle as many different kinds of payment protocols
  as possible while still looking and feeling the same from the
  user side of things.
*/

import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert } from 'react-native';
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
import { conditionallyUpdateWallet } from '../../actions/actionDispatchers';
import store from '../../store';
import { Portal } from 'react-native-paper';
import SubWalletSelectorModal from '../SubWalletSelect/SubWalletSelectorModal';
import {
  createAlert,
  resolveAlert,
} from '../../actions/actions/alert/dispatchers/alert';
import QrScanner from '../../utils/QrScanner/QrScanner';
import styles from '../../styles';
import BarcodeReader from '../../components/BarcodeReader/BarcodeReader';
import AnimatedActivityIndicator from '../../components/AnimatedActivityIndicator';
import { openSubwalletSendModal } from '../../actions/actions/sendModal/dispatchers/sendModal';
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
} from '../../utils/constants/sendModal';
import { SET_DEEPLINK_DATA } from '../../utils/constants/storeType';
import { getCurrency } from '../../utils/api/channels/verusid/callCreators';
import { CommonActions } from '@react-navigation/routers';
import { useNavigation } from '@react-navigation/native';
import { useObjectSelector } from '../../hooks/useObjectSelector';

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

  const { containerStyle, acceptAddressOnly, channel, coinObj: propCoinObj, button, maskProps } = props;

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

  const onSuccess = (codes) => {
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

  const loadingState =
    loading || activeAlert != null || sendModal.visible || props.showSpinner;

  return (
    <View style={{ ...styles.blackRoot, ...containerStyle }}>
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
      {loadingState ? (
        <View style={styles.focalCenter}>
          <AnimatedActivityIndicator
            style={{
              width: 128,
            }}
          />
        </View>
      ) : (
        <React.Fragment>
          <BarcodeReader
            prompt={
              acceptAddressOnly
                ? 'Scan an invoice or address'
                : 'Scan a QR code'
            }
            onScan={(codes) => onSuccess(codes)}
            button={button}
            maskProps={maskProps}
          />
        </React.Fragment>
      )}
    </View>
  );
};

export default VerusPay;