import {captureIdentityUpdateContext, assertIdentityUpdateContext, validateIdentityUpdateContext} from '../../../../utils/identityUpdate/verifiedSubmission';
import {satsToCoins} from '../../../../utils/math';
import BigNumber from 'bignumber.js';
import store from '../../../../store';
import {showFundRawTransactionErrorAlert} from '../../../../utils/vrpc/fundRawTransactionError';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {Keyboard} from 'react-native';
import {SaplingPaymentAddress} from 'verus-typescript-primitives';
import {
  I_ADDRESS_VERSION,
  R_ADDRESS_VERSION,
} from '../../../../utils/constants/constants';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
  SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
  SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD,
  SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
  SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
  SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS,
  SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {RecoverIdentityFormRender} from './RecoverIdentityForm.render';
import {createRecoverIdentityTx} from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {decryptkey} from '../../../../utils/seedCrypt';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import useAuthorityIdentityDiscovery from '../../../../containers/RevokeRecover/useAuthorityIdentityDiscovery';

const SAFE_RECOVERY_ERRORS = new Set([
  'This VerusID could not be found on the selected blockchain.',
  'Cannot recover VerusID that is not revoked.',
  'The recovery authority could not be verified on this blockchain.',
  'Recovery identity is not active, and therefore unable to sign transactions.',
  'Recovery identity has minimum signatures > 1. Please recover through CLI or Verus Desktop.',
  'The imported secret or key does not control this VerusID’s recovery authority.',
]);

const getSafeRecoveryError = (error, networkName) => {
  if (error?.message === 'Unable to decrypt recovery secret') {
    return 'The imported authority key could not be read. Go back and import it again.';
  }

  if (SAFE_RECOVERY_ERRORS.has(error?.message)) return error.message;

  if (
    error?.message === "Couldn't fund raw transaction" ||
    error?.message === 'Insufficient funds in UTXOs provided'
  ) {
    return `The authority address needs enough ${networkName} to pay the network fee before this VerusID can be recovered.`;
  }

  return 'The VerusID could not be prepared for recovery. Check the identity, addresses, blockchain, and connection, then try again.';
};

