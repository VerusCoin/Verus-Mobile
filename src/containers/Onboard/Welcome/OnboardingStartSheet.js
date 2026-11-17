import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowDownToLine,
  ChevronLeft,
  CirclePlus,
  Gift,
  KeyRound,
  QrCode,
  SmartphoneNfc,
} from 'lucide-react-native';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SignedOutActionRow from '../../../components/SignedOutActionRow';
import {useNfcSupported} from '../../../hooks/useNfcSupported';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  IMPORT_METHODS,
  SETUP_PATHS,
} from '../onboardingSetupFlow';

const SHEET_MODES = {
  START: 'start',
  IMPORT: 'import',
};
const HEADER_ROW_HEIGHT = 36;
const EXIT_ANIMATION_DURATION = 90;
const ENTER_ANIMATION_DURATION = 170;
const ROW_ENTER_ANIMATION_DURATION = 180;
const ROW_STAGGER_DURATION = 24;
const TRANSITION_DISTANCE = 14;

const START_ACTIONS = [
  {
    label: 'Create a new wallet',
    IconComponent: CirclePlus,
    testID: 'onboarding.startSheet.createWallet',
    selection: {
      setupPath: SETUP_PATHS.CREATE,
    },
  },
  {
    label: 'Import an existing wallet',
    IconComponent: ArrowDownToLine,
    testID: 'onboarding.startSheet.importWallet',
    nextMode: SHEET_MODES.IMPORT,
  },
  {
    label: 'Restore from NFC backup',
    IconComponent: SmartphoneNfc,
    testID: 'onboarding.startSheet.importNfc',
    selection: {
      setupPath: SETUP_PATHS.IMPORT,
      importMethod: IMPORT_METHODS.NFC,
    },
  },
];

// Shown only to callers that pass onClaimFromNfc, on devices with NFC.
const CLAIM_FROM_NFC_ACTION = {
  label: 'Claim from NFC card',
  IconComponent: Gift,
  testID: 'onboarding.startSheet.claimNfc',
  claimFromNfc: true,
};
const MAX_ROW_COUNT = START_ACTIONS.length + 1;

const IMPORT_ACTIONS = [
  {
    label: 'Import Secret Recovery Phrase',
    IconComponent: ArrowDownToLine,
    testID: 'onboarding.startSheet.importSeed',
    selection: {
      setupPath: SETUP_PATHS.IMPORT,
      importMethod: IMPORT_METHODS.SEED,
    },
  },
  {
    label: 'Scan QR code',
    IconComponent: QrCode,
    testID: 'onboarding.startSheet.importQr',
    selection: {
      setupPath: SETUP_PATHS.IMPORT,
      importMethod: IMPORT_METHODS.QR,
    },
  },
  {
    label: 'Enter custom seed or private key',
    IconComponent: KeyRound,
    testID: 'onboarding.startSheet.importText',
    selection: {
      setupPath: SETUP_PATHS.IMPORT,
      importMethod: IMPORT_METHODS.TEXT,
    },
  },
];

