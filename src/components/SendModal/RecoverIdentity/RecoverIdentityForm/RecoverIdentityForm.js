import {useCallback, useEffect, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {Alert, Dimensions} from 'react-native';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
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
import { createRecoverIdentityTx, createRevokeIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { decryptkey } from '../../../../utils/seedCrypt';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';

const RecoverIdentityForm = (props) => {
  const { height } = Dimensions.get("window");
  const dispatch = useDispatch();
  const sendModal = useSelector(state => state.sendModal);
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const [networkName, setNetworkName] = useState(sendModal.data[SEND_MODAL_SYSTEM_ID]);
  
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerField, setScannerField] = useState(SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD);

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(sendModal.data[SEND_MODAL_SYSTEM_ID]);
      setNetworkName(systemObj.display_name);
    } catch(e) {}
  }, [])

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      createAlert('Required Field', 'Identity is a required field.');
      return true;
    }

    try {
      fromBase58Check(identity);
    } catch (e) {
      if (!identity.endsWith('@')) {
        createAlert(
          'Invalid Identity',
          'Identity not a valid identity handle or iAddress.',
        )

        return true;
      }
    }

    return false;
  }, [sendModal, dispatch]);

  const getPotentialPrimaryAddresses = useCallback(async (coinObj) => {
    const encryptedSeed = sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
    const seed = decryptkey(instanceKey, encryptedSeed);

    if (!seed) throw new Error("Unable to decrypt seed");

    const keyObj = await deriveKeyPair(seed, coinObj, ELECTRUM);
    const {addresses} = keyObj;

    return addresses;
  }, []);

  const handleScan = (codes) => {
    const result = codes[0]
    setScannerOpen(false)

    if (typeof result === "string" && result.length <= 5000) {
      props.updateSendFormData(scannerField, result)
    } else {
      Alert.alert("Error", "Unknown data in qr code")
    }
  };

  const toggleScanner = (field) => {
    if (scannerOpen) {
      setScannerOpen(false);
      props.setModalHeight(null);
    } else {
      setScannerField(field)
      setScannerOpen(true)
      props.setModalHeight(height >= 720 ? 696 : height - 24);
    }
  }

  const toggleEditRevocationRecovery = () => {
    props.updateSendFormData(SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY, !sendModal.data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY])
  }

  const toggleEditZAddr = () => {
    props.updateSendFormData(SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS, !sendModal.data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS])
  }

  const submitData = useCallback(async () => {
    if (formHasError()) {
      return;
    }

    props.setLoading(true)

    const {data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD];

    let ownedAddress = '';
    let recoverableByUser = false;

    try {
      const tarRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], identity);
      if (tarRes.error) {
        throw new Error(tarRes.error.message);
      }

      if (tarRes.result.status !== "revoked") {
        throw new Error(
          'Cannot recover VerusID that is not revoked.',
        );
      }

      const recovery = tarRes.result.identity.recoveryauthority;

      const recRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], recovery);
      if (recRes.error) {
        throw new Error(recRes.error.message);
      }

      if (recRes.result.status !== "active") {
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
      const addrs = await getPotentialPrimaryAddresses(coinsList.VRSC);

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
          'Ensure that your imported seed/key corresponds to the primary address of the VerusID set as your recovery authority.',
        );
      }

      const friendlyNames = await getFriendlyNameMap(data[SEND_MODAL_SYSTEM_ID], tarRes.result);

      const targetIdAddr = tarRes.result.identity.identityaddress;

      const primaryAddr = data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD] != null && data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD].length > 0 ? 
                            data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD] 
                            : 
                            null;

      const revocationAddr = data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] && data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD] != null && data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD].length > 0 ? 
                                data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD] 
                                : 
                                null;

      const recoveryAddr = data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] && data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD] != null && data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD].length > 0 ? 
                            data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD] 
                            : 
                            null;

      const privateAddr = data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] && data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD] != null && data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD].length > 0 ? 
                            data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD] 
                            : 
                            null;

      const recoveryResult = await createRecoverIdentityTx(
        data[SEND_MODAL_SYSTEM_ID], 
        targetIdAddr, 
        recoveryAddr, 
        revocationAddr, 
        [primaryAddr], 
        privateAddr, 
        recRes.result.identity.identityaddress
      )

      props.setModalHeight(height >= 720 ? 696 : height - 24);
      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        targetId: tarRes.result,
        recoveryAddr: recRes.result,
        friendlyNames,
        ownedAddress,
        recoverableByUser,
        recoveryResult,
        revocationAddr,
        recoveryAddr,
        primaryAddr,
        privateAddr
      })
    } catch (e) {
      Alert.alert('Error', e.message);
    }

    props.setLoading(false)
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, dispatch, props]);

  return RecoverIdentityFormRender({
    submitData,
    updateSendFormData: props.updateSendFormData,
    sendModalData: sendModal.data,
    networkName,
    scannerOpen,
    toggleScanner,
    handleScan,
    toggleEditRevocationRecovery,
    toggleEditZAddr
  });
};

export default RecoverIdentityForm;
