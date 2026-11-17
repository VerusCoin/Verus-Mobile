import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Platform, Share} from 'react-native';
import Clipboard from 'react-native/Libraries/Components/Clipboard/Clipboard';
import NfcTapModal from '../../../../components/NfcTap/NfcTapModal';
import {buildGiftCardNfcDeeplinkUri} from '../../../../utils/giftCard/giftCard';
import {
  cancelWalletBackupNfcRequest,
  NFC_PHASE,
  writeDeeplinkUriToNfc,
} from '../../../../utils/walletBackup/walletBackupNfc';
import {
  getNfcTapFailure,
  getNfcTapText,
  NFC_TAP_PHASE,
  NFC_TAP_TASK,
} from '../../../../utils/walletBackup/nfcTapText';

export const useGiftCardSharing = card => {
  const copyFeedbackTimeoutRef = useRef(null);
  const [copied, setCopied] = useState(false);
  // The NFC tap step while the gift card is written.
  const [nfcTap, setNfcTap] = useState(null);
  const resetSharing = useCallback(() => {
    setCopied(false);

    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    resetSharing();
    setNfcTap(null);

    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, [card?.id, resetSharing]);

  const copyLink = useCallback(cardOverride => {
    const cardToShare = cardOverride || card;
    if (!cardToShare?.requestUri) {
      throw new Error('Gift card link is unavailable.');
    }

    Clipboard.setString(cardToShare.requestUri);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility(
      'Redeemable gift card link copied',
    );

    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copyFeedbackTimeoutRef.current = null;
    }, 1400);
  }, [card]);

  const shareNative = useCallback(async cardOverride => {
    const cardToShare = cardOverride || card;
    if (!cardToShare?.requestUri) {
      throw new Error('Gift card link is unavailable.');
    }

    const result = await Share.share({message: cardToShare.requestUri});

    return result?.action !== Share.dismissedAction;
  }, [card]);

  // Resolves true when the card was written, and false when the user stopped.
  const shareNfc = useCallback(async cardOverride => {
    const cardToShare = cardOverride || card;
    if (!cardToShare) {
      throw new Error('Gift card is unavailable.');
    }

    const uri = buildGiftCardNfcDeeplinkUri(cardToShare);
    // Shows a result step and waits for one of its actions.
    const choose = (step, actions) =>
      new Promise(resolve => {
        let chosen = false;
        setNfcTap({
          ...step,
          actions: actions.map(action => ({
            ...action,
            onPress: () => {
              if (chosen) return;
              chosen = true;
              resolve(action.value);
            },
          })),
        });
      });

    try {
      for (;;) {
        let cancelled = false;
        const cancelAction = {
          cancel: true,
          label: 'Cancel',
          onPress: () => {
            if (cancelled) return;
            cancelled = true;
            cancelWalletBackupNfcRequest();
          },
        };
        const showPhase = phase => {
          // iOS has its own Cancel in the scan sheet.
          const canCancel =
            phase === NFC_PHASE.WAITING && Platform.OS === 'android';
          setNfcTap({
            ...getNfcTapText(NFC_TAP_TASK.GIFT_CARD, phase),
            actions: canCancel ? [cancelAction] : [],
          });
        };

        showPhase(NFC_PHASE.WAITING);

        try {
          await writeDeeplinkUriToNfc(uri, {onPhase: showPhase});
        } catch (e) {
          const failure = getNfcTapFailure(NFC_TAP_TASK.GIFT_CARD, e);
          if (cancelled || failure == null) return false;

          const choice = await choose(failure, [
            {label: 'Try again', value: 'retry', variant: 'primary'},
            {cancel: true, label: 'Cancel', value: 'cancel'},
          ]);

          if (choice === 'retry') continue;
          return false;
        }

        await choose(
          {
            phase: NFC_TAP_PHASE.DONE,
            title: 'Gift card written',
            detail: null,
          },
          [{cancel: true, label: 'Done', value: 'done', variant: 'primary'}],
        );
        return true;
      }
    } finally {
      setNfcTap(null);
    }
  }, [card]);

  return {
    copied,
    copyLink,
    nfcTap,
    resetSharing,
    shareNative,
    shareNfc,
  };
};

export const GiftCardNfcProgressModal = ({nfcTap}) => (
  <NfcTapModal
    {...nfcTap}
    testID="giftCard.nfcTap"
    visible={nfcTap != null}
  />
);
