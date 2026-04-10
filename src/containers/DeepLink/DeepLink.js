import { CommonActions } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
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
import { GENERIC_REQUEST, IDENTITY_UPDATE_REQUEST_INFO, LOGIN_CONSENT_INFO, VERUSPAY_INVOICE_INFO } from '../../utils/constants/deeplink';
import LoginRequestInfo from './LoginRequestInfo/LoginRequestInfo';
import { getCurrency, getFriendlyNameMap, getIdentity } from '../../utils/api/channels/verusid/callCreators';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';
import { resetDeeplinkData } from '../../actions/actionCreators';

const authorizedPermissions = [primitives.IDENTITY_VIEW.vdxfid,/*TODO: primitives.IDENTITY_AGREEMENT.vdxfid, primitives.ATTESTATION_READ_REQUEST.vdxfid */]
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import BigNumber from 'bignumber.js';
import { blocksToTime, satsToCoins } from '../../utils/math';
import InvoiceInfo from './InvoiceInfo/InvoiceInfo';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { verifyIdentityUpdateRequest } from '../../utils/api/channels/vrpc/requests/verifyIdentityUpdateRequest';
import { extractIdentityUpdateRequestSig } from '../../utils/api/channels/vrpc/requests/extractIdentityUpdateRequestSig';
import { APP_ENCRYPTION_REQUEST_VDXF_KEY, DATA_PACKET_REQUEST_VDXF_KEY, DATA_TYPE_DEFINEDKEY, DefinedKey, IDENTITY_UPDATE_REQUEST_VDXF_KEY, nameAndParentAddrToIAddr, USER_DATA_REQUEST_VDXF_KEY } from 'verus-typescript-primitives';
import IdentityUpdateRequestInfo from './IdentityUpdateRequestInfo/IdentityUpdateRequestInfo';
import { getIdentityContent } from '../../utils/api/channels/verusid/requests/getIdentityContent';
import { capitalizeString } from '../../utils/stringUtils';
import { createUpdateIdentityTx, getUpdatableIdentity } from '../../utils/api/channels/verusid/requests/updateIdentity';
import { validateGenericRequest } from '../../utils/deeplink/validator/envelopeValidator';
import GenericRequestHome from './GenericRequestHome/GenericRequestHome';
import { openAuthenticateUserModal } from '../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../utils/constants/sendModal';
import store from '../../store';
import { selectHasAuthenticatedSession } from '../../selectors/authentication';

