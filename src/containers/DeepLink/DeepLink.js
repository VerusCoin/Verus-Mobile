import { CommonActions } from '@react-navigation/native';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AnimatedActivityIndicatorBox from '../../components/AnimatedActivityIndicatorBox';
import Styles from '../../styles/index';
import { primitives } from "verusid-ts-client"
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import {
  getBlock,
  verifyLoginConsentRequest,
  verifyVerusPayInvoice,
  extractLoginConsentSig,
  extractVerusPayInvoiceSig,
  getInfo
} from '../../utils/api/channels/vrpc/callCreators';
import { GENERIC_REQUEST, LOGIN_CONSENT_INFO, VERUSPAY_INVOICE_INFO } from '../../utils/constants/deeplink';
import LoginRequestInfo from './LoginRequestInfo/LoginRequestInfo';
import { getCurrency, getIdentity } from '../../utils/api/channels/verusid/callCreators';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';
import { resetDeeplinkData } from '../../actions/actionCreators';

const authorizedPermissions = [primitives.IDENTITY_VIEW.vdxfid,/*TODO: primitives.IDENTITY_AGREEMENT.vdxfid, primitives.ATTESTATION_READ_REQUEST.vdxfid */]
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import BigNumber from 'bignumber.js';
import { blocksToTime, satsToCoins } from '../../utils/math';
import InvoiceInfo from './InvoiceInfo/InvoiceInfo';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { validateGenericRequest } from '../../utils/deeplink/validator/envelopeValidator';
import GenericRequestHome from './GenericRequestHome/GenericRequestHome';
import { openAuthenticateUserModal } from '../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../utils/constants/sendModal';
import store from '../../store';
import { selectHasAuthenticatedSession } from '../../selectors/authentication';
import {
  assertExperimentalGenericRequestAllowed,
} from '../../utils/deeplink/experimentalDeeplinks';
import {
  validateVerusPayBurnChangePrice,
  VERUSPAY_BURN_OWN_ADDRESS_DISPLAY,
} from '../../utils/deeplink/verusPayBurnChangePrice';
import {assertRequestNetworkMatchesAccount} from '../../utils/deeplink/requestAccounts';

