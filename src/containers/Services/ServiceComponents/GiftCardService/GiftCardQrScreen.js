import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../../../components/SkeletonLoader';
import {fontStyle} from '../../../../globals/fonts';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../../../hooks/useOnboardingSmallDeviceLayout';
import {useAppTheme} from '../../../../theme/app';
import {requestServiceStoredData} from '../../../../utils/auth/authBox';
import {GIFT_CARD_SERVICE_ID} from '../../../../utils/constants/services';
import {
  hasGiftCardBeenShared,
  hasGiftCardShareReservation,
  normalizeGiftCardServiceData,
} from '../../../../utils/giftCard/giftCard';

const VERUS_LOGO = require('../../../../images/customIcons/Verus.png');
// The first share opens this screen before the share is saved. While the
// share is reserved, wait briefly for the saved share instead of failing.
const SHARE_RECORD_RETRY_MS = 250;
const SHARE_RECORD_MAX_RETRIES = 20;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
// The save button reads "Saved" for this long after a save.
const SAVED_LABEL_MS = 2000;
const SAVE_FAILED_TEXT = 'Not saved. Check photo access and try again.';

const GiftCardQrScreen = ({navigation, route}) => {
  const theme = useAppTheme();
  const {height} = useWindowDimensions();
  const compact = height <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  // Match Receive's QR sizes on short windows. Keep the safety warning in
  // view above Save, including when the service tab bar takes bottom space.
  const qrSize = height <= 640 ? 160 : compact ? 184 : 232;
  const qrFrameSize = qrSize + (compact ? 32 : 36);
  const qrCodeRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const [card, setCard] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoReady, setLogoReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savedTimeoutRef = useRef(null);
  const cardId = route?.params?.cardId;
  const contentReady =
    !loading && !loadError && logoReady && card?.requestUri != null;

  const loadCard = useCallback(async () => {
    const loadGeneration = loadGenerationRef.current + 1;
    loadGenerationRef.current = loadGeneration;
    setCard(null);
    setLoadError(false);
    setLoading(true);

    try {
      let storedCard = null;

      for (let attempt = 0; ; attempt += 1) {
        const serviceData = normalizeGiftCardServiceData(
          await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
        );
        storedCard = cardId ? serviceData.cards?.[cardId] : null;

        if (loadGenerationRef.current !== loadGeneration) return;

        if (
          attempt >= SHARE_RECORD_MAX_RETRIES ||
          hasGiftCardBeenShared(storedCard) ||
          !hasGiftCardShareReservation(storedCard)
        ) {
          break;
        }

        await wait(SHARE_RECORD_RETRY_MS);
        if (loadGenerationRef.current !== loadGeneration) return;
      }

      if (
        !storedCard?.requestUri ||
        !hasGiftCardBeenShared(storedCard)
      ) {
        setLoadError(true);
      } else {
        setCard(storedCard);
      }
    } catch (_) {
      if (loadGenerationRef.current === loadGeneration) {
        setLoadError(true);
      }
    } finally {
      if (loadGenerationRef.current === loadGeneration) {
        setLoading(false);
      }
    }
  }, [cardId]);

  useEffect(() => {
    loadCard();

    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadCard]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const saveQrCode = useCallback(async () => {
    if (!contentReady || !qrCodeRef.current || saving) return;

    let filePath = null;
    clearTimeout(savedTimeoutRef.current);
    setSaved(false);
    setSaveFailed(false);
    setSaving(true);

    try {
      const data = await new Promise((resolve, reject) => {
        try {
          qrCodeRef.current.toDataURL(value => {
            if (value) {
              resolve(value);
            } else {
              reject(new Error('Unable to render QR code'));
            }
          });
        } catch (error) {
          reject(error);
        }
      });

      filePath = `${RNFS.CachesDirectoryPath}/GiftCard-QR-${Date.now()}.png`;
      await RNFS.writeFile(filePath, data, 'base64');
      await CameraRoll.save(filePath, {type: 'photo'});

      if (mountedRef.current) {
        setSaved(true);
        savedTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setSaved(false);
        }, SAVED_LABEL_MS);
      }
      AccessibilityInfo.announceForAccessibility('QR code saved to Photos');
    } catch (e) {
      console.warn(e);
      if (mountedRef.current) setSaveFailed(true);
      AccessibilityInfo.announceForAccessibility(SAVE_FAILED_TEXT);
    } finally {
      if (filePath) {
        try {
          if (await RNFS.exists(filePath)) {
            await RNFS.unlink(filePath);
          }
        } catch (_) {}
      }

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [contentReady, saving]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityLabel="Back"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.headerAction}>
        <MaterialCommunityIcons
          color={theme.colors.textPrimary}
          name="arrow-left"
          size={24}
        />
      </TouchableOpacity>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          theme.typography.titleSheet,
          styles.headerTitle,
          {color: theme.colors.textPrimary},
        ]}>
        Gift card QR
      </Text>
      <View style={styles.headerAction} />
    </View>
  );

  const renderLoading = () => (
    <SkeletonLoader
      accessibilityLabel="Loading gift card QR code"
      style={[styles.skeleton, compact && styles.contentCompact]}>
      <SkeletonText height={32} width="62%" />
      <SkeletonText
        height={18}
        style={styles.skeletonDescription}
        width="82%"
      />
      <SkeletonBlock
        height={qrFrameSize}
        radius={22}
        style={[styles.skeletonQr, compact && styles.qrFrameCompact]}
        width={qrFrameSize}
      />
      <SkeletonBlock height={86} radius={14} style={styles.skeletonWarning} />
    </SkeletonLoader>
  );

  const renderError = () => (
    <View style={styles.error}>
      <MaterialCommunityIcons
        color={theme.colors.danger}
        name="alert-circle-outline"
        size={48}
      />
      <Text
        style={[
          theme.typography.titleSheet,
          styles.errorTitle,
          {color: theme.colors.textPrimary},
        ]}>
        Gift card unavailable
      </Text>
      <Text style={[styles.errorText, {color: theme.colors.textSecondary}]}>
        This gift card could not be loaded.
      </Text>
      <AppButton onPress={loadCard} style={styles.retryButton}>
        Try again
      </AppButton>
    </View>
  );

  const renderWarning = () => (
    <View
      accessibilityLabel="Security warning. This QR code is a spendable secret. Anyone who scans or saves it can claim current and future contents."
      accessibilityRole="text"
      accessible
      style={[
        styles.warning,
        compact && styles.warningCompact,
        {backgroundColor: theme.colors.warningBackground},
      ]}>
      <MaterialCommunityIcons
        accessible={false}
        color={theme.colors.warning}
        name="shield-alert-outline"
        size={21}
      />
      <Text style={[styles.warningText, {color: theme.colors.textSecondary}]}>
        This QR code is a spendable secret. Anyone who scans or saves it can
        claim current and future contents.
      </Text>
    </View>
  );

  const renderContent = () => (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
        {card.label || 'Gift card'}
      </Text>
      <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
        Scan this code in Verus Mobile to claim the gift card.
      </Text>

      <View
        accessibilityLabel="Redeemable gift card QR code"
        accessibilityRole="image"
        style={[styles.qrFrame, compact && styles.qrFrameCompact, {borderColor: theme.colors.border}]}>
        <QRCode
          backgroundColor="#FFFFFF"
          color="#000000"
          getRef={ref => {
            qrCodeRef.current = ref;
          }}
          logo={VERUS_LOGO}
          logoBackgroundColor="#FFFFFF"
          logoBorderRadius={100}
          logoSize={compact ? 36 : 46}
          size={qrSize}
          value={card.requestUri}
        />
      </View>

      {!compact ? renderWarning() : null}
    </ScrollView>
  );

  const renderBody = () => {
    if (loadError) return renderError();
    if (contentReady) return renderContent();
    return renderLoading();
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onError={() => setLogoReady(true)}
        onLoad={() => setLogoReady(true)}
        source={VERUS_LOGO}
        style={styles.logoPreloader}
      />
      {renderHeader()}
      <View style={styles.body}>{renderBody()}</View>
      {!loadError ? (
        <SafeBottomActionStack
          gap={8}
          horizontalSpacing={20}
          safeAreaSpacing={0}>
          {compact && contentReady ? renderWarning() : null}
          {saveFailed ? (
            <Text
              style={[
                theme.typography.caption,
                styles.saveError,
                {color: theme.colors.danger},
              ]}>
              {SAVE_FAILED_TEXT}
            </Text>
          ) : null}
          <AppButton
            disabled={!contentReady || saving}
            onPress={saveQrCode}
            variant="primary">
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save to photos'}
          </AppButton>
        </SafeBottomActionStack>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerTitle: {
    minWidth: 0,
    flex: 1,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
  },
  contentCompact: {paddingTop: 8, paddingBottom: 8},
  title: {
    textAlign: 'center',
    fontSize: 25,
    lineHeight: 32,
    ...fontStyle('semiBold'),
  },
  description: {
    maxWidth: 320,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  qrFrame: {
    marginTop: 28,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
  },
  qrFrameCompact: {marginTop: 12, padding: 16},
  warning: {
    maxWidth: 360,
    marginTop: 24,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
  },
  // The warning stays with Save on compact screens, even after a save error
  // grows the footer. Only the QR content may scroll.
  warningCompact: {maxWidth: '100%', marginTop: 0},
  warningText: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
  logoPreloader: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  skeleton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  skeletonDescription: {
    marginTop: 12,
  },
  skeletonQr: {
    marginTop: 28,
  },
  skeletonWarning: {
    maxWidth: 360,
    marginTop: 24,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    maxWidth: 320,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  retryButton: {
    minWidth: 160,
    marginTop: 20,
  },
  saveError: {
    textAlign: 'center',
  },
});

export default GiftCardQrScreen;