const DeepLink = (props) => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkData = useObjectSelector((state) => state.deeplink.data)

  const signedIn = useSelector((state) => state.authentication.signedIn)
  const hasAuthenticatedSession = useSelector(selectHasAuthenticatedSession)
  const alertActive = useSelector(state => state.alert.active);
  const sendModalVisible = useSelector(state => state.sendModal.visible);
  const sendModalType = useSelector(state => state.sendModal.type);
  const accounts = useObjectSelector(state => state.authentication.accounts)
  const [displayKey, setDisplayKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayProps, setDisplayProps] = useState({})
  const [waitingForSignin, setWaitingForSignin] = useState(false)
  const [authModalOpened, setAuthModalOpened] = useState(false)
  const dispatch = useDispatch()

  const cancel = () => {
    let resetAction

    if (signedIn) {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedInStack'}],
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

  const processGenericRequest = async () => {
    const request = new primitives.GenericRequest();
    request.fromBuffer(Buffer.from(deeplinkData, 'hex'));

    const requiresDelegatedUserCheck =
      request.isSigned() &&
      request.hasAppOrDelegatedID() &&
      request.appOrDelegatedID.toAddress() !== request.signature.identityID.toAddress();
    
    const experimentalRequestsAllowed = store.getState().settings.generalWalletSettings.enableExperimentalGenericRequests === true;

    if (!experimentalRequestsAllowed) {
      const hasExperimentalRequest = request.details.some(detail =>
        detail.getIAddressKey() === IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid || 
        detail.getIAddressKey() === APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid ||
        detail.getIAddressKey() === DATA_PACKET_REQUEST_VDXF_KEY.vdxfid ||
        detail.getIAddressKey() === USER_DATA_REQUEST_VDXF_KEY.vdxfid ||
        detail.getIAddressKey() === DATA_PACKET_REQUEST_VDXF_KEY.vdxfid
      );

      if (hasExperimentalRequest) {
        throw new Error("This type of request is currently experimental and disabled in your general wallet settings.");
      }
    }

    if (requiresDelegatedUserCheck && !signedIn) {
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
        setTimeout(() => {
          openAuthenticateUserModal(data);
        }, 1000)
        return;
      }

      createAlert(
        "Cannot continue",
        `No ${request.isTestnet() ? 'testnet' : 'mainnet'} profiles found, cannot verify delegated request signer.`,
      );
      cancel();
      return;
    }

    await validateGenericRequest(request);

    setDisplayProps({
      deeplinkData
    })
    setDisplayKey(GENERIC_REQUEST)
  }

  const processVerusPayInvoice = async () => {
    const invoice = primitives.VerusPayInvoice.fromJson(deeplinkData)

    if (!invoice.details.acceptsNonVerusSystems() && invoice.details.excludesVerusBlockchain()) {
      throw new Error("This invoice accepts no systems to pay on, and is therefore unpayable.")
    }

    const coinObj = CoinDirectory.getBasicCoinObj(invoice.details.isTestnet() ? 'VRSCTEST' : 'VRSC')
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

    const chainInfo = await getInfo(coinObj.system_id)
    if (chainInfo.error) throw new Error(chainInfo.error.message)

    const getDestinationDisplay = async () => {
      let destinationDisplay;

      if (invoice.details.acceptsAnyDestination()) destinationDisplay = 'any destination'
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

        const requestedCurrency = await getCurrency(coinObj.system_id, invoice.details.requestedcurrencyid)
        if (requestedCurrency.error) throw new Error(requestedCurrency.error.message)

        await validateExpiry()
        setDisplayProps({
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
        setDisplayKey(VERUSPAY_INVOICE_INFO)
      } else {
        createAlert(
          'Failed to verify',
          'Failed to verify invoice signature',
        );
        cancel();
      }
    } else {
      const requestedCurrency = await getCurrency(coinObj.system_id, invoice.details.requestedcurrencyid)
      if (requestedCurrency.error) throw new Error(requestedCurrency.error.message)

      await validateExpiry()
      setDisplayProps({
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
      setDisplayKey(VERUSPAY_INVOICE_INFO)
    }
  }

  const processIdentityUpdateRequest = async () => {
    const req = primitives.IdentityUpdateRequest.fromJson(deeplinkData);

    if (!req.isValidVersion() || !req.details.identity) {
      throw new Error("Invalid identity update request.");
    }

    const requestSystem = req.details.systemid ? req.details.systemid.toAddress() : (req.details.isTestnet() ? 'VRSCTEST' : 'VRSC');

    const coinObj = CoinDirectory.getBasicCoinObj(requestSystem);
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

    const chainInfo = await getInfo(coinObj.system_id);
    if (chainInfo.error) throw new Error(chainInfo.error.message);

    const identityAddress = nameAndParentAddrToIAddr(
      req.details.identity.name, 
      req.details.identity.containsParent() ? req.details.identity.parent.toAddress() : coinObj.system_id
    );

    const subjectIdentityRes = await getIdentity(coinObj.system_id, identityAddress);
    if (subjectIdentityRes.error) throw new Error(subjectIdentityRes.error.message);

    const subjectIdentity = subjectIdentityRes.result;
    const updatableIdentity = await getUpdatableIdentity(coinObj.system_id, subjectIdentity);

    const subjectIdClass = updatableIdentity.identity;
    const subjectIdTxHex = updatableIdentity.tx;

    if (deeplinkData.details.identity.flags) {
      if (subjectIdClass.hasActiveCurrency() !== req.details.identity.hasActiveCurrency()) {
        throw new Error("Cannot change active currency status.");
      }
  
      if (subjectIdClass.hasTokenizedIdControl() !== req.details.identity.hasTokenizedIdControl()) {
        throw new Error("Cannot change tokenized id control status.");
      }
    }

    let friendlyNames;

    try {
      const initAddresses = [];

      if (req.details.identity.containsRevocation()) {
        initAddresses.push(req.details.identity.revocationAuthority.toAddress());
      }

      if (req.details.identity.containsRecovery()) {
        initAddresses.push(req.details.identity.recoveryAuthority.toAddress());
      }

      friendlyNames = await getFriendlyNameMap(coinObj.system_id, subjectIdentity, initAddresses);
    } catch (e) {
      friendlyNames = {
        ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
        ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        [subjectIdentity.identity.identityaddress]: subjectIdentity.fullyqualifiedname
      };
    }

    const validateExpiry = async () => {
      if (req.details.expires() && req.details.expiryheight.toNumber() - chainInfo.result.longestchain < 0) {
        const age = (req.details.expiryheight.toNumber() - chainInfo.result.longestchain) * -1;
        createAlert(
          'Expired invoice',
          `This invoice is expired (expired for approx. ${blocksToTime(age, coinObj.seconds_per_block)}).`,
        );
        cancel();
      }
    }

    let cmmDataKeys = {};

    const updateIdentityTx = await createUpdateIdentityTx(
      req.systemid.toAddress(), 
      req.details,
      subjectIdClass.getIdentityAddress(),
      subjectIdTxHex,
      subjectIdentity.blockheight,
      false,
      undefined,
      req.isTestnet()
    );

    if (req.isSigned()) {
      if (await verifyIdentityUpdateRequest(coinObj, req)) {
        const sig = await extractIdentityUpdateRequestSig(coinObj, req);
        const sigblock = await getBlock(coinObj.system_id, sig.height);
       
        if (sigblock.error) throw new Error(sigblock.error.message);

        const sigtime = sigblock.result.time;

        const signingIAddr = req.signingid.toAddress();

        const signedBy = await getIdentity(coinObj.system_id, signingIAddr);
        if (signedBy.error) throw new Error(signedBy.error.message);

        try {
          const contentRes = await getIdentityContent(
            coinObj.system_id,
            signingIAddr
          );

          if (contentRes.error) throw new Error(contentRes.error.message);
          else {
            const signerIdentity = contentRes.result.identity;

            if (signerIdentity.contentmultimap && signerIdentity.contentmultimap[DATA_TYPE_DEFINEDKEY.vdxfid]) {
              const definedKeyContent = signerIdentity.contentmultimap[DATA_TYPE_DEFINEDKEY.vdxfid];

              let definedKeyBufs = [];

              if (Array.isArray(definedKeyContent)) definedKeyBufs = definedKeyContent
              else definedKeyBufs = [definedKeyContent]

              for (const definedKeyHex of definedKeyBufs) {
                try {
                  const definedKey = new DefinedKey();
                  definedKey.fromBuffer(Buffer.from(definedKeyHex, 'hex'));

                  const iAddr = definedKey.getIAddr();
                  const ns = definedKey.getNameSpaceID();

                  if (ns !== signerIdentity.identityaddress) {
                    throw new Error(`Found defined key ${definedKey.vdxfuri} with namespace ${ns} not matching signer ID.`);
                  } else {
                    const splitUri = definedKey.vdxfuri.split("::");
                    const label = splitUri.length > 1 ? splitUri[1] : splitUri[0]

                    cmmDataKeys[iAddr] = {
                      vdxfuri: definedKey.vdxfuri,
                      nsid: ns,
                      label: capitalizeString(label.split('.').join(' ')),
                    }
                  }
                } catch(e) {
                  console.warn(e);
                }
              }
            }
          }
        } catch (e) {
          console.warn(e);
        }

        await validateExpiry();
        setDisplayProps({
          detailsBufferString: req.details.toBuffer().toString('hex'),
          sigtime,
          signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname),
          signerSystemID: coinObj.system_id,
          signerSystemName: coinObj.id,
          signerIdentityID: signingIAddr,
          subjectIdentity,
          identityUpdates: updateIdentityTx.identity.toJson(),
          updateIdTxHex: updateIdentityTx.hex,
          coinObj,
          chainInfo: chainInfo.result,
          friendlyNames,
          cmmDataKeys,
          subjectIdTxHex,
        })
        setDisplayKey(IDENTITY_UPDATE_REQUEST_INFO);
      } else {
        createAlert(
          'Failed to verify',
          'Failed to verify identity update request signature',
        );
        cancel();
      }
    } else {
      throw new Error("Unsigned identity update requests not currently supported.")
      // await validateExpiry();
      // setDisplayProps({
      //   deeplinkData,
      //   subjectIdentity,
      //   identityUpdates: updateIdentityTx.identity.toJson(),
      //   updateIdTxHex: updateIdentityTx.hex,
      //   coinObj,
      //   chainInfo: chainInfo.result,
      //   friendlyNames,
      //   cmmDataKeys,
      //   subjectIdTxHex
      // })
      // setDisplayKey(IDENTITY_UPDATE_REQUEST_INFO);
    }
  }

  const processLoginConsentRequest = async () => {
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

      setDisplayProps({
        deeplinkData,
        sigtime,
        signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname)
      })
      setDisplayKey(LOGIN_CONSENT_INFO)
    } else {
      createAlert(
        'Failed to verify',
        'Failed to verify request signature',
      );
      cancel();
    }
  }

  const processDeeplink = async () => {
    try {
      switch (deeplinkId) {
        case primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid:
          await processVerusPayInvoice();
          break;
        case primitives.GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid:
          await processGenericRequest();
          break;
        case primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid:
          await processLoginConsentRequest();
          break;
        case primitives.IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid:
          await processIdentityUpdateRequest();
          break;
        default:
          createAlert('Unsupported', 'Unsupported request');
          cancel();
          break;
      }
    } catch (e) {
      console.error(e)

      createAlert('Error', e.message);
      cancel();
    }
  };

  useEffect(() => {
    processDeeplink()
  }, [])

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      setWaitingForSignin(false);
      setAuthModalOpened(false);
      processDeeplink();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    if (
      waitingForSignin &&
      !authModalOpened &&
      sendModalVisible &&
      sendModalType === AUTHENTICATE_USER_SEND_MODAL
    ) {
      setAuthModalOpened(true);
    }
  }, [waitingForSignin, authModalOpened, sendModalVisible, sendModalType]);

  useEffect(() => {
    if (authModalOpened && !hasAuthenticatedSession && waitingForSignin) {
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
    [IDENTITY_UPDATE_REQUEST_INFO]: () => (
      <IdentityUpdateRequestInfo
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
      {displayKey == null || loading ? <AnimatedActivityIndicatorBox /> : screens[displayKey]()}
    </View>
  );
};

export default DeepLink;
