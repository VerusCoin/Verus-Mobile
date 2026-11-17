import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SkeletonLoader, {
  SkeletonBlock,
} from '../../../../components/SkeletonLoader';
import AcknowledgeSheet from '../../../../components/AcknowledgeSheet';
import {
  dataRequestInfoStyles as createStyles,
  dataApprovalListStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  getGenericRequestDeliveryInfo,
  getGenericRequestDeliveryLabel,
} from '../../../../utils/deeplink/genericRequestDelivery';
import {unixToDate} from '../../../../utils/math';
import IdentityPickerSheet from '../VerusIdIdentityPickerSheet/IdentityPickerSheet';
import RequestCard from './RequestCard';
import {getResponseHostLabel} from './requestReviewCopy';
import DataApprovalList, {getItemApprovalLabel} from './DataApprovalList';
import DeepLinkReviewScrollView from './DeepLinkReviewScrollView';

export const formatReviewValue = value => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2) ?? String(value);
};

export const DataReviewLoading = ({label}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SkeletonLoader accessibilityLabel={label} style={styles.loading}>
      <SkeletonBlock width="62%" height={22} />
      <SkeletonBlock height={16} />
      <SkeletonBlock width="82%" height={16} />
    </SkeletonLoader>
  );
};

export const DataReviewNotice = ({title, children}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.noticeTitle}>{title}</Text>
      {children ? <Text style={styles.body}>{children}</Text> : null}
    </View>
  );
};

// Values remain selectable in full. A field structure makes ordinary credential
// data readable without inventing a semantic summary of arbitrary JSON.
export const DataReviewValue = ({value}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).map(([label, item]) => (
      <View key={label} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text selectable style={styles.value}>
          {formatReviewValue(item)}
        </Text>
      </View>
    ));
  }
  return (
    <Text selectable style={styles.value}>
      {formatReviewValue(value)}
    </Text>
  );
};