const DeepLink = (props) => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkData = useObjectSelector((state) => state.deeplink.data)
  const requestId = useSelector(state => state.deeplink.requestId);

  const signedIn = useSelector((state) => state.authentication.signedIn)
  const hasAuthenticatedSession = useSelector(selectHasAuthenticatedSession)
  const alertActive = useSelector(state => state.alert.active);
  const sendModalVisible = useSelector(state => state.sendModal.visible);
  const sendModalType = useSelector(state => state.sendModal.type);
  const accounts = useObjectSelector(state => state.authentication.accounts)
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  )
  const [displayKey, setDisplayKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayProps, setDisplayProps] = useState({})
  const [waitingForSignin, setWaitingForSignin] = useState(false)
  const [authModalOpened, setAuthModalOpened] = useState(false)
  const dispatch = useDispatch()
  const source = useMemo(() => ({deeplinkId, deeplinkData, requestId}), [deeplinkId, deeplinkData, requestId]);
  const currentSource = useRef(source);
  currentSource.current = source;
  const currentOperation = useRef(null);
  const displayedSource = useRef(null);
  const mounted = useRef(true);
  const authSource = useRef(null);

  const endOperation = () => {
    const operation = currentOperation.current;
    currentOperation.current = null;
    if (operation) {
      clearTimeout(operation.authTimer);
    }
  };
  const showScreen = (operation, key, screenProps) => {
    operation.assertActive();
    displayedSource.current = source;
    setDisplayProps(screenProps);
    setDisplayKey(key);
  };

  const cancel = () => {
    if (!mounted.current || currentSource.current !== source || !currentOperation.current) return;
    endOperation();
    let resetAction

    if (signedIn) {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedInStack'}],
      });
    } else if (accounts.length === 0) {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedOutNoKeyStack'}],
      });
    } else {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedOutStack'}],
      });
    }
    dispatch(resetDeeplinkData())
    props.navigation.dispatch(resetAction);
  }

  const processGenericRequest = async (operation) => {
    const request = new primitives.GenericRequest();
    request.fromBuffer(Buffer.from(deeplinkData, 'hex'));

    if (signedIn) {
      assertRequestNetworkMatchesAccount(activeAccount, request.isTestnet());
    }

    const requiresDelegatedUserCheck =
      request.isSigned() &&
      request.hasAppOrDelegatedID() &&
      request.appOrDelegatedID.toAddress() !== request.signature.identityID.toAddress();
    const requiresUploadSession = request.details.some(detail =>
      detail.getIAddressKey() === primitives.IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid &&
      detail.data.signDataMap?.size > 0,
    );
    
    assertExperimentalGenericRequestAllowed(request, store.getState());

    if ((requiresDelegatedUserCheck || requiresUploadSession) && !signedIn) {
      authSource.current = source;
      setWaitingForSignin(true);

      const allowList = request.isTestnet()
        ? accounts.filter(x => x.testnetOverrides && Object.keys(x.testnetOverrides).length > 0)
        : accounts.filter(x => !x.testnetOverrides || Object.keys(x.testnetOverrides).length === 0);

      if (allowList.length > 0) {
        const data = {
          [SEND_MODAL_USER_ALLOWLIST]: allowList
        };

        // Unfortunate hack to prevent screen from locking with gray overlay if deeplink is 
        // called when app is closed
        operation.authTimer = setTimeout(() => {
          if (operation.isActive()) openAuthenticateUserModal(data);
        }, 1000)
        return;
      }

      createAlert(
        "Cannot continue",
        `No ${request.isTestnet() ? 'testnet' : 'mainnet'} profiles found, cannot continue this request.`,
      );
      cancel();
      return;
    }

    await validateGenericRequest(request);

    showScreen(operation, GENERIC_REQUEST, {
      deeplinkData
    })
  }

  const processVerusPayInvoice = async (operation) => {
    const invoice = primitives.VerusPayInvoice.fromJson(deeplinkData)

    if (signedIn) {
      assertRequestNetworkMatchesAccount(
        activeAccount,
        invoice.details.isTestnet(),
      );
    }

    if (!invoice.details.acceptsNonVerusSystems() && invoice.details.excludesVerusBlockchain()) {
      throw new Error("This invoice accepts no systems to pay on, and is therefore unpayable.")
    }

    const coinObj = CoinDirectory.getBasicCoinObj(invoice.details.isTestnet() ? 'VRSCTEST' : 'VRSC')
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

    const chainInfo = await getInfo(coinObj.system_id)
    if (chainInfo.error) throw new Error(chainInfo.error.message)

    const requestedCurrency = await getCurrency(
      coinObj.system_id,
      invoice.details.requestedcurrencyid,
    );
    if (requestedCurrency.error) {
      throw new Error(requestedCurrency.error.message);
    }

    validateVerusPayBurnChangePrice(
      invoice.details,
      requestedCurrency.result,
      coinObj.system_id,
    );

    const getDestinationDisplay = async () => {
      let destinationDisplay;

      if (invoice.details.acceptsAnyDestination()) {
        destinationDisplay = invoice.details.isBurnChangePrice()
          ? VERUSPAY_BURN_OWN_ADDRESS_DISPLAY
          : 'any destination';
      }
      else if (invoice.details.destination.isIAddr()) {
        const destinationId = await getIdentity(coinObj.system_id, invoice.details.destination.getAddressString())
        if (destinationId.error) throw new Error(destinationId.error.message)

        destinationDisplay = convertFqnToDisplayFormat(destinationId.result.fullyqualifiedname)
      } else destinationDisplay = invoice.details.destination.getAddressString()

      return destinationDisplay
    }

    const getAcceptedSystemsDefinitions = async () => {
      const acceptedSystems = {
        definitions: {},
        remainingSystems: []
      };

      let i = 0;

      if (!invoice.details.excludesVerusBlockchain()) {
        const rootSystemRes = await getCurrency(coinObj.system_id, coinObj.currency_id)
        if (rootSystemRes.error) throw new Error(rootSystemRes.error.message)
        acceptedSystems.definitions[rootSystemRes.result.currencyid] = rootSystemRes.result;
      }
      
      if (invoice.details.acceptsNonVerusSystems()) {
        for (; i < 10 && i < invoice.details.acceptedsystems.length; i++) {
          const systemId = invoice.details.acceptedsystems[i];

          const systemDefinitionRes = await getCurrency(coinObj.system_id, systemId)
          if (systemDefinitionRes.error) throw new Error(systemDefinitionRes.error.message)

          acceptedSystems.definitions[systemId] = systemDefinitionRes.result;
        }

        for (; i < invoice.details.acceptedsystems.length; i++) {
          acceptedSystems.remainingSystems.push(invoice.details.acceptedsystems[i])
        }
      }

      return acceptedSystems;
    }

    const validateExpiry = async () => {
      operation.assertActive();
      if (invoice.details.expires() && invoice.details.expiryheight.toNumber() - chainInfo.result.longestchain < 0) {
        const age = (invoice.details.expiryheight.toNumber() - chainInfo.result.longestchain) * -1
        createAlert(
          'Expired invoice',
          `This invoice is expired (expired for approx. ${blocksToTime(age)}).`,
        );
        cancel();
      }
    }

    if (invoice.isSigned()) {
      if (await verifyVerusPayInvoice(coinObj, invoice)) {
        const sig = await extractVerusPayInvoiceSig(coinObj, invoice)

        const sigblock = await getBlock(coinObj.system_id, sig.height)
       
        if (sigblock.error) throw new Error(sigblock.error.message)

        const sigtime = sigblock.result.time

        const signedBy = await getIdentity(coinObj.system_id, invoice.signing_id)
        if (signedBy.error) throw new Error(signedBy.error.message)

        await validateExpiry()
        showScreen(operation, VERUSPAY_INVOICE_INFO, {
          detailsBufferString: invoice.details.toBuffer().toString('hex'),
          invoiceVersion: invoice.version.toString(),
          isSigned: true,
          sigtime,
          signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname),
          signerSystemID: invoice.system_id,
          currencyDefinition: requestedCurrency.result,
          amountDisplay: invoice.details.acceptsAnyAmount() ? null : satsToCoins(BigNumber(invoice.details.amount)).toString(),
          destinationDisplay: await getDestinationDisplay(),
          acceptedSystemsDefinitions: await getAcceptedSystemsDefinitions(),
          coinObj,
          chainInfo: chainInfo.result
        })
      } else {
        operation.assertActive();
        createAlert(
          'Failed to verify',
          'Failed to verify invoice signature',
        );
        cancel();
      }
    } else {
      await validateExpiry()
      showScreen(operation, VERUSPAY_INVOICE_INFO, {
        detailsBufferString: invoice.details.toBuffer().toString('hex'),
        invoiceVersion: invoice.version.toString(),
        isSigned: false,
        currencyDefinition: requestedCurrency.result,
        amountDisplay: invoice.details.acceptsAnyAmount() ? null : satsToCoins(BigNumber(invoice.details.amount)).toString(),
        destinationDisplay: await getDestinationDisplay(),
        acceptedSystemsDefinitions: await getAcceptedSystemsDefinitions(),
        coinObj,
        chainInfo: chainInfo.result
      })
    }
  }

  const processLoginConsentRequest = async (operation) => {
    const request = new primitives.LoginConsentRequest(deeplinkData)

    if (request.challenge.context != null) {
      if (Object.keys(request.challenge.context.kv).length !== 0) {
        throw new Error("Login requests with context are currently unsupported.")
      }
    }

    const coinObj = CoinDirectory.findCoinObj(request.system_id, null, true)
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

    if (await verifyLoginConsentRequest(coinObj, request)) {
      for (const requestedPermission of request.challenge
        .requested_access) {
        if (
          !authorizedPermissions.includes(requestedPermission.vdxfkey)
        ) {
          throw new Error(
            'Unrecognized requested permission ' +
              requestedPermission.vdxfkey,
          );
        }
      }

      if (request.challenge.requested_access.length == 0) {
        throw new Error(
          'No permissions being requested in loginconsent request.',
        );
      }

      const sig = await extractLoginConsentSig(coinObj, request)

      const sigblock = await getBlock(coinObj.system_id, sig.height)
     
      if (sigblock.error) throw new Error(sigblock.error.message)

      const sigtime = sigblock.result.time

      const signedBy = await getIdentity(coinObj.system_id, request.signing_id)

      if (signedBy.error) throw new Error(signedBy.error.message)

      showScreen(operation, LOGIN_CONSENT_INFO, {
        deeplinkData,
        sigtime,
        signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname)
      })
    } else {
      operation.assertActive();
      createAlert(
        'Failed to verify',
        'Failed to verify request signature',
      );
      cancel();
    }
  }

  const processDeeplink = async () => {
    endOperation();
    if (deeplinkId == null) {
      props.navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{name: store.getState().authentication.signedIn ? 'SignedInStack' : 'SignedOutStack'}],
      }));
      return;
    }
    const operation = {
      isActive: () => mounted.current && currentSource.current === source && currentOperation.current === operation,
      assertActive: () => {
        if (!operation.isActive()) throw Object.assign(new Error('Deeplink request was canceled or replaced.'), {code: 'SESSION_CHANGED'});
      },
    };
    currentOperation.current = operation;
    try {
      switch (deeplinkId) {
        case primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid:
          await processVerusPayInvoice(operation);
          break;
        case primitives.GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid:
          await processGenericRequest(operation);
          break;
        case primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid:
          await processLoginConsentRequest(operation);
          break;
        default:
          createAlert('Unsupported', 'Unsupported request');
          cancel();
          break;
      }
    } catch (e) {
      if (!operation.isActive()) return;
      console.error(e)

      createAlert('Error', e.message);
      cancel();
    }
  };

  useEffect(() => {
    mounted.current = true;
    setDisplayKey(null);
    setDisplayProps({});
    setLoading(false);
    setWaitingForSignin(false);
    setAuthModalOpened(false);
    authSource.current = null;
    processDeeplink()
    return () => {
      mounted.current = false;
      endOperation();
      const current = store.getState().deeplink;
      if (current.id != null && current.requestId === source.requestId) {
        dispatch(resetDeeplinkData(source.requestId));
      }
    };
  }, [source])

  useEffect(() => {
    if (signedIn && waitingForSignin && authSource.current === source) {
      setWaitingForSignin(false);
      setAuthModalOpened(false);
      processDeeplink();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    if (
      waitingForSignin &&
      authSource.current === source &&
      !authModalOpened &&
      sendModalVisible &&
      sendModalType === AUTHENTICATE_USER_SEND_MODAL
    ) {
      setAuthModalOpened(true);
    }
  }, [waitingForSignin, authModalOpened, sendModalVisible, sendModalType]);

  useEffect(() => {
    if (authModalOpened && !hasAuthenticatedSession && waitingForSignin && authSource.current === source) {
      const authModalClosed =
        !alertActive &&
        (
          sendModalType !== AUTHENTICATE_USER_SEND_MODAL ||
          !sendModalVisible
        );

      if (authModalClosed) {
        setWaitingForSignin(false);
        setAuthModalOpened(false);
        createAlert('Error', 'You must be signed in to verify this deeplink request.');
        cancel();
      }
    }
  }, [
    alertActive,
    authModalOpened,
    hasAuthenticatedSession,
    waitingForSignin,
    sendModalVisible,
    sendModalType,
  ]);

  const screens = {
    [LOGIN_CONSENT_INFO]: () => (
      <LoginRequestInfo
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    ),
    [VERUSPAY_INVOICE_INFO]: () => (
      <InvoiceInfo
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    ),
    [GENERIC_REQUEST]: () => (
      <GenericRequestHome
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    )
  };
  
  return (
    <View style={Styles.flexBackground}>
      {displayKey == null || loading || displayedSource.current !== source ? <AnimatedActivityIndicatorBox /> : screens[displayKey]()}
    </View>
  );
};

export default DeepLink;
