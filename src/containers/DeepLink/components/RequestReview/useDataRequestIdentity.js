import {useEffect, useMemo, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {requestServiceStoredData} from '../../../../utils/auth/authBox';
import {VERUSID_SERVICE_ID} from '../../../../utils/constants/services';
import {accountIsTestnet} from '../../../../utils/account/accountNetwork';
import {getGenericResponseSigner} from '../../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../../actions/actionDispatchers';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';

// Shared only by the credential and Data Packet reviews. Tag asynchronous reads
// with their wallet context so a previous wallet's identities never become usable.
export default function useDataRequestIdentity({
  request,
  response,
  signerSystemID,
  requestedSignerID,
}) {
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sessionEpoch = useSelector(state => state.authentication.sessionEpoch);
  const account = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
  );
  const requestIsTestnet = request?.isTestnet() === true;
  const coinObj = CoinDirectory.getBasicCoinObj(signerSystemID);
  const chainId = coinObj?.id;
  const walletReady = !!(
    signedIn &&
    account &&
    accountIsTestnet(account) === requestIsTestnet
  );
  const walletKey = walletReady ? account.accountHash || account.id : null;
  const [reload, setReload] = useState(0);
  const context = useMemo(
    () => ({}),
    [
      walletKey,
      walletReady,
      sessionEpoch,
      encryptedIds,
      chainId,
      reload,
      request,
    ],
  );
  const [lookup, setLookup] = useState({
    context: null,
    status: 'loading',
    linkedIds: {},
  });
  const [selection, setSelection] = useState(null);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const unlockFlight = useRef(false);
  const responseSigner = getGenericResponseSigner(response);
  const requiredIdentity = requestedSignerID || responseSigner?.identityID;
  const signerConflict = !!(
    responseSigner &&
    (responseSigner.systemID !== signerSystemID ||
      (requestedSignerID && requestedSignerID !== responseSigner.identityID))
  );

  useEffect(() => {
    let cancelled = false;
    if (!walletReady) return undefined;
    setLookup({context, status: 'loading', linkedIds: {}});
    requestServiceStoredData(VERUSID_SERVICE_ID)
      .then(data => {
        if (!cancelled)
          setLookup({
            context,
            status: 'ready',
            linkedIds: data.linked_ids || {},
          });
      })
      .catch(() => {
        if (!cancelled) setLookup({context, status: 'error', linkedIds: {}});
      });
    return () => {
      cancelled = true;
    };
  }, [context, walletReady]);

  const lookupStatus = !walletReady
    ? 'locked'
    : lookup.context !== context
    ? 'loading'
    : lookup.status;
  const linkedIds = lookupStatus === 'ready' ? lookup.linkedIds : {};
  const chainIds = linkedIds[chainId] || {};
  const isIdentityAllowed = (candidateChain, address) =>
    !signerConflict &&
    candidateChain === chainId &&
    (!requiredIdentity || requiredIdentity === address);
  const allowedAddresses = Object.keys(chainIds).filter(address =>
    isIdentityAllowed(chainId, address),
  );
  const selectedAddress =
    selection?.context === context &&
    allowedAddresses.includes(selection.address)
      ? selection.address
      : allowedAddresses[0];
  const selectedIdentity = selectedAddress
    ? {
        chainId,
        iAddress: selectedAddress,
        friendlyName: chainIds[selectedAddress] || selectedAddress,
      }
    : null;
  const sortedIds = {
    [chainId]: Object.keys(chainIds).sort((a, b) =>
      String(chainIds[a] || '').localeCompare(String(chainIds[b] || '')),
    ),
  };
  const requiredSignerUnavailable =
    lookupStatus === 'ready' && !!requiredIdentity && !selectedIdentity;
  const matches = (accounts || []).filter(
    item => accountIsTestnet(item) === requestIsTestnet,
  );
  // No wallet on this device can answer the request. The review disables the
  // wallet action and says why.
  const noRequestNetworkWallet = !walletReady && matches.length === 0;

  const unlock = async () => {
    if (unlockFlight.current) return;
    if (!matches.length) return;
    unlockFlight.current = true;
    setUnlocking(true);
    try {
      await requestWalletUnlock({
        reason: 'data-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Data request',
        accountHashes: matches.map(item => item.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
    } catch (error) {
      if (error?.code !== WALLET_UNLOCK_CANCELLED)
        createAlert('Unable to unlock', 'Try unlocking your wallet again.');
    } finally {
      unlockFlight.current = false;
      setUnlocking(false);
    }
  };

  return {
    walletReady,
    walletKey,
    sessionScope: {
      sessionScoped: true,
      accountHash: account?.accountHash || null,
      sessionEpoch: sessionEpoch || 0,
    },
    context,
    signedIn,
    noRequestNetworkWallet,
    lookupStatus,
    selectedIdentity,
    chainId,
    coinObj,
    linkedIds,
    sortedIds,
    isIdentityAllowed,
    requiredSignerUnavailable,
    signerConflict,
    requiredIdentity,
    identitySheetVisible,
    setIdentitySheetVisible,
    unlocking,
    unlock,
    retry: () => setReload(value => value + 1),
    selectIdentity: (candidateChain, address) => {
      if (
        !Object.prototype.hasOwnProperty.call(chainIds, address) ||
        !isIdentityAllowed(candidateChain, address)
      )
        return;
      setSelection({context, address});
      setIdentitySheetVisible(false);
    },
  };
}