const OnboardingStartSheet = ({
  visible,
  onClose,
  onSelectSetup,
  onClaimFromNfc,
}) => {
  const theme = useOnboardingTheme();
  const nfcSupported = useNfcSupported();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const [sheetMode, setSheetMode] = useState(SHEET_MODES.START);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingActionRef = useRef(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const headerProgress = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);
  const rowAnimations = useRef(
    Array.from({length: MAX_ROW_COUNT}, () => new Animated.Value(1)),
  ).current;
  const startActions = useMemo(
    () =>
      typeof onClaimFromNfc === 'function' && nfcSupported
        ? [...START_ACTIONS, CLAIM_FROM_NFC_ACTION]
        : START_ACTIONS,
    [nfcSupported, onClaimFromNfc],
  );
  const actions =
    sheetMode === SHEET_MODES.IMPORT ? IMPORT_ACTIONS : startActions;

  useEffect(() => {
    if (visible) {
      setSheetMode(SHEET_MODES.START);
      setIsTransitioning(false);
      contentOpacity.setValue(1);
      contentTranslateX.setValue(0);
      headerProgress.setValue(0);
      rowAnimations.forEach(animation => animation.setValue(1));
    }
  }, [
    contentOpacity,
    contentTranslateX,
    headerProgress,
    rowAnimations,
    visible,
  ]);

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

  const animateRowsIn = nextActions => {
    const rowAnimationSet = rowAnimations
      .slice(0, nextActions.length)
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
    if (nextMode === sheetMode || isTransitioning) return;

    const nextActions =
      nextMode === SHEET_MODES.IMPORT ? IMPORT_ACTIONS : startActions;
    const forward = nextMode === SHEET_MODES.IMPORT;

    if (reduceMotionRef.current) {
      setSheetMode(nextMode);
      headerProgress.setValue(nextMode === SHEET_MODES.IMPORT ? 1 : 0);
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
        headerProgress.setValue(sheetMode === SHEET_MODES.IMPORT ? 1 : 0);
        setIsTransitioning(false);
        return;
      }

      setSheetMode(nextMode);
      contentTranslateX.setValue(
        forward ? TRANSITION_DISTANCE : -TRANSITION_DISTANCE,
      );
      headerProgress.setValue(0);
      animateRowsIn(nextActions);

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

  const handleSelection = selection => {
    if (isTransitioning) return;

    pendingActionRef.current =
      typeof onSelectSetup === 'function'
        ? () => onSelectSetup(selection)
        : null;
    onClose();
  };

  // The read starts after the sheet closes, so the system NFC prompt does not
  // cover a closing sheet.
  const handleClaimFromNfc = () => {
    if (isTransitioning) return;

    pendingActionRef.current = onClaimFromNfc;
    onClose();
  };

  const handleClosed = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    contentOpacity.stopAnimation();
    contentTranslateX.stopAnimation();
    headerProgress.stopAnimation();
    rowAnimations.forEach(animation => animation.stopAnimation());
    setSheetMode(SHEET_MODES.START);
    setIsTransitioning(false);
    contentOpacity.setValue(1);
    contentTranslateX.setValue(0);
    headerProgress.setValue(0);
    rowAnimations.forEach(animation => animation.setValue(1));

    if (typeof pendingAction === 'function') {
      pendingAction();
    }
  };
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
      visible={visible}
      onClose={onClose}
      onClosed={handleClosed}
      maxHeight="78%">
      <View style={[styles.body, styles.bodyShort]}>
        <Animated.View
          style={[
            localStyles.animatedContent,
            {
              opacity: contentOpacity,
              transform: [{translateX: contentTranslateX}],
            },
          ]}>
          <Animated.View
            pointerEvents={sheetMode === SHEET_MODES.IMPORT ? 'auto' : 'none'}
            style={[localStyles.headerRow, headerAnimatedStyle]}>
            {sheetMode === SHEET_MODES.IMPORT ? (
              <Animated.View style={backButtonAnimatedStyle}>
                <TouchableOpacity
                  accessibilityLabel="Back to setup options"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  disabled={isTransitioning}
                  onPress={() => transitionToMode(SHEET_MODES.START)}
                  style={localStyles.backButton}>
                  <View style={styles.actionIcon}>
                    <ChevronLeft size={22} color={theme.colors.textPrimary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </Animated.View>
          {actions.map((action, index) => (
            <SignedOutActionRow
              key={action.label}
              animatedValue={rowAnimations[index]}
              disabled={isTransitioning}
              label={action.label}
              iconSize={action.iconSize}
              IconComponent={action.IconComponent}
              testID={action.testID}
              onPress={
                action.claimFromNfc
                  ? handleClaimFromNfc
                  : action.nextMode
                  ? () => transitionToMode(action.nextMode)
                  : () => handleSelection(action.selection)
              }
            />
          ))}
        </Animated.View>
      </View>
    </BottomSheetModal>
  );
};

const localStyles = StyleSheet.create({
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
});

export default OnboardingStartSheet;