export default function DataRequestReview({
  requestAction,
  responderWord = 'as',
  responseCaption,
  props,
  identity,
  children,
  onContinue,
  primaryLabel,
  disabled,
  processing,
  error,
  approvalItems = [],
  consent,
  detailsSections = [],
}) {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const approvalStyles = useMemo(() => dataApprovalListStyles(theme), [theme]);
  const [unreadableReview, setUnreadableReview] = useState(null);
  const [ackVisible, setAckVisible] = useState(false);
  const scrollRef = useRef(null);
  const openItemRef = useRef(null);
  const resetNoticeRef = useRef(null);
  const clearedRef = useRef(consent.cleared);
  clearedRef.current = consent.cleared;
  const previousChecked = useRef(consent.checked);
  const reviewChanged = useRef(false);
  const revealOpenItem = useCallback(() => {
    if (reviewChanged.current) {
      // Reveal the open item. After a reset, keep the notice that explains it
      // above item 1.
      scrollRef.current?.scrollIntoView(
        openItemRef,
        clearedRef.current ? resetNoticeRef : undefined,
      );
    }
  }, []);
  useEffect(() => {
    // Initial loading/identity selection keeps the request card first. Only
    // an approval, Undo, or a reset of existing approvals enables scrolling.
    if (previousChecked.current !== consent.checked &&
      [...Object.values(previousChecked.current), ...Object.values(consent.checked)]
        .some(Boolean)) {
      reviewChanged.current = true;
    }
    previousChecked.current = consent.checked;
    revealOpenItem();
  }, [consent.checked, consent.context, revealOpenItem]);
  const openItem = approvalItems.find(item => !consent.checked[item.key]);
  const approve = item => {
    if (processing || !item || item.key !== openItem?.key) return;
    consent.toggle(item.key);
    const announcement = `${item.title} approved`;
    if (AccessibilityInfo.announceForAccessibilityWithOptions) {
      AccessibilityInfo.announceForAccessibilityWithOptions(announcement, {
        queue: true,
      });
    } else {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  };
  const delivery = getGenericRequestDeliveryInfo(props.request);
  const selected = identity.selectedIdentity;
  const sections = [
    {
      title: 'Request',
      rows: [
        {
          label: 'Network',
          value: props.signerSystemName || props.signerSystemID,
        },
        {
          label: 'Signed',
          value: props.sigtime ? unixToDate(props.sigtime) : null,
        },
        {
          label: 'Delivery',
          value:
            getGenericRequestDeliveryLabel(delivery) || 'No callback requested',
        },
        {label: 'Response URI', value: delivery.uriString, copy: true},
        {label: 'Responding VerusID', value: selected?.iAddress},
        {label: 'Required VerusID', value: identity.requiredIdentity},
      ],
    },
    ...detailsSections,
  ];
  const actionLabel = !identity.walletReady
    ? identity.signedIn
      ? 'Switch wallet'
      : 'Unlock wallet'
    : identity.lookupStatus === 'error'
    ? 'Retry VerusID lookup'
    : identity.lookupStatus === 'loading'
    ? 'Loading VerusIDs'
    : identity.signerConflict
    ? 'Cannot use this VerusID'
    : identity.requiredSignerUnavailable
    ? 'Switch wallet'
    : !selected
    ? 'Choose VerusID'
    : openItem
    ? openItem.unreadable
      ? 'Check unreadable data'
      : getItemApprovalLabel(openItem.title)
    : primaryLabel;
  const action = () => {
    if (actionDisabled) return;
    if (!identity.walletReady || identity.requiredSignerUnavailable)
      return identity.unlock();
    if (identity.lookupStatus === 'error') return identity.retry();
    if (!selected) return identity.setIdentitySheetVisible(true);
    if (openItem) {
      if (openItem.unreadable) {
        setUnreadableReview({context: consent.context, item: openItem});
        setAckVisible(true);
      } else {
        approve(openItem);
      }
      return;
    }
    return onContinue();
  };
  const requestNetworkName = props.request?.isTestnet() ? 'Testnet' : 'Mainnet';
  const actionDisabled =
    processing ||
    identity.noRequestNetworkWallet ||
    identity.unlocking ||
    identity.signerConflict ||
    (identity.walletReady && identity.lookupStatus === 'loading') ||
    (identity.walletReady && !!selected && disabled);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <IdentityPickerSheet
        visible={
          identity.walletReady && identity.identitySheetVisible && !processing
        }
        linkingEnabled={false}
        provisioningEnabled={false}
        linkedIds={identity.linkedIds}
        sortedIds={identity.sortedIds}
        isIdentityAllowed={identity.isIdentityAllowed}
        selectedIdentity={selected}
        onClose={() => identity.setIdentitySheetVisible(false)}
        onSelect={identity.selectIdentity}
      />
      <AcknowledgeSheet
        visible={
          ackVisible && unreadableReview?.context === consent.context && !processing
        }
        title="Approve unreadable data?"
        message={[
          props.signerFqn && unreadableReview?.item.descriptorLabel
            ? `${props.signerFqn} calls them “${unreadableReview.item.descriptorLabel}”.`
            : null,
          'Approve only if you know what they are for.',
        ].filter(Boolean).join(' ')}
        confirmLabel="Approve unreadable data"
        dismissLabel="Not now"
        onClose={() => setAckVisible(false)}
        onAcknowledged={() => {
          if (
            unreadableReview?.context === consent.context && openItem?.unreadable
          ) {
            approve(unreadableReview.item);
          }
        }}>
        <View style={approvalStyles.sheetBytes}>
          <Text selectable style={approvalStyles.bytes}>
            {unreadableReview?.item.bytes}
          </Text>
        </View>
      </AcknowledgeSheet>
      <DeepLinkReviewScrollView ref={scrollRef} showScrollCue requestCard>
        <RequestCard
          action={requestAction}
          requester={props}
          sections={sections}
          showResponder={!!selected}
          responderName={selected?.friendlyName}
          responderWord={responderWord}
          onPressResponder={selected && !processing ? () => identity.setIdentitySheetVisible(true) : undefined}
          caption={delivery.destinationHost
            ? responseCaption(getResponseHostLabel(delivery.destinationHost))
            : 'No response will be sent to the requester.'}
        />
        <View style={styles.section}>
          {identity.signerConflict ? (
            <DataReviewNotice title="Different VerusID required">
              An earlier step used a different VerusID. Cancel and restart this
              request with the required VerusID.
            </DataReviewNotice>
          ) : identity.noRequestNetworkWallet ? (
            <DataReviewNotice title={`No ${requestNetworkName} wallet`}>
              {`This request needs a ${requestNetworkName} wallet. Add one, then open the request again.`}
            </DataReviewNotice>
          ) : !identity.walletReady ? (
            <DataReviewNotice
              title={
                identity.signedIn
                  ? 'Switch wallet to review'
                  : 'Unlock wallet to review'
              }>
              {`Use a ${requestNetworkName} wallet to choose the responding VerusID.`}
            </DataReviewNotice>
          ) : identity.lookupStatus === 'loading' ? (
            <DataReviewLoading label="Loading VerusIDs" />
          ) : identity.lookupStatus === 'error' ? (
            <DataReviewNotice title="Unable to load VerusIDs">
              Retry to load the VerusIDs in this wallet.
            </DataReviewNotice>
          ) : identity.requiredSignerUnavailable ? (
            <DataReviewNotice title="Required VerusID unavailable">
              Switch to a wallet with the required VerusID linked. Its full
              address is in request details.
            </DataReviewNotice>
          ) : !selected ? (
            <DataReviewNotice title="No linked VerusIDs">
              Link a VerusID from Identity in your wallet, then reopen this
              request.
            </DataReviewNotice>
          ) : (
            <>
              {children}
              {consent.cleared ? (
                <View
                  ref={resetNoticeRef}
                  collapsable={false}
                  accessibilityLiveRegion="polite"
                  style={approvalStyles.resetNotice}>
                  <Text style={approvalStyles.resetNoticeText}>
                    Approvals cleared. You chose another VerusID.
                  </Text>
                </View>
              ) : null}
              {approvalItems.length > 0 ? (
                <DataApprovalList
                  items={approvalItems}
                  consent={consent}
                  processing={processing}
                  openItemRef={openItemRef}
                  onOpenItemLayout={revealOpenItem}
                />
              ) : null}
            </>
          )}
        </View>
      </DeepLinkReviewScrollView>
      <SafeBottomActionStack
        gap={10}
        horizontalSpacing={24}
        style={styles.footer}>
        {error ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          height={56}
          variant="primary"
          themeMode={theme.mode}
          disabled={actionDisabled}
          onPress={action}>
          {processing ? 'Preparing response' : actionLabel}
        </AppButton>
        <AppButton
          height={56}
          variant="secondary"
          themeMode={theme.mode}
          disabled={processing}
          onPress={props.cancel}>
          Cancel
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
}
