import {useInvoiceFlow} from './invoiceFlow';
import {useRequestBackHandler} from '../DeepLink/useRequestNavigation';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ethers} from 'ethers';
import {fromBase58Check} from 'verus-typescript-primitives';
import BarcodeReader from '../../components/BarcodeReader/BarcodeReader';
import AppAddressInput from '../../components/AppAddressInput';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import QrScanner from '../../utils/QrScanner/QrScanner';
import {addressIsBlocked} from '../../utils/addressBlocklist';
import {selectAddressBlocklist} from '../../selectors/settings';
import {
  I_ADDRESS_VERSION,
  R_ADDRESS_VERSION,
} from '../../utils/constants/constants';
import {ERC20, ETH} from '../../utils/constants/intervalConstants';
import {
  addressBookRecordMatchesContext,
  loadAddressBook,
  saveAddressBook,
} from '../../utils/addressBook/addressBook';
import {getIdentity} from '../../utils/api/routers/getIdentity';
import {timeout} from '../../utils/promises';
import AddressBookEditSheet from '../Services/AddressBook/AddressBookEditSheet';
import {useSendWizard} from './SendWizardContext';
import AddressBookSheet from './components/AddressBookSheet';
import MemoSheet from './components/MemoSheet';
import SelfAddressSheet from './components/SelfAddressSheet';
import {
  WizardFormLayout,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import {isPrivateChannel} from '../../utils/subwallet/privateWallet';
import {ADDRESS_TYPE, isPrivateRecipient} from './wizardUtils';
import {memoApplies, resolvePrivateCardDestination} from './privateSend';

const IDENTITY_NOT_FOUND = 'VerusID not found. Check the name and try again.';
const IDENTITY_UNAVAILABLE = 'Could not verify this VerusID. Try again.';

const SendWizardRecipient = () => {
  const navigation = useNavigation();
  const invoiceFlow = useInvoiceFlow();
  const theme = useOnboardingTheme();
  const saveAddressTextColor = theme.isDark
    ? theme.colors.textPrimary
    : theme.colors.primary;
  const {state, setMemo, setRecipient} = useSendWizard();
  const {channel, memo, sourceCoin, target, route} = state;
  const privateSource = isPrivateChannel(channel);
  const blocklist = useSelector(selectAddressBlocklist);
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const allSubWallets = useObjectSelector(
    stateValue => stateValue.coinMenus.allSubWallets,
  );
  // The visible draft also survives header Back, system Back and a remount.
  const input = state.recipientAddress || '';
  const setInput = setRecipient;
  const [error, setError] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [saveAddressOpen, setSaveAddressOpen] = useState(false);
  const [selfAddressOpen, setSelfAddressOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [identityCheck, setIdentityCheck] = useState(null);
  const lookup = useRef({generation: 0, pending: false});

  const cancelLookup = useCallback(() => {
    lookup.current.generation += 1;
    lookup.current.pending = false;
    setResolving(false);
  }, []);

  useEffect(() => {
    let active = true;

    loadAddressBook()
      .then(records => {
        if (active) setSavedAddresses(records);
      })
      .catch(() => {
        if (active) setSavedAddresses([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const ownAddresses = useMemo(() => {
    const addresses = [];
    const seen = new Set();

    if (route?.addressType === ADDRESS_TYPE.ETHEREUM) {
      Object.entries(activeAccount?.keys || {}).forEach(([coinId, coinKeys]) => {
        const values = [
          ...(coinKeys?.[ETH]?.addresses || []),
          ...(coinKeys?.[ERC20]?.addresses || []),
        ];
        values.forEach(address => {
          if (!ethers.isAddress(address) || seen.has(address)) return;
          seen.add(address);
          addresses.push({id: `${coinId}:${address}`, address});
        });
      });
    } else if (route?.addressType === ADDRESS_TYPE.VERUS) {
      Object.values(allSubWallets || {})
        .flat()
        .forEach(card => {
          const channelParts = String(card?.channel || '').split('.');
          const address = channelParts.length > 2 ? channelParts[1] : null;
          if (!address || seen.has(address)) return;
          seen.add(address);
          addresses.push({
            id: card.id || address,
            address,
            verusIdName: card.name?.endsWith('@') ? card.name : null,
          });
        });
    }

    return addresses;
  }, [activeAccount, allSubWallets, route?.addressType]);

  const validation = useMemo(() => {
    const address = input.trim();
    if (!address) return {valid: false, message: null};
    if (addressIsBlocked(address, blocklist)) {
      return {valid: false, message: 'Sending to this address is blocked.'};
    }
    // A private address, or "alice@:private", takes funds from the private
    // card only.
    if (isPrivateRecipient(address)) {
      return privateSource
        ? {valid: true, message: null}
        : {
            valid: false,
            message: 'Only the Private card can send to a private address.',
          };
    }
    try {
      if (route?.addressType === ADDRESS_TYPE.ETHEREUM) {
        return ethers.isAddress(address)
          ? {valid: true, message: null}
          : {valid: false, message: 'Enter a valid Ethereum address.'};
      }
      if (route?.addressType === ADDRESS_TYPE.GENERIC) {
        return address.length >= 20 &&
          address.length <= 256 &&
          !/\s/.test(address)
          ? {valid: true, message: null}
          : {
              valid: false,
              message: 'Enter an address supported by this network.',
            };
      }
      if (address.endsWith('@')) return {valid: true, message: null};
      if (ethers.isAddress(address)) {
        return {
          valid: false,
          message: 'This is an Ethereum address. Enter a Verus address or VerusID.',
        };
      }
      const {version} = fromBase58Check(address);
      return version === R_ADDRESS_VERSION || version === I_ADDRESS_VERSION
        ? {valid: true, message: null}
        : {valid: false, message: 'Enter a valid Verus address or VerusID.'};
    } catch (validationError) {
      return {valid: false, message: 'Enter a valid Verus address or VerusID.'};
    }
  }, [blocklist, input, privateSource, route?.addressType]);
  const address = input.trim();
  const needsIdentityCheck = validation.valid && (
    privateSource ? address.includes('@')
      : route?.addressType === ADDRESS_TYPE.VERUS && address.endsWith('@')
  );
  const identityKey = `${sourceCoin?.id}:${channel}:${route?.key}:${address}`;
  const currentIdentityCheck = identityCheck?.key === identityKey ? identityCheck : null;
  const checkingIdentity = needsIdentityCheck && (
    !currentIdentityCheck || currentIdentityCheck.status === 'checking'
  );
  const identityError = needsIdentityCheck && currentIdentityCheck?.status === 'invalid'
    ? currentIdentityCheck.message : null;
  const visibleError = error || validation.message || identityError;

  const checkIdentity = useCallback(async value => {
    if (privateSource) return resolvePrivateCardDestination(sourceCoin, value);

    // Match Confirm: the channel's own Verus system. An Ethereum card asks the
    // Verus system of its bridge.
    let result;
    try {
      result = await timeout(15000, getIdentity(sourceCoin, activeAccount, channel, value));
    } catch (_) {
      throw new Error(IDENTITY_UNAVAILABLE);
    }
    if (result?.error || !result?.result?.identity?.identityaddress) {
      throw new Error(result?.error?.code === -5 ? IDENTITY_NOT_FOUND : IDENTITY_UNAVAILABLE);
    }
    return result.result.identity.identityaddress;
  }, [activeAccount, channel, privateSource, sourceCoin]);

  useFocusEffect(useCallback(() => {
    cancelLookup();
    setError(null);
    if (!needsIdentityCheck) {
      setIdentityCheck(null);
      return cancelLookup;
    }

    const generation = lookup.current.generation;
    setIdentityCheck({key: identityKey, status: 'checking'});
    const timer = setTimeout(async () => {
      try {
        await checkIdentity(address);
        if (generation !== lookup.current.generation) return;
        setIdentityCheck({key: identityKey, status: 'valid'});
      } catch (lookupError) {
        if (generation !== lookup.current.generation) return;
        // A transport failure is inconclusive. Leave Continue available so
        // it can perform the existing explicit check again.
        const message = lookupError.message || IDENTITY_UNAVAILABLE;
        setIdentityCheck({
          key: identityKey,
          status: message === IDENTITY_UNAVAILABLE ? 'unavailable' : 'invalid',
          message,
        });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      cancelLookup();
    };
  }, [address, cancelLookup, checkIdentity, identityKey, needsIdentityCheck, route]));
  const showMemo = validation.valid && memoApplies(channel, input.trim());

  const openScanner = () => {
    Keyboard.dismiss();
    setScannerOpen(true);
  };

  const closeScanner = useCallback(() => setScannerOpen(false), []);
  useRequestBackHandler(closeScanner, false, 2, Boolean(invoiceFlow) && scannerOpen);

  // While the camera is open the header names it, and Back returns to the
  // address field instead of the previous step.
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !scannerOpen,
      wizardOnBack: scannerOpen ? closeScanner : undefined,
      wizardTitle: scannerOpen ? 'Scan address' : undefined,
    });
  }, [closeScanner, navigation, scannerOpen]);

  useFocusEffect(
    useCallback(() => {
      if (!scannerOpen) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        closeScanner();
        return true;
      });
      return () => subscription.remove();
    }, [closeScanner, scannerOpen]),
  );

  const handleScan = codes => {
    const raw = codes?.[0]?.value;
    setScannerOpen(false);
    if (typeof raw !== 'string' || raw.length > 5000) {
      setError('Could not read this QR code.');
      return;
    }

    try {
      const request = QrScanner.processGenericPaymentRequest(raw);
      if (
        request.coinObj &&
        !target?.isConversion &&
        request.coinObj.id !== sourceCoin.id
      ) {
        throw new Error(`This request is for ${request.coinObj.display_ticker}, not ${sourceCoin.display_ticker}.`);
      }
      setInput(String(request.address || '').trim());
      setError(null);
    } catch (scanError) {
      setError(scanError.message || 'This QR code is not a supported payment destination.');
    }
  };

  const continueToReview = async () => {
    if (lookup.current.pending || checkingIdentity || identityError) return;
    if (!validation.valid) {
      setError(validation.message || 'Enter a recipient.');
      return;
    }
    if (needsIdentityCheck) {
      const generation = ++lookup.current.generation;
      lookup.current.pending = true;
      setResolving(true);
      setError(null);
      try {
        await checkIdentity(address);
        if (generation !== lookup.current.generation) return;
      } catch (lookupError) {
        if (generation !== lookup.current.generation) return;
        const message = lookupError.message || IDENTITY_UNAVAILABLE;
        setError(message);
        if (message !== IDENTITY_UNAVAILABLE) {
          setIdentityCheck({key: identityKey, status: 'invalid', message});
        }
        return;
      } finally {
        if (generation === lookup.current.generation) {
          lookup.current.pending = false;
          setResolving(false);
        }
      }
    }
    setRecipient(address);
    navigation.navigate('SendWizardConfirm');
  };

  const selectOwnAddress = item => {
    setInput(item.verusIdName || item.address);
    setError(null);
    setSelfAddressOpen(false);
  };

  const openOwnAddresses = () => {
    if (ownAddresses.length === 1) selectOwnAddress(ownAddresses[0]);
    else if (ownAddresses.length > 1) setSelfAddressOpen(true);
  };

  const context = {
    asset: target?.ticker,
    network:
      route?.exportToFqn ||
      channel?.split('.')[2] ||
      sourceCoin?.system_id ||
      sourceCoin?.id,
    addressType: route?.addressType,
  };
  const matchingSavedAddresses = savedAddresses.filter(record =>
    addressBookRecordMatchesContext(record, context),
  );
  const inputAlreadySaved = savedAddresses.some(
    record => record.address.toLowerCase() === input.trim().toLowerCase(),
  );
  const showSaveOption = validation.valid && !visibleError && !checkingIdentity && !inputAlreadySaved;

  const saveNewAddress = async record => {
    try {
      const nextRecords = await saveAddressBook(
        [
          ...savedAddresses,
          {
            ...record,
            id: `${Date.now()}`,
            asset: context.asset,
            network: context.network,
          },
        ],
        activeAccount?.accountHash,
      );
      setSavedAddresses(nextRecords);
      setSaveAddressOpen(false);
    } catch (saveError) {
      setError(saveError.message || 'Could not save this address.');
      throw saveError;
    }
  };

  if (scannerOpen) {
    return (
      <View style={[styles.scanner, {backgroundColor: theme.colors.background}]}>
        <BarcodeReader
          horizontalInset={16}
          noCameraAction={{label: 'Enter address', onPress: closeScanner}}
          noCameraHint="Paste or type the address instead."
          onScan={handleScan}
          style={styles.scannerContent}
        />
      </View>
    );
  }

  return (
    <WizardScreen scroll={false}>
      <WizardFormLayout
        contentContainerStyle={styles.content}
        error={visibleError}
        disabled={!validation.valid || checkingIdentity || Boolean(identityError)}
        loading={resolving || checkingIdentity}
        loadingText="Checking VerusID…"
        onPress={continueToReview}>
        {(errorMessage, onFieldLayout) => <>
          <View onLayout={onFieldLayout} style={!visibleError && styles.inputSpacing}>
            <AppAddressInput
              abbreviate={validation.valid}
              accessibilityLabel="Recipient address"
              inlineLabel="To"
              onChangeText={value => {
                setInput(value);
                setError(null);
              }}
              onScan={openScanner}
              placeholder={
                route?.addressType === ADDRESS_TYPE.ETHEREUM
                  ? 'Ethereum address'
                  : route?.addressType === ADDRESS_TYPE.VERUS
                  ? 'Address or VerusID'
                  : 'Recipient address'
              }
              invalid={Boolean(visibleError)}
              technical={!input.includes('@')}
              testID="send.recipient.input"
              value={input}
            />
          </View>
          {errorMessage}
          {showSaveOption ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSaveAddressOpen(true)}
              style={[styles.saveAddress, {
                backgroundColor: theme.isDark
                  ? theme.colors.surfaceMuted
                  : theme.colors.primaryBackground,
              }]}>
              <MaterialCommunityIcons name="account-plus" size={18} color={saveAddressTextColor} />
              <Text style={[styles.saveAddressText, {color: saveAddressTextColor}]}>Save to address book</Text>
            </Pressable>
          ) : null}
          {showMemo || matchingSavedAddresses.length > 0 || ownAddresses.length > 0 ? (
            <View style={[styles.actionRows, {borderTopColor: theme.colors.border}]}>
              {showMemo ? (
                <RecipientActionRow
                  count={memo || 'Optional'}
                  label="Memo"
                  onPress={() => {
                    Keyboard.dismiss();
                    setMemoOpen(true);
                  }}
                />
              ) : null}
              {matchingSavedAddresses.length > 0 ? (
                <RecipientActionRow
                  count={`${matchingSavedAddresses.length}`}
                  label="Saved addresses"
                  onPress={() => setAddressBookOpen(true)}
                />
              ) : null}
              {ownAddresses.length > 0 ? (
                <RecipientActionRow
                  count={`${ownAddresses.length}`}
                  label="Send to self"
                  onPress={openOwnAddresses}
                />
              ) : null}
            </View>
          ) : null}
        </>}
      </WizardFormLayout>
      <AddressBookSheet
        visible={addressBookOpen}
        context={context}
        matchingCount={matchingSavedAddresses.length}
        onRecordsLoaded={setSavedAddresses}
        onClose={() => setAddressBookOpen(false)}
        onSelect={record => {
          setInput(record.address);
          setError(null);
          setAddressBookOpen(false);
        }}
      />
      <SelfAddressSheet
        addressType={route?.addressType}
        addresses={ownAddresses}
        onClose={() => setSelfAddressOpen(false)}
        onSelect={selectOwnAddress}
        visible={selfAddressOpen}
      />
      <MemoSheet
        memo={memo}
        onApply={setMemo}
        onClose={() => setMemoOpen(false)}
        visible={memoOpen}
      />
      <AddressBookEditSheet
        initialAddress={input.trim()}
        onClose={() => setSaveAddressOpen(false)}
        onSave={saveNewAddress}
        visible={saveAddressOpen}
      />
    </WizardScreen>
  );
};

// Flat list action under the address field; the list container draws the top
// hairline.
const RecipientActionRow = ({count, label, onPress}) => {
  const theme = useOnboardingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.actionRow,
        {borderBottomColor: theme.colors.border},
        pressed && styles.actionPressed,
      ]}>
      <Text style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.actionCount, {color: theme.colors.textSecondary}]}>{count}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSubtle} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 20},
  inputSpacing: {marginBottom: 12},
  saveAddress: {alignSelf: 'flex-start', borderRadius: 20, marginTop: 8, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'},
  saveAddressText: {fontSize: 13, lineHeight: 18, marginLeft: 6, ...fontStyle('semiBold')},
  actionRows: {marginTop: 8, marginBottom: 24, borderTopWidth: StyleSheet.hairlineWidth},
  actionPressed: {opacity: 0.7},
  actionRow: {minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center'},
  actionLabel: {flex: 1, fontSize: 16, lineHeight: 22, marginRight: 12, ...fontStyle('semiBold')},
  actionCount: {flexShrink: 1, maxWidth: '62%', fontSize: 14, lineHeight: 20, marginRight: 6, ...fontStyle('regular')},
  scanner: {flex: 1},
  scannerContent: {paddingTop: WIZARD_CONTENT_TOP_INSET},
});

export default SendWizardRecipient;
