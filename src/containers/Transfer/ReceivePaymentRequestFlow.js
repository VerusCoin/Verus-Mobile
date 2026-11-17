import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  Platform,
  Share,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import BigNumber from 'bignumber.js';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import {formatCurrency} from 'react-native-format-currency';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import AppButton from '../../components/AppButton';
import FadedScrollView from '../../components/FadedScrollView';
import KeyboardAvoidingForm from '../../components/KeyboardAvoidingForm';
import ProgressHeader from '../../components/ProgressHeader';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {truncateDecimal} from '../../utils/math';
import {
  DEFAULT_SLIPPAGE_PERCENT,
  generateReceiveInvoice,
  sanitizeNumericInput,
  validateAmountInput,
  validateSlippageInput,
} from './receiveInvoice';
import {createReceiveDetailsStyles} from './receive.styles';
import {FlatRow} from '../SendWizard/components/WizardUI';
import PaymentRequestSlip from './PaymentRequestSlip';
import ReceiveNoteSheet from './ReceiveNoteSheet';
import ReceiveConversionsSheet from './ReceiveConversionsSheet';

const KEYBOARD_FOOTER_SPACING = 8;

const STEP_AMOUNT = 'amount';
const STEP_RESULT = 'result';

// Messages the invoice pipeline already writes for people. Anything else is
// a technical failure and is replaced with recoverable guidance.
const USER_FACING_MESSAGES = [
  'Enter an amount.',
  'Please enter a valid number.',
  'Enter an amount greater than 0.',
  'Enter a maximum slippage.',
  'Please enter a valid percentage.',
  'Slippage must be greater than 0 and not exceed 100%.',
  'Missing Asset, Card, or address.',
  'Unsupported address format for this payment request.',
];

// The amount is now a normal editable field with the system decimal keypad, so
// a paste can introduce characters the retired on-screen keypad could never
// produce. `isNumber` accepts "1e5" and "0x10" as numbers, so a plain decimal
// guard keeps such text from validating into an unintended invoice, and
// `MAX_AMOUNT_LENGTH` keeps the previous 18-character ceiling.
export const MAX_AMOUNT_LENGTH = 18;

const PLAIN_AMOUNT_PATTERN = /^\d*[.,]?\d*$/;

export const isPlainAmountInput = value =>
  typeof value === 'string' && PLAIN_AMOUNT_PATTERN.test(value);

export const getAmountInputError = value => {
  if (!isPlainAmountInput(value)) return 'Please enter a valid number.';
  return validateAmountInput(sanitizeNumericInput(value));
};

const getStepTitle = step => step === STEP_RESULT ? 'Request ready' : 'Request';

// Keep raw RPC, endpoint and file-system failures out of the UI. Only the
// recoverable messages the invoice pipeline writes for people pass through.
export const getRequestErrorMessage = error => {
  const message = error && error.message;
  if (typeof message === 'string') {
    if (USER_FACING_MESSAGES.includes(message)) return message;
    if (message.startsWith('Unable to convert ')) return message;
  }
  return 'The payment request could not be created. Try again.';
};

