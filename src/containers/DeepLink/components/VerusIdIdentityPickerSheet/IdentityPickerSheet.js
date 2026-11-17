import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {BadgePlus, Check, ChevronLeft, Link2} from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {fontStyle} from '../../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {PROVISIONING_REQUEST_STATUSES} from '../../../../utils/verusid/provisioningRequestState';
import LinkExistingVerusIdSheet, {
  LINK_EXISTING_VERUSID_SHEET_MODES,
} from './LinkExistingVerusIdSheet';

export const VERUSID_SHEET_MODES = {
  CHOOSE: 'choose',
  LINK: 'link',
};

const HEADER_ROW_HEIGHT = 36;
const EXIT_ANIMATION_DURATION = 90;
const ENTER_ANIMATION_DURATION = 170;
const ROW_ENTER_ANIMATION_DURATION = 180;
const ROW_STAGGER_DURATION = 24;
const TRANSITION_DISTANCE = 14;
const LINK_SHEET_MAX_HEIGHT_RATIO = 0.76;
const LINK_SHEET_SIDE_MARGIN = 12;
const LINK_SHEET_INTERNAL_TOP_PADDING = 10;
const LINK_SHEET_BODY_VERTICAL_PADDING = 26;
const LINK_SHEET_SEARCH_HEIGHT = 50;
const LINK_SHEET_SEARCH_MARGIN_BOTTOM = 10;
const CANDIDATE_ROW_TOTAL_HEIGHT = 64;
const LIST_CONTENT_VERTICAL_PADDING = 4;
const TARGET_VISIBLE_ROWS = 6;
const TARGET_VISIBLE_ROWS_WITH_KEYBOARD = 4;
const MIN_VISIBLE_ROWS_WITH_KEYBOARD = 1;
// `LinkExistingVerusIdSheet` renders the manual entry row only when the
// automatic lookup fails. The row's shared `actionRow` style is 62 points tall.
// While the row or the manual step shows, that room is sheet chrome and must be
// reserved before the scrollable candidate viewport is sized.
const MANUAL_LINK_ROW_HEIGHT = 62;

const getLinkSheetMetrics = ({
  height,
  insets,
  keyboardHeight,
  keyboardVisible,
  manualRoomVisible,
  searchVisible,
}) => {
  const targetRows = keyboardVisible
    ? TARGET_VISIBLE_ROWS_WITH_KEYBOARD
    : TARGET_VISIBLE_ROWS;
  const desiredListHeight =
    targetRows * CANDIDATE_ROW_TOTAL_HEIGHT + LIST_CONTENT_VERTICAL_PADDING;
  const sheetChromeHeight =
    LINK_SHEET_INTERNAL_TOP_PADDING +
    LINK_SHEET_BODY_VERTICAL_PADDING +
    HEADER_ROW_HEIGHT +
    (searchVisible
      ? LINK_SHEET_SEARCH_HEIGHT + LINK_SHEET_SEARCH_MARGIN_BOTTOM
      : 0) +
    (manualRoomVisible ? MANUAL_LINK_ROW_HEIGHT : 0);
  const defaultMaxSheetHeight = height * LINK_SHEET_MAX_HEIGHT_RATIO;
  const availableSheetHeight = keyboardVisible
    ? height -
      keyboardHeight -
      insets.top -
      Math.max(insets.bottom, LINK_SHEET_SIDE_MARGIN) -
      LINK_SHEET_SIDE_MARGIN
    : defaultMaxSheetHeight;
  // At minimum the sheet keeps one candidate row plus any shown manual row
  // reachable, so a compact keyboard layout never hides the manual route.
  const minimumSheetHeight =
    sheetChromeHeight +
    MIN_VISIBLE_ROWS_WITH_KEYBOARD * CANDIDATE_ROW_TOTAL_HEIGHT +
    LIST_CONTENT_VERTICAL_PADDING;
  const maxSheetHeight = Math.max(
    minimumSheetHeight,
    Math.min(defaultMaxSheetHeight, availableSheetHeight),
  );
  const availableListHeight = Math.max(
    CANDIDATE_ROW_TOTAL_HEIGHT + LIST_CONTENT_VERTICAL_PADDING,
    maxSheetHeight - sheetChromeHeight,
  );
  const candidateListHeight = Math.min(desiredListHeight, availableListHeight);

  return {
    candidateListHeight,
    sheetHeight: sheetChromeHeight + candidateListHeight,
  };
};