const RecoverIdentityForm = props => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const encryptedIdentitySeed =
    sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
  const systemId = sendModal.data[SEND_MODAL_SYSTEM_ID];
  const [networkName, setNetworkName] = useState(systemId);
  const [formError, setFormError] = useState(null);
  const initialIdentity =
    sendModal.data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD]?.trim() || '';
  const [shouldAutoOpenIdentitySheet] = useState(() => !initialIdentity);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const identitySheetVisibleRef = useRef(false);
  const [manualEntry, setManualEntry] = useState(Boolean(initialIdentity));
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [manualIdentity, setManualIdentity] = useState(null);
  const [editSheet, setEditSheet] = useState(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [editOptions, setEditOptions] = useState({});
  const [draft, setDraft] = useState({});
  const [editError, setEditError] = useState(null);
  const editSheetRef = useRef(null);
  const scannerOpenRef = useRef(false);
  editSheetRef.current = editSheetVisible;
  const currentIdentity =
    selectedCandidate?.identity || manualIdentity?.identity;
  const identityDiscovery = useAuthorityIdentityDiscovery({
    active: !manualEntry,
    encryptedSeed: encryptedIdentitySeed,
    instanceKey,
    isRecovery: true,
    systemId,
  });

  identitySheetVisibleRef.current = identitySheetVisible;

  useEffect(() => {
    const handleRequestClose = () => {
      if (scannerOpenRef.current) {
        setScannerOpen(false);
        return true;
      }
      if (editSheetRef.current) {
        Keyboard.dismiss();
        setEditSheetVisible(false);
        return true;
      }
      if (!identitySheetVisibleRef.current) return false;

      setIdentitySheetVisible(false);
      return true;
    };

    props.setIdentitySafetyRequestCloseHandler(handleRequestClose);

    return () => props.setIdentitySafetyRequestCloseHandler(null);
  }, [props.setIdentitySafetyRequestCloseHandler]);

  const [scannerOpen, setScannerOpen] = useState(false);
  scannerOpenRef.current = scannerOpen;

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(systemId);
      setNetworkName(systemObj.display_name);
    } catch (e) {}
  }, [systemId]);

  useEffect(() => {
    if (!manualEntry || !initialIdentity) {
      setManualIdentity(null);
      return undefined;
    }
    let active = true;
    setManualIdentity(null);
    const timeout = setTimeout(async () => {
      try {
        const response = await getIdentity(systemId, initialIdentity);
        if (active && !response.error) setManualIdentity(response.result);
      } catch (_) {
        /* The existing review validation reports lookup failures. */
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [initialIdentity, manualEntry, systemId]);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      return 'Enter the revoked VerusID you want to recover.';
    }

    try {
      fromBase58Check(identity);
    } catch (e) {
      if (!identity.endsWith('@')) {
        return 'Enter a VerusID name ending in @ or a valid i-address.';
      }
    }

    return null;
  }, [sendModal]);

  const getPotentialPrimaryAddresses = useCallback(async () => {
    const seed = decryptkey(instanceKey, encryptedIdentitySeed);

    if (!seed) throw new Error('Unable to decrypt recovery secret');

    const system = CoinDirectory.findSystemCoinObj(systemId);
    const keyObj = await deriveKeyPair(seed, system, ELECTRUM);
    const {addresses} = keyObj;

    return addresses;
  }, [encryptedIdentitySeed, instanceKey, systemId]);

  const clearChanges = useCallback(() => {
    [
      SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
      SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
      SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD,
      SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
    ].forEach(field => props.updateSendFormData(field, ''));
    props.updateSendFormData(SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS, false);
    props.updateSendFormData(
      SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
      false,
    );
  }, [props.updateSendFormData]);

  const chooseCandidate = useCallback(
    candidate => {
      if (initialIdentity && initialIdentity !== candidate.identityAddress)
        clearChanges();
      setFormError(null);
      setSelectedCandidate(candidate);
      setManualEntry(false);
      props.updateSendFormData(
        SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
        candidate.identityAddress,
      );
      setIdentitySheetVisible(false);
    },
    [props.updateSendFormData, initialIdentity, clearChanges],
  );

  const chooseManualEntry = useCallback(() => {
    setFormError(null);
    setSelectedCandidate(null);
    setManualEntry(true);
    setIdentitySheetVisible(false);
  }, []);

  const openIdentitySheet = useCallback(() => {
    setManualEntry(false);
    setIdentitySheetVisible(true);
  }, []);

  useEffect(() => {
    if (!shouldAutoOpenIdentitySheet || manualEntry || selectedCandidate)
      return;

    const {candidates, status} = identityDiscovery;

    if (status === 'ready' && candidates.length === 1) {
      chooseCandidate(candidates[0]);
      return;
    }

    if (
      (status === 'ready' && candidates.length > 1) ||
      status === 'error' ||
      status === 'unsupported'
    ) {
      setIdentitySheetVisible(true);
    }
  }, [
    chooseCandidate,
    identityDiscovery.candidates,
    identityDiscovery.status,
    manualEntry,
    selectedCandidate,
    shouldAutoOpenIdentitySheet,
  ]);

  const updateIdentity = text => {
    if (text.trim() !== initialIdentity) clearChanges();
    setManualIdentity(null);
    setFormError(null);
    setSelectedCandidate(null);
    props.updateSendFormData(SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, text);
  };

  const handleScan = codes => {
    const result = codes[0] ? codes[0].value : null;
    setScannerOpen(false);

    if (result != null && typeof result === 'string' && result.length <= 5000) {
      setDraft(value => ({...value, address: result}));
    } else {
      setEditError('The QR code does not contain a usable address.');
    }
  };

  const toggleScanner = () => {
    if (scannerOpen) {
      setScannerOpen(false);
    } else {
      Keyboard.dismiss();
      setScannerOpen(true);
    }
  };

  const openEditSheet = type => {
    const data = sendModal.data;
    const changedAuthorities =
      data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY];
    if (type === 'authorities') {
      setDraft({
        recovery: changedAuthorities
          ? data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD] || ''
          : currentIdentity?.recoveryauthority || '',
        revocation: changedAuthorities
          ? data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD] || ''
          : currentIdentity?.revocationauthority || '',
      });
    } else if (type === 'primary') {
      setDraft({
        address: data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD] || '',
      });
    } else {
      setDraft({
        address: data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS]
          ? data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD] || ''
          : currentIdentity?.privateaddress || '',
      });
    }
    setEditError(null);
    setEditOptions({
      canReset:
        type === 'primary'
          ? !!data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD]
          : type === 'authorities'
          ? !!changedAuthorities
          : !!data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS],
      hasZAddress: !!(
        currentIdentity?.privateaddress ||
        (data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] &&
          data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD])
      ),
    });
    setEditSheet(type);
    setEditSheetVisible(true);
  };

  const saveEdit = async (reset = false) => {
    const update = props.updateSendFormData;
    const address = draft.address?.trim() || '';
    const recovery = draft.recovery?.trim() || '';
    const revocation = draft.revocation?.trim() || '';
    const validAddress = (value, version) => {
      try {
        return fromBase58Check(value).version === version;
      } catch (_) {
        return false;
      }
    };
    if (!reset) {
      if (
        editSheet === 'primary' &&
        !validAddress(address, R_ADDRESS_VERSION)
      ) {
        setEditError('Enter a valid primary R-address.');
        return;
      }
      if (
        editSheet === 'authorities' &&
        [recovery, revocation].some(
          value =>
            value &&
            !(value.length > 1 && value.endsWith('@')) &&
            !validAddress(value, I_ADDRESS_VERSION),
        )
      ) {
        setEditError('Enter a VerusID name ending in @ or a valid i-address.');
        return;
      }
      if (editSheet === 'zAddress') {
        try {
          SaplingPaymentAddress.fromAddressString(address);
        } catch (_) {
          setEditError('Enter a valid Z-address.');
          return;
        }
      }
    }
    if (editSheet === 'primary') {
      await update(
        SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
        reset ||
          (currentIdentity?.primaryaddresses?.length === 1 &&
            address === currentIdentity.primaryaddresses[0])
          ? ''
          : address,
      );
    } else if (editSheet === 'authorities') {
      const nextRecovery =
        reset || recovery === currentIdentity?.recoveryauthority
          ? ''
          : recovery;
      const nextRevocation =
        reset || revocation === currentIdentity?.revocationauthority
          ? ''
          : revocation;
      await update(SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD, nextRecovery);
      await update(SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD, nextRevocation);
      await update(
        SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
        !!(nextRecovery || nextRevocation),
      );
    } else {
      const nextAddress =
        reset || address === currentIdentity?.privateaddress ? '' : address;
      await update(SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD, nextAddress);
      await update(SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS, !!nextAddress);
    }
    Keyboard.dismiss();
    setEditSheetVisible(false);
    setFormError(null);
  };

  const submitData = useCallback(async () => {
    const validationError = formHasError();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    props.setLoading(true);

    const {data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD];

    let ownedAddress = '';
    let recoverableByUser = false;

    let updateContext;
    try {
      updateContext = captureIdentityUpdateContext({
        systemId: data[SEND_MODAL_SYSTEM_ID], modalRequestId: sendModal.requestId, allowSignedOut: true,
      });
      const tarRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], identity);
      assertIdentityUpdateContext(updateContext);
      if (tarRes.error) {
        throw new Error(
          'This VerusID could not be found on the selected blockchain.',
        );
      }

      if (tarRes.result.status !== 'revoked') {
        throw new Error('Cannot recover VerusID that is not revoked.');
      }

      const recovery = tarRes.result.identity.recoveryauthority;

      const recRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], recovery);
      assertIdentityUpdateContext(updateContext);
      if (recRes.error) {
        throw new Error(
          'The recovery authority could not be verified on this blockchain.',
        );
      }

      if (recRes.result.status !== 'active') {
        throw new Error(
          'Recovery identity is not active, and therefore unable to sign transactions.',
        );
      }

      if (recRes.result.identity.minimumsignatures > 1) {
        throw new Error(
          'Recovery identity has minimum signatures > 1. Please recover through CLI or Verus Desktop.',
        );
      }

      let isInWallet = false;
      const addrs = await getPotentialPrimaryAddresses();
      assertIdentityUpdateContext(updateContext);

      for (const address of recRes.result.identity.primaryaddresses) {
        if (addrs.includes(address)) {
          isInWallet = true;
          ownedAddress = address;
          recoverableByUser = true;
          break;
        }
      }

      if (!isInWallet) {
        throw new Error(
          'The imported secret or key does not control this VerusID’s recovery authority.',
        );
      }

      updateContext = {...updateContext, identitySnapshots: [{
        identityAddress: recRes.result.identity.identityaddress,
        txid: recRes.result.txid, vout: recRes.result.vout,
      }]};
      const friendlyNames = await getFriendlyNameMap(
        data[SEND_MODAL_SYSTEM_ID],
        tarRes.result,
      );

      assertIdentityUpdateContext(updateContext);
      const targetIdAddr = tarRes.result.identity.identityaddress;

      const primaryAddr =
        data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD] != null &&
        data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD].length > 0
          ? data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD]
          : null;

      const revocationAddr =
        data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] &&
        data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD] != null &&
        data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD].length > 0
          ? data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD]
          : null;

      const recoveryAddr =
        data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] &&
        data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD] != null &&
        data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD].length > 0
          ? data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD]
          : null;

      const privateAddr =
        data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] &&
        data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD] != null &&
        data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD].length > 0
          ? data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD]
          : null;

      const recoveryResult = await createRecoverIdentityTx(
        data[SEND_MODAL_SYSTEM_ID],
        targetIdAddr,
        recoveryAddr,
        revocationAddr,
        primaryAddr ? [primaryAddr] : null,
        privateAddr,
        recRes.result.identity.identityaddress,
      );

      await validateIdentityUpdateContext(updateContext, recoveryResult);
      assertIdentityUpdateContext(updateContext);
      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        updateContext,
        fee: satsToCoins(BigNumber(recoveryResult.fundingApproval.nativeFee)).toString(),
        feeCurrency: networkName,
        targetId: tarRes.result,
        recoveryId: recRes.result,
        friendlyNames,
        ownedAddress,
        recoverableByUser,
        recoveryResult,
        newRevocationAuthority: revocationAddr,
        newRecoveryAuthority: recoveryAddr,
        primaryAddr,
        privateAddr,
      });
    } catch (e) {
      if (e.code === 'SESSION_CHANGED') return;
      if (updateContext) {
        try { assertIdentityUpdateContext(updateContext); } catch (_) { return; }
      }
      if (!showFundRawTransactionErrorAlert(e)) {
        setFormError(getSafeRecoveryError(e, networkName));
      }
    } finally {
      if (store.getState().sendModal.requestId === sendModal.requestId) props.setLoading(false);
    }
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, props]);

  return RecoverIdentityFormRender({
    chooseCandidate,
    chooseManualEntry,
    formError,
    identityDiscovery,
    identitySheetVisible,
    loading: props.loading,
    manualEntry,
    onBack: props.cancel,
    onCloseIdentitySheet: () => setIdentitySheetVisible(false),
    onOpenIdentitySheet: openIdentitySheet,
    selectedCandidate,
    submitData,
    updateSendFormData: props.updateSendFormData,
    updateIdentity,
    sendModalData: sendModal.data,
    networkName,
    scannerOpen,
    toggleScanner,
    handleScan,
    currentIdentity,
    editSheet,
    editSheetVisible,
    editOptions,
    draft,
    editError,
    openEditSheet,
    onCloseEditSheet: () => setEditSheetVisible(false),
    onEditClosed: () => setEditSheet(null),
    onEditChange: (field, text) => {
      setEditError(null);
      setDraft(value => ({...value, [field]: text}));
    },
    onSaveEdit: () => saveEdit(),
    onResetEdit: () => saveEdit(true),
  });
};

export default RecoverIdentityForm;
