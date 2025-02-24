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
import { IDENTITY_UPDATE_REQUEST_INFO, LOGIN_CONSENT_INFO, VERUSPAY_INVOICE_INFO } from '../../utils/constants/deeplink';
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
import { nameAndParentAddrToIAddr } from 'verus-typescript-primitives';
import IdentityUpdateRequestInfo from './IdentityUpdateRequestInfo/IdentityUpdateRequestInfo';

const DeepLink = (props) => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkData = useObjectSelector((state) => state.deeplink.data)

  const signedIn = useSelector((state) => state.authentication.signedIn)
  const [displayKey, setDisplayKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayProps, setDisplayProps] = useState({})
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
          deeplinkData,
          sigtime,
          signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname),
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
        deeplinkData,
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

    let friendlyNames;

    try {
      const initAddresses = [];

      if (req.details.identity.containsRevocation()) {
        initAddresses.push(req.details.identity.revocation_authority.toAddress());
      }

      if (req.details.identity.containsRecovery()) {
        initAddresses.push(req.details.identity.recovery_authority.toAddress());
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
          `This invoice is expired (expired for approx. ${blocksToTime(age)}).`,
        );
        cancel();
      }
    }

    if (req.isSigned()) {
      if (await verifyIdentityUpdateRequest(coinObj, req)) {
        const sig = await extractIdentityUpdateRequestSig(coinObj, deeplinkData);
        const sigblock = await getBlock(coinObj.system_id, sig.height);
       
        if (sigblock.error) throw new Error(sigblock.error.message);

        const sigtime = sigblock.result.time;

        const signedBy = await getIdentity(coinObj.system_id, req.signingid);
        if (signedBy.error) throw new Error(signedBy.error.message);

        await validateExpiry();
        setDisplayProps({
          deeplinkData,
          sigtime,
          signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname),
          subjectIdentity,
          identityUpdates: req.details.toCLIJson(),
          coinObj,
          chainInfo: chainInfo.result,
          friendlyNames
        })
        setDisplayKey(IDENTITY_UPDATE_REQUEST_INFO);
      } else {
        createAlert(
          'Failed to verify',
          'Failed to verify invoice signature',
        );
        cancel();
      }
    } else {
      await validateExpiry();
      setDisplayProps({
        deeplinkData,
        subjectIdentity,
        identityUpdates: req.details.toCLIJson(),
        coinObj,
        chainInfo: chainInfo.result,
        friendlyNames
      })
      setDisplayKey(IDENTITY_UPDATE_REQUEST_INFO);
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
    )
  };
  
  return (
    <View style={Styles.flexBackground}>
      {displayKey == null || loading ? <AnimatedActivityIndicatorBox /> : screens[displayKey]()}
    </View>
  );
};

export default DeepLink;