const getMatchingIdentities = ({
  linkedIds,
  sortedIds,
  isIdentityAllowed,
}) => {
  return Object.keys(sortedIds).flatMap(chainId => {
    const filteredIds = sortedIds[chainId].filter(iAddr =>
      isIdentityAllowed(chainId, iAddr),
    );

    return filteredIds.map(iAddress => ({
      chainId,
      iAddress,
      friendlyName: linkedIds[chainId][iAddress],
    }));
  });
};

const IdentityPickerSheet = ({
  visible,
  coinObj,
  isCandidateAllowed,
  linkedIds,
  sortedIds,
  isIdentityAllowed,
  selectedIdentity,
  linkingEnabled = true,
  provisioningEnabled = true,
  provisioningRequestState,
  initialMode = VERUSID_SHEET_MODES.CHOOSE,
  initialManualValue = '',
  onClose,
  onLinkCandidate,
  onManualLink,
  onRequestVerusId,
  onSelect,
  onUseProvisionedIdentity,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {height} = useWindowDimensions();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sheetMode, setSheetMode] = useState(initialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  // The link step shows its search field only from 7 found VerusIDs and tells
  // the sheet, so the sheet reserves room for the field only when it shows.
  const [linkSearchVisible, setLinkSearchVisible] = useState(false);
  // The link step also tells the sheet when it needs room for the manual row
  // or the manual step.
  const [linkManualRoomVisible, setLinkManualRoomVisible] = useState(false);
  // Mirrors `linkBusy` so same-frame guards (parent close, mode transitions)
  // read the in-flight child mutation synchronously instead of waiting for the
  // next render.
  const linkBusyRef = useRef(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const headerProgress = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);
  const rowAnimations = useRef([]).current;
  const [keyboardMetrics, setKeyboardMetrics] = useState({
    height: 0,
    visible: false,
  });
  const matchingIdentities = useMemo(
    () => getMatchingIdentities({linkedIds, sortedIds, isIdentityAllowed}),
    [linkedIds, sortedIds, isIdentityAllowed],
  );
  const matchingCount = matchingIdentities.length;
  const resolvedInitialMode =
    linkingEnabled && initialMode === VERUSID_SHEET_MODES.LINK
      ? VERUSID_SHEET_MODES.LINK
      : VERUSID_SHEET_MODES.CHOOSE;
  const linkSheetMetrics = getLinkSheetMetrics({
    height,
    insets,
    keyboardHeight: keyboardMetrics.height,
    keyboardVisible: keyboardMetrics.visible,
    manualRoomVisible: linkManualRoomVisible,
    searchVisible: linkSearchVisible,
  });

  useEffect(() => {
    if (visible) {
      setSheetMode(resolvedInitialMode);
      setIsTransitioning(false);
      contentOpacity.setValue(1);
      contentTranslateX.setValue(0);
      headerProgress.setValue(
        resolvedInitialMode === VERUSID_SHEET_MODES.LINK ? 1 : 0,
      );
      rowAnimations.forEach(animation => animation.setValue(1));
    }
  }, [
    contentOpacity,
    contentTranslateX,
    headerProgress,
    resolvedInitialMode,
    rowAnimations,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      setLinkBusy(false);
      linkBusyRef.current = false;
      setKeyboardMetrics({height: 0, visible: false});
      return undefined;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, event => {
      setKeyboardMetrics({
        height: event?.endCoordinates?.height || 0,
        visible: true,
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardMetrics({height: 0, visible: false});
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (active) {
          reduceMotionRef.current = reduceMotionEnabled;
        }
      })
      .catch(() => {
        reduceMotionRef.current = false;
      });

    return () => {
      active = false;
      contentOpacity.stopAnimation();
      contentTranslateX.stopAnimation();
      headerProgress.stopAnimation();
      rowAnimations.forEach(animation => animation.stopAnimation());
    };
  }, [contentOpacity, contentTranslateX, headerProgress, rowAnimations]);

  const getRowAnimation = index => {
    while (rowAnimations.length <= index) {
      rowAnimations.push(new Animated.Value(1));
    }

    return rowAnimations[index];
  };

  const animateRowsIn = rowCount => {
    const rowAnimationSet = rowAnimations
      .slice(0, rowCount)
      .map(animation => {
        animation.setValue(0);

        return Animated.timing(animation, {
          toValue: 1,
          duration: ROW_ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
      });

    Animated.stagger(ROW_STAGGER_DURATION, rowAnimationSet).start();
  };

  const transitionToMode = nextMode => {
    // Read the synchronous busy ref, not the `linkBusy` state: a same-frame
    // Back press can otherwise transition away from the link step after the
    // child has already reported an in-flight mutation.
    if (nextMode === sheetMode || isTransitioning || linkBusyRef.current) return;

    const forward = nextMode === VERUSID_SHEET_MODES.LINK;

    if (reduceMotionRef.current) {
      setSheetMode(nextMode);
      headerProgress.setValue(
        nextMode === VERUSID_SHEET_MODES.LINK ? 1 : 0,
      );
      rowAnimations.forEach(animation => animation.setValue(1));
      return;
    }

    setIsTransitioning(true);
    contentOpacity.stopAnimation();
    contentTranslateX.stopAnimation();
    headerProgress.stopAnimation();

    const exitAnimations = [
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: EXIT_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: forward ? -TRANSITION_DISTANCE : TRANSITION_DISTANCE,
        duration: EXIT_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ];

    if (!forward) {
      exitAnimations.push(
        Animated.timing(headerProgress, {
          toValue: 0,
          duration: EXIT_ANIMATION_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      );
    }

    Animated.parallel(exitAnimations).start(({finished}) => {
      if (!finished) {
        headerProgress.setValue(
          sheetMode === VERUSID_SHEET_MODES.LINK ? 1 : 0,
        );
        setIsTransitioning(false);
        return;
      }

      setSheetMode(nextMode);
      contentTranslateX.setValue(
        forward ? TRANSITION_DISTANCE : -TRANSITION_DISTANCE,
      );
      headerProgress.setValue(0);
      animateRowsIn(rowAnimations.length);

      const enterAnimations = [
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: ENTER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ];

      if (forward) {
        enterAnimations.push(
          Animated.timing(headerProgress, {
            toValue: 1,
            duration: ENTER_ANIMATION_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        );
      }

      Animated.parallel(enterAnimations).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleLinkExisting = () => {
    transitionToMode(VERUSID_SHEET_MODES.LINK);
  };

  // Writes the ref before the state update so the same-frame close/transition
  // guards already observe the in-flight link.
  const handleLinkBusyChange = useCallback(nextBusy => {
    linkBusyRef.current = nextBusy;
    setLinkBusy(nextBusy);
  }, []);

  // The child reports an in-flight link so the sheet cannot be dismissed
  // (backdrop, system back, or the nested Back transition) mid-mutation.
  const handleSheetClose = useCallback(() => {
    if (linkBusyRef.current) return;

    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  const headerAnimatedStyle = {
    height: headerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, HEADER_ROW_HEIGHT],
    }),
    opacity: headerProgress,
  };
  const backButtonAnimatedStyle = {
    opacity: headerProgress,
    transform: [
      {
        translateY: headerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 0],
        }),
      },
    ],
  };

  return (
    <BottomSheetModal
      avoidKeyboard={sheetMode === VERUSID_SHEET_MODES.LINK}
      closeDisabled={linkBusy}
      contentContainerStyle={
        sheetMode === VERUSID_SHEET_MODES.LINK
          ? {height: linkSheetMetrics.sheetHeight}
          : null
      }
      visible={visible}
      onClose={handleSheetClose}
      maxHeight={
        sheetMode === VERUSID_SHEET_MODES.LINK
          ? linkSheetMetrics.sheetHeight
          : '76%'
      }>
      <View style={[signedOutSheetStyles.body, signedOutSheetStyles.bodyShort]}>
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: contentOpacity,
              transform: [{translateX: contentTranslateX}],
            },
          ]}>
          <Animated.View
            pointerEvents={sheetMode === VERUSID_SHEET_MODES.LINK ? 'auto' : 'none'}
            style={[styles.headerRow, headerAnimatedStyle]}>
            {sheetMode === VERUSID_SHEET_MODES.LINK ? (
              <Animated.View style={backButtonAnimatedStyle}>
                <TouchableOpacity
                  accessibilityLabel="Back to VerusID options"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  disabled={isTransitioning || linkBusy}
                  onPress={() => transitionToMode(VERUSID_SHEET_MODES.CHOOSE)}
                  style={styles.backButton}>
                  <View style={signedOutSheetStyles.actionIcon}>
                    <ChevronLeft size={22} color={theme.colors.textPrimary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </Animated.View>
          {sheetMode === VERUSID_SHEET_MODES.LINK ? (
            <LinkExistingVerusIdSheet
              active={visible && sheetMode === VERUSID_SHEET_MODES.LINK}
              candidateListHeight={linkSheetMetrics.candidateListHeight}
              coinObj={coinObj}
              initialManualValue={initialManualValue}
              initialMode={
                initialManualValue
                  ? LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL
                  : LINK_EXISTING_VERUSID_SHEET_MODES.LIST
              }
              isCandidateAllowed={isCandidateAllowed}
              linkedIds={linkedIds}
              onBusyChange={handleLinkBusyChange}
              onLinkCandidate={onLinkCandidate}
              onManualLink={onManualLink}
              onManualRoomChange={setLinkManualRoomVisible}
              onSearchVisibleChange={setLinkSearchVisible}
            />
          ) : (
            <ScrollView
              alwaysBounceVertical={false}
              bounces={false}
              contentContainerStyle={signedOutSheetStyles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <ChooseRows
                disabled={isTransitioning}
                getRowAnimation={getRowAnimation}
                linkingEnabled={linkingEnabled}
                matchingCount={matchingCount}
                matchingIdentities={matchingIdentities}
                onLinkExisting={handleLinkExisting}
                onRequestVerusId={onRequestVerusId}
                onSelect={onSelect}
                onUseProvisionedIdentity={onUseProvisionedIdentity}
                provisioningEnabled={provisioningEnabled}
                provisioningRequestState={provisioningRequestState}
                selectedIdentity={selectedIdentity}
                signedOutSheetStyles={signedOutSheetStyles}
                styles={styles}
                theme={theme}
              />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </BottomSheetModal>
  );
};

const getRowAnimatedStyle = animatedValue => ({
  opacity: animatedValue,
  transform: [
    {
      translateY: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0],
      }),
    },
  ],
});

const ChooseRows = ({
  disabled,
  getRowAnimation,
  linkingEnabled,
  matchingCount,
  matchingIdentities,
  onLinkExisting,
  onRequestVerusId,
  onSelect,
  onUseProvisionedIdentity,
  provisioningEnabled,
  provisioningRequestState,
  selectedIdentity,
  signedOutSheetStyles,
  styles,
  theme,
}) => {
  let rowIndex = 0;
  const provisioningStatus =
    provisioningEnabled
      ? provisioningRequestState?.status ||
        PROVISIONING_REQUEST_STATUSES.REQUESTABLE
      : null;
  const canProvision =
    provisioningEnabled &&
    provisioningStatus === PROVISIONING_REQUEST_STATUSES.REQUESTABLE;
  const showPendingProvisioningRow =
    provisioningEnabled &&
    provisioningStatus === PROVISIONING_REQUEST_STATUSES.PENDING;
  const showReadyProvisioningRow =
    provisioningEnabled &&
    provisioningStatus === PROVISIONING_REQUEST_STATUSES.READY;
  const showFailedProvisioningRow =
    provisioningEnabled &&
    provisioningStatus === PROVISIONING_REQUEST_STATUSES.FAILED;
  const showProvisioningStatusRow =
    showPendingProvisioningRow ||
    showReadyProvisioningRow ||
    showFailedProvisioningRow;
  const provisioningDisplayName =
    provisioningRequestState?.displayName || 'VerusID';

  return (
    <>
      {matchingIdentities.map(identity => (
        <Animated.View
          key={`${identity.chainId}:${identity.iAddress}`}
          style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <IdentityRow
            disabled={disabled}
            identity={identity}
            isSelected={
              selectedIdentity &&
              selectedIdentity.chainId === identity.chainId &&
              selectedIdentity.iAddress === identity.iAddress
            }
            onSelect={() =>
              onSelect(
                identity.chainId,
                identity.iAddress,
                identity.friendlyName,
              )
            }
            styles={styles}
            theme={theme}
          />
        </Animated.View>
      ))}
      {matchingCount === 0 && !canProvision && !showProvisioningStatusRow && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {'No linked VerusIDs match this request.'}
            </Text>
          </View>
        </Animated.View>
      )}
      {showPendingProvisioningRow && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <ProvisioningStatusRow
            icon="progress-clock"
            title={provisioningDisplayName}
            body="A VerusID request is already in progress for this sign-in request. A notification will appear when it is ready."
            styles={styles}
            theme={theme}
          />
        </Animated.View>
      )}
      {showReadyProvisioningRow && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <ActionRow
            description={`${provisioningDisplayName} is ready. Use it to select this VerusID, then continue signing in.`}
            disabled={disabled || !onUseProvisionedIdentity}
            IconComponent={Check}
            label="Use"
            signedOutSheetStyles={signedOutSheetStyles}
            styles={styles}
            onPress={onUseProvisionedIdentity}
            theme={theme}
          />
        </Animated.View>
      )}
      {showFailedProvisioningRow && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <ActionRow
            description={`${provisioningDisplayName} could not be created.`}
            disabled={disabled}
            IconComponent={BadgePlus}
            label="Retry request"
            signedOutSheetStyles={signedOutSheetStyles}
            styles={styles}
            onPress={onRequestVerusId}
            theme={theme}
          />
        </Animated.View>
      )}
      {canProvision && (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <ActionRow
            disabled={disabled}
            IconComponent={BadgePlus}
            label="Request new VerusID"
            signedOutSheetStyles={signedOutSheetStyles}
            styles={styles}
            onPress={onRequestVerusId}
            theme={theme}
          />
        </Animated.View>
      )}
      {linkingEnabled ? (
        <Animated.View style={getRowAnimatedStyle(getRowAnimation(rowIndex++))}>
          <ActionRow
            disabled={disabled}
            IconComponent={Link2}
            label="Link existing VerusID"
            signedOutSheetStyles={signedOutSheetStyles}
            styles={styles}
            onPress={onLinkExisting}
            theme={theme}
          />
        </Animated.View>
      ) : null}
    </>
  );
};

const ActionRow = ({
  description,
  disabled,
  IconComponent,
  label,
  onPress,
  signedOutSheetStyles,
  styles,
  theme,
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={disabled ? 1 : 0.74}
    disabled={disabled}
    onPress={onPress}
    style={signedOutSheetStyles.actionRow}>
    <View
      style={[
        signedOutSheetStyles.actionIconContainer,
        signedOutSheetStyles.actionIcon,
      ]}>
      <IconComponent size={24} color={theme.colors.textPrimary} />
    </View>
    <View style={styles.actionText}>
      <Text numberOfLines={1} style={styles.actionLabel}>
        {label}
      </Text>
      {description ? (
        <Text numberOfLines={2} style={styles.actionDescription}>
          {description}
        </Text>
      ) : null}
    </View>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

const ProvisioningStatusRow = ({body, icon, styles, theme, title}) => (
  <View style={styles.provisioningStatusRow}>
    <View style={styles.provisioningStatusIcon}>
      <MaterialCommunityIcons
        name={icon}
        size={23}
        color={theme.colors.textPrimary}
      />
    </View>
    <View style={styles.provisioningStatusText}>
      <Text numberOfLines={1} style={styles.provisioningStatusTitle}>
        {title}
      </Text>
      <Text style={styles.provisioningStatusBody}>{body}</Text>
    </View>
  </View>
);

const IdentityRow = ({disabled, identity, isSelected, onSelect, styles, theme}) => (
  <TouchableOpacity
    accessibilityRole="button"
    // Android rejects a null accessibility state value, so pass a boolean.
    accessibilityState={{selected: !!isSelected}}
    activeOpacity={disabled ? 1 : 0.74}
    disabled={disabled}
    onPress={onSelect}
    style={[
      styles.identityRow,
      {
        backgroundColor: isSelected
          ? theme.colors.successBackground
          : theme.colors.surfaceMuted,
      },
    ]}>
    <View style={styles.identityText}>
      <Text numberOfLines={1} style={styles.identityName}>
        {identity.friendlyName}
      </Text>
    </View>
    <View style={styles.checkContainer}>
      {isSelected && (
        <Check color={theme.colors.success} size={20} strokeWidth={2.4} />
      )}
    </View>
  </TouchableOpacity>
);

const createStyles = theme =>
  StyleSheet.create({
    animatedContent: {
      flex: 0,
    },
    headerRow: {
      justifyContent: 'center',
      overflow: 'hidden',
    },
    backButton: {
      width: 40,
      height: HEADER_ROW_HEIGHT,
      marginLeft: -8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      minHeight: 54,
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      ...fontStyle('regular'),
    },
    actionText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    actionLabel: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    actionDescription: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
    provisioningStatusRow: {
      minHeight: 78,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    provisioningStatusIcon: {
      width: 30,
      height: 36,
      marginRight: 14,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.42,
    },
    provisioningStatusText: {
      flex: 1,
      minWidth: 0,
    },
    provisioningStatusTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      ...fontStyle('semiBold'),
    },
    provisioningStatusBody: {
      marginTop: 4,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
    identityRow: {
      height: 56,
      borderRadius: 18,
      paddingHorizontal: 16,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    identityText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },
    identityName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    checkContainer: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default IdentityPickerSheet;