const ReceivePaymentRequestFlow = ({
  address,
  card,
  coinObj,
  contextKey,
  conversionEligible,
  displayCurrency,
  isSmall,
  navigation,
  onClose,
  onExit,
  price,
  priceMap,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {height: windowHeight, width: windowWidth} = useWindowDimensions();
  const compact = windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const styles = useMemo(() => createReceiveDetailsStyles(theme), [theme]);

  const [step, setStep] = useState(STEP_AMOUNT);
  const [amount, setAmount] = useState('');
  const [amountFiat, setAmountFiat] = useState(false);
  const [subject, setSubject] = useState('');
  const [allowConversion, setAllowConversion] = useState(true);
  const [maxSlippage, setMaxSlippage] = useState(DEFAULT_SLIPPAGE_PERCENT);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [qrSaved, setQrSaved] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [conversionsVisible, setConversionsVisible] = useState(false);
  const [amountWidth, setAmountWidth] = useState(40);

  const qrRef = useRef(null);
  const mountedRef = useRef(true);
  const contextRef = useRef(contextKey);
  contextRef.current = contextKey;
  const activeRunRef = useRef(0);
  const loadingRef = useRef(false);
  const savingRef = useRef(false);
  const saveSeqRef = useRef(0);
  const qrSavedRef = useRef(false);
  const handleBackRef = useRef(() => {});
  const closingRef = useRef(false);

  const isActiveRun = useCallback(runId => activeRunRef.current === runId, []);

  // Move to a fresh operation. Every async completion captures this id, so a
  // late result belongs to the operation that started it and can never touch a
  // newer request, a newer save or a screen the person already left.
  const advanceRun = useCallback(() => {
    const next = activeRunRef.current + 1;
    activeRunRef.current = next;
    return next;
  }, []);

  // Invalidate everything that could still call back into the screen.
  const invalidateOperations = useCallback(() => {
    activeRunRef.current += 1;
    loadingRef.current = false;
    savingRef.current = false;
    qrSavedRef.current = false;
  }, []);

  const resetFlow = useCallback(() => {
    // Invalidate any in-flight generation before clearing visible state.
    invalidateOperations();
    setStep(STEP_AMOUNT);
    setAmount('');
    setAmountFiat(false);
    setSubject('');
    setAllowConversion(true);
    setMaxSlippage(DEFAULT_SLIPPAGE_PERCENT);
    setError(null);
    setLoading(false);
    setSnapshot(null);
    setQrSaved(false);
    setNoteVisible(false);
    setConversionsVisible(false);
  }, [invalidateOperations]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateOperations();
    };
  }, [invalidateOperations]);

  // A different Asset, Card, address or account cancels the pending request.
  // The key is a string so unrelated store updates cannot reset the form.
  useEffect(() => {
    resetFlow();
  }, [contextKey, resetFlow]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const normalizedAmount = sanitizeNumericInput(amount);
  const amountValid = getAmountInputError(amount) == null;
  const fiatEstimate = useMemo(() => {
    if (!amountValid || !price || Number(price) <= 0) return null;
    const fiat = amountFiat ? Number(normalizedAmount) : Number(normalizedAmount) * Number(price);
    return `≈ ${formatCurrency({amount: fiat.toFixed(2), code: displayCurrency})[0]}`;
  }, [amountFiat, amountValid, displayCurrency, normalizedAmount, price]);
  const amountPreview = amountFiat && Number(price) > 0
    ? `≈ ${truncateDecimal((amountValid ? Number(normalizedAmount) : 0) / Number(price), 8)} ${coinObj.display_ticker}`
    : fiatEstimate || `≈ ${formatCurrency({amount: '0.00', code: displayCurrency})[0]}`;

  const currencyTicker = amountFiat
    ? displayCurrency
    : coinObj?.display_ticker || '';

  // The amount shrinks (40 to 20 pt) so the number and its unit stay on one
  // line at any window width. Inter bold digits are about 0.64 em wide; the
  // unit is 20 pt semibold, about 0.62 em per character, plus an 8 pt gap.
  const amountLength = Math.max((amount || '0').length, 1);
  const unitWidth = currencyTicker.length * 20 * 0.62 + 8;
  const amountRoom = windowWidth - 40 - insets.left - insets.right - unitWidth;
  const amountFontSize = Math.max(
    20,
    Math.min(40, Math.floor(amountRoom / (amountLength * 0.64))),
  );
  const amountSizeStyle =
    amountFontSize < 40
      ? {fontSize: amountFontSize, lineHeight: amountFontSize + 8}
      : null;

  const createInvoice = useCallback(async () => {
    if (loadingRef.current) return;

    const amountError = getAmountInputError(amount);
    const slippageError =
      conversionEligible && allowConversion
        ? validateSlippageInput(sanitizeNumericInput(maxSlippage))
        : null;

    if (amountError || slippageError) {
      setError(amountError || slippageError);
      return;
    }

    const runId = advanceRun();
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    Keyboard.dismiss();

    try {
      const result = await generateReceiveInvoice({
        address,
        allowConversion: conversionEligible && allowConversion,
        amountFiat,
        amountValue: normalizedAmount,
        coinObj,
        displayCurrency,
        maxSlippageValue: sanitizeNumericInput(maxSlippage),
        memo: subject,
        priceMap,
        subWallet: card,
      });

      if (!isActiveRun(runId) || !mountedRef.current) return;

      // The result is bound to the values that produced it so later rate,
      // store or prop changes cannot rewrite a generated request.
      setSnapshot({
        qrString: result.qrString,
        showVerusIcon: result.showVerusIcon,
        amountText: normalizedAmount,
        currency: currencyTicker,
        // The slip shows what the QR requests: the coin amount, even when
        // the amount was typed in the display currency.
        displayAmount: amountFiat
          ? BigNumber(result.cryptoAmount)
              .decimalPlaces(coinObj.decimals ?? 8, BigNumber.ROUND_DOWN)
              .toFixed()
          : normalizedAmount,
        displayUnit: coinObj.display_ticker,
        subject,
        address,
        conversion: conversionEligible,
        allowConversion: conversionEligible && allowConversion,
        fiatEstimate,
        identityName: card?.name?.endsWith('@') ? card.name : null,
        coinId: coinObj.id,
        assetName: coinObj.display_name,
      });
      setQrSaved(false);
      qrSavedRef.current = false;
      setStep(STEP_RESULT);
    } catch (e) {
      if (!isActiveRun(runId) || !mountedRef.current) return;
      setError(getRequestErrorMessage(e));
    } finally {
      if (isActiveRun(runId)) {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    }
  }, [
    address,
    advanceRun,
    allowConversion,
    amount,
    amountFiat,
    card,
    coinObj,
    conversionEligible,
    currencyTicker,
    displayCurrency,
    fiatEstimate,
    maxSlippage,
    normalizedAmount,
    priceMap,
    subject,
    isActiveRun,
  ]);

  const shareInvoice = useCallback(async () => {
    if (!snapshot || !snapshot.qrString) return;
    const runId = activeRunRef.current;
    const message = `Please pay me ${snapshot.amountText} ${snapshot.currency}${
      snapshot.subject ? ` for '${snapshot.subject}'` : ''
    } with ${snapshot.qrString}`;

    try {
      await Share.share({message});
      if (isActiveRun(runId) && mountedRef.current) setError(null);
    } catch (e) {
      if (isActiveRun(runId) && mountedRef.current) {
        setError('The share sheet could not be opened. Try again.');
      }
    }
  }, [isActiveRun, snapshot]);

  const saveQr = useCallback(() => {
    if (!qrRef.current || savingRef.current || qrSaved) return;
    const runId = activeRunRef.current;
    // The save belongs to this exact request and this exact save operation. The
    // token is a comparable value so it survives re-renders: a delayed CameraRoll
    // completion may only touch the request it started for, and may only release
    // the guard while it is still the active save.
    const saveToken = saveSeqRef.current + 1;
    saveSeqRef.current = saveToken;
    savingRef.current = saveToken;

    qrRef.current.toDataURL(async data => {
      if (savingRef.current !== saveToken || qrSavedRef.current) return;
      const path = `${RNFS.CachesDirectoryPath}/VerusPayQR_${Date.now()}.png`;
      try {
        await RNFS.writeFile(path, data, 'base64');
        await CameraRoll.save(path, {type: 'photo'});
        await RNFS.unlink(path);
        if (savingRef.current !== saveToken) return;
        if (!isActiveRun(runId) || !mountedRef.current) return;
        qrSavedRef.current = true;
        setQrSaved(true);
        setError(null);
      } catch (e) {
        if (!isActiveRun(runId) || !mountedRef.current) return;
        setError('The QR image could not be saved. Try again.');
      } finally {
        if (savingRef.current === saveToken) savingRef.current = false;
      }
    });
  }, [isActiveRun, qrSaved]);

  // Cancel a generation that is still in flight without leaving the task. The
  // creation call does not submit a payment, so this only stops waiting.
  const cancelGeneration = useCallback(
    (clearError = true) => {
      if (!loadingRef.current) return false;
      invalidateOperations();
      if (mountedRef.current) {
        setLoading(false);
        if (clearError) setError(null);
      }
      return true;
    },
    [invalidateOperations],
  );

  const handleBack = useCallback(() => {
    // Back is never trapped. While generation is pending it cancels the request
    // and leaves instead of stranding the person on a disabled screen.
    if (cancelGeneration(false)) {
      onExit();
      return;
    }

    if (step === STEP_RESULT) {
      // Editing a previous step recreates the request on the next submit. Leave
      // the operation boundary at the same time: a save started from this result
      // must not keep the save guard, attach a late error, or block the next
      // request's save. Amount, subject and settings are left untouched.
      invalidateOperations();
      setSnapshot(null);
      setQrSaved(false);
      setError(null);
      setStep(STEP_AMOUNT);
      return;
    }
    onExit();
  }, [cancelGeneration, invalidateOperations, onExit, step]);

  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

  // System back and the native removal gesture follow the same path as the
  // header back control instead of tearing the whole screen down.
  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== 'function') {
      return undefined;
    }
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      // Close leaves Receive on purpose; let that removal through.
      if (closingRef.current) return;
      // Route removal runs the exact handler the header control uses, once. The
      // handler itself detects a pending generation, invalidates it and only then
      // leaves, so this listener must not pre-cancel it (that would make the
      // handler see loading=false and step back instead of exiting).
      event.preventDefault();
      handleBackRef.current();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (loading) {
      AccessibilityInfo.announceForAccessibility(
        'Creating payment request.',
      );
      return;
    }
    const title = getStepTitle(step);
    AccessibilityInfo.announceForAccessibility(`${title}.`);
  }, [loading, step]);

  // Close leaves Receive from any step in one tap. A pending request is
  // cancelled first; creating it submits nothing, so nothing is lost.
  const handleClose = useCallback(() => {
    invalidateOperations();
    closingRef.current = true;
    onClose();
  }, [invalidateOperations, onClose]);

  const cancelAndExit = useCallback(() => {
    cancelGeneration(false);
    onExit();
  }, [cancelGeneration, onExit]);

  const renderAmountStep = () => (
    <>
      <View style={styles.amountRow}>
        <Text
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={event => setAmountWidth(event.nativeEvent.layout.width + 4)}
          style={[styles.amountInput, amountSizeStyle, styles.amountMeasure]}>
          {amount || '0'}
        </Text>
        <TextInput
          accessibilityLabel={`Amount in ${currencyTicker}`}
          autoFocus
          editable={!loading}
          inputMode="decimal"
          keyboardType="decimal-pad"
          maxLength={MAX_AMOUNT_LENGTH}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={theme.colors.textSubtle}
          returnKeyType="done"
          selectionColor={theme.colors.primary}
          style={[styles.amountInput, amountSizeStyle, {width: amountWidth}]}
          value={amount}
        />
        <Text numberOfLines={1} style={styles.currency}>{currencyTicker}</Text>
      </View>
      {price && Number(price) > 0 ? (
        <TouchableOpacity
          accessibilityLabel={`Change amount unit. ${amountPreview}`}
          accessibilityRole="button"
          disabled={loading}
          onPress={() => {
            if (amountValid && price && Number(price) > 0) {
              const current = Number(sanitizeNumericInput(amount));
              const converted = amountFiat
                ? truncateDecimal(current / Number(price), 8)
                : truncateDecimal(current * Number(price), 2);
              setAmount(String(converted));
            }
            setAmountFiat(value => !value);
          }}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={styles.modeChip}>
          <Text style={styles.modeText}>{amountPreview}</Text>
          <MaterialCommunityIcons
            color={theme.colors.textSecondary}
            name="swap-vertical"
            size={16}
            style={styles.modeIcon}
          />
        </TouchableOpacity>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {conversionEligible ? (
        <View style={styles.requestRows}>
          <FlatRow label="Note" onPress={loading ? undefined : () => {
            Keyboard.dismiss();
            setNoteVisible(true);
          }} quiet={!subject} value={subject || 'Optional'} />
          <FlatRow label="Conversions" onPress={loading ? undefined : () => {
            Keyboard.dismiss();
            setConversionsVisible(true);
          }} value={allowConversion
            ? `Allowed, max ${maxSlippage}%`
            : 'Not allowed'} />
        </View>
      ) : null}
    </>
  );

  const getStepContent = () => {
    if (step === STEP_RESULT && snapshot) {
      return (
        <>
          <PaymentRequestSlip isSmall={isSmall} qrRef={qrRef} snapshot={snapshot} />
          {snapshot.subject ? (
            <View style={{marginTop: 20}}>
              <Text style={[theme.typography.labelMd, {color: theme.colors.textSecondary}]}>
                Note · Shared message only, not in the QR code
              </Text>
              <Text style={[theme.typography.bodySm, {color: theme.colors.textPrimary, marginTop: 4}]}>
                {snapshot.subject}
              </Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      );
    }
    return renderAmountStep();
  };

  const renderActions = () => {
    const formKeyboardVisible = step === STEP_AMOUNT && keyboardVisible;
    const actions = {
      bottomSpacing: formKeyboardVisible
        ? KEYBOARD_FOOTER_SPACING
        : step === STEP_RESULT ? (compact ? 24 : 40) : 30,
      gap: 10,
      horizontalSpacing: 20,
      includeBottomInset: !formKeyboardVisible,
      safeAreaSpacing: step === STEP_RESULT ? 12 : 0,
      style: [styles.footer, isSmall && styles.footerCompact],
    };

    if (step === STEP_AMOUNT) {
      if (loading) {
        return (
          <SafeBottomActionStack {...actions}>
            <AppButton
              accessibilityLabel="Cancel payment request"
              accessibilityState={{busy: true}}
              onPress={cancelAndExit}
              variant="secondary">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        );
      }
      return (
        <SafeBottomActionStack {...actions}>
          <AppButton
            accessibilityLabel="Create request"
            accessibilityState={{disabled: !amountValid}}
            disabled={!amountValid}
            onPress={createInvoice}>
            Create request
          </AppButton>
        </SafeBottomActionStack>
      );
    }

    if (!snapshot) {
      return <SafeBottomActionStack {...actions} />;
    }

    const savedNonConversion = !snapshot.conversion && qrSaved;
    return (
      <SafeBottomActionStack {...actions}>
        <AppButton
          accessibilityLabel={
            snapshot.conversion
              ? 'Share'
              : savedNonConversion
                ? 'QR image saved'
                : 'Save QR to camera roll'
          }
          accessibilityState={{disabled: savedNonConversion}}
          disabled={savedNonConversion}
          onPress={snapshot.conversion ? shareInvoice : saveQr}>
          {snapshot.conversion
            ? 'Share'
            : savedNonConversion
              ? 'QR image saved'
              : 'Save QR to camera roll'}
        </AppButton>
        <AppButton onPress={onExit} variant="secondary">
          Done
        </AppButton>
      </SafeBottomActionStack>
    );
  };

  // A result has no fields. Unmount keyboard avoidance at the step boundary
  // so the amount step's contracted Android frame cannot lift Share and Done.
  const Viewport = step === STEP_AMOUNT ? KeyboardAvoidingForm : View;

  return (
    <View style={[styles.wizardRoot, {backgroundColor: theme.colors.background}]}>
      <ProgressHeader
        closeLabel="Close Receive"
        onBack={handleBack}
        onClose={handleClose}
        progress={step === STEP_RESULT ? 1 : 0.5}
        title={getStepTitle(step)}
      />
      <Viewport style={styles.wizardViewport}>
        <FadedScrollView
          bounces={false}
          containerStyle={styles.wizardViewport}
          contentContainerStyle={[
            styles.wizardContent,
            step === STEP_RESULT && compact && styles.wizardResultCompact,
            {
              paddingLeft: 20 + insets.left,
              paddingRight: 20 + insets.right,
            },
          ]}
          fadeBackgroundColor={theme.colors.background}
          fadeLength={42}
          key={step}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showEndFade={step !== STEP_RESULT}
          showStartFade={false}>
          {getStepContent()}
        </FadedScrollView>
        {renderActions()}
      </Viewport>
      {conversionEligible ? (
        <>
          <ReceiveNoteSheet
            note={subject}
            onApply={value => {
              if (mountedRef.current && contextRef.current === contextKey) setSubject(value);
            }}
            onClose={() => setNoteVisible(false)}
            visible={noteVisible}
          />
          <ReceiveConversionsSheet
            allowConversion={allowConversion}
            maxSlippage={maxSlippage}
            onApply={values => {
              if (!mountedRef.current || contextRef.current !== contextKey) return;
              setAllowConversion(values.allowConversion);
              setMaxSlippage(values.maxSlippage);
            }}
            onClose={() => setConversionsVisible(false)}
            ticker={coinObj.display_ticker}
            visible={conversionsVisible}
          />
        </>
      ) : null}
    </View>
  );
};

export default ReceivePaymentRequestFlow;
