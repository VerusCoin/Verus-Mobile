import React, {useCallback, useRef, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {useAppTheme} from '../../../../theme/app';
import {hasGiftCardClaims} from '../../../../utils/giftCard/giftCard';
import {
  GiftCardNfcProgressModal,
  useGiftCardSharing,
} from './GiftCardShareController';

const GiftCardShareSheet = ({
  card,
  onClose,
  onOpenQr,
  onShareAction,
}) => {
  const theme = useAppTheme();
  const pendingQrCardIdRef = useRef(null);
  const [actionPending, setActionPending] = useState(false);
  const [qrPending, setQrPending] = useState(false);
  const {
    copied,
    copyLink,
    nfcTap,
    shareNative,
    shareNfc,
  } = useGiftCardSharing(card);

  const runShareAction = useCallback(
    async action => {
      if (actionPending) return false;

      setActionPending(true);

      try {
        if (onShareAction) {
          return await onShareAction(card, action);
        }

        await action(card);
        return true;
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, card, onShareAction],
  );

  const openQr = useCallback(async () => {
    if (actionPending || !card?.id || pendingQrCardIdRef.current) return;

    const shared = await runShareAction(actionCard => {
      pendingQrCardIdRef.current = actionCard.id;
      setQrPending(true);
    });

    if (shared) {
      onClose();
    } else {
      pendingQrCardIdRef.current = null;
      setQrPending(false);
    }
  }, [actionPending, card?.id, onClose, runShareAction]);

  const handleClosed = useCallback(() => {
    const pendingCardId = pendingQrCardIdRef.current;

    if (!pendingCardId) return;

    pendingQrCardIdRef.current = null;
    setQrPending(false);
    onOpenQr?.(pendingCardId);
  }, [onOpenQr]);

  return (
    <>
      <BottomSheetModal
        accessibilityViewIsModal
        contentContainerStyle={styles.sheet}
        maxHeight="86%"
        onClose={onClose}
        onClosed={handleClosed}
        visible={card != null && nfcTap == null}>
        <View style={styles.header}>
          <Text
            style={[
              theme.typography.titleSheet,
              {color: theme.colors.textPrimary},
            ]}>
            Share gift card
          </Text>
          <TouchableOpacity
            accessibilityLabel="Close sharing options"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="close"
              size={22}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.warning,
              {backgroundColor: theme.colors.warningBackground},
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.warning}
              name="shield-alert-outline"
              size={21}
            />
            <Text
              style={[styles.warningText, {color: theme.colors.textSecondary}]}>
              {hasGiftCardClaims(card)
                ? 'Sharing exposes the spendable gift-card key. This card cannot be funded again after it is shared.'
                : 'This gift card is unfunded. Anyone with the key can spend funds as soon as they arrive. Fund this card only once.'}
              {card?.encrypted
                ? ' The claim password is a separate secret and cannot be recovered.'
                : ''}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={actionPending || qrPending}
            onPress={openQr}
            style={[
              styles.actionRow,
              {borderBottomColor: theme.colors.border},
              (actionPending || qrPending) && styles.disabled,
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="qrcode"
              size={23}
            />
            <Text
              style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              Show QR code
            </Text>
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="chevron-right"
              size={21}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={
              copied
                ? 'Redeemable gift card link copied'
                : 'Copy redeemable gift card link'
            }
            accessibilityRole="button"
            disabled={actionPending}
            onPress={() => runShareAction(copyLink)}
            style={[
              styles.actionRow,
              {borderBottomColor: theme.colors.border},
              actionPending && styles.disabled,
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="link-variant"
              size={23}
            />
            <Text
              style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              {copied ? 'Redeemable link copied' : 'Copy redeemable link'}
            </Text>
            <MaterialCommunityIcons
              color={copied ? theme.colors.success : theme.colors.textSubtle}
              name={copied ? 'check' : 'content-copy'}
              size={21}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={actionPending}
            onPress={() => runShareAction(shareNative)}
            style={[
              styles.actionRow,
              {borderBottomColor: theme.colors.border},
              actionPending && styles.disabled,
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="share-variant"
              size={23}
            />
            <Text
              style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              Share redeemable link
            </Text>
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="chevron-right"
              size={21}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={actionPending}
            onPress={() => runShareAction(shareNfc)}
            style={[styles.actionRow, actionPending && styles.disabled]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="credit-card-wireless-outline"
              size={23}
            />
            <Text
              style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              Write to NFC card
            </Text>
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="chevron-right"
              size={21}
            />
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetModal>

      <GiftCardNfcProgressModal nfcTap={nfcTap} />
    </>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  content: {
    paddingTop: 8,
  },
  warning: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
  },
  warningText: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    minWidth: 0,
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GiftCardShareSheet;
