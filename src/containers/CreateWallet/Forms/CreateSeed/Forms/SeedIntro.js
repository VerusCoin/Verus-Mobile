import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {ClipboardCheck} from 'lucide-react-native';
import AppButton from '../../../../../components/AppButton';
import BottomSheetModal from '../../../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../../globals/fonts';
import {
  createSignedOutFlowStyles,
  createSignedOutSheetStyles,
} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import CompactSetupHeader from '../../../../Onboard/components/CompactSetupHeader';
import {SETUP_STEP_TITLES} from '../../../../Onboard/setupStepTitles';

const GUIDANCE = [
  {
    key: 'verify',
    IconComponent: ClipboardCheck,
    text: 'You will verify a few words before setup finishes.',
  },
];

export default function SeedIntro({
  navigation,
  ensureNewSeed,
  onNext,
  onBack,
  showHeader = true,
  verifyText,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const contentProgress = useRef(new Animated.Value(0)).current;
  const pendingSeedRef = useRef(null);
  const warningConfirmedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) {
          return;
        }

        if (reduceMotionEnabled) {
          contentProgress.setValue(1);
          return;
        }

        contentProgress.setValue(0);
        animation = Animated.timing(contentProgress, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          contentProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      contentProgress.stopAnimation();
    };
  }, [contentProgress]);

  const contentAnimatedStyle = {
    opacity: contentProgress,
    transform: [
      {
        translateY: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  const renderGuidanceText = item => {
    if (!item.emphasis) {
      return <Text style={styles.guidanceText}>{item.text}</Text>;
    }

    return (
      <Text style={styles.guidanceText}>
        <Text style={styles.guidanceTextEmphasis}>{item.emphasis}</Text>
        {` ${item.text}`}
      </Text>
    );
  };

  const continueToSeedWords = seed => {
    if (onNext) {
      onNext(seed);
    } else {
      navigation.navigate('SeedWords', {seed});
    }
  };

  const showRecoveryPhrase = async () => {
    setLoading(true);

    try {
      const seed = await ensureNewSeed();

      if (seed) {
        pendingSeedRef.current = seed;
        warningConfirmedRef.current = false;
        setWarningVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const closeWarning = () => {
    warningConfirmedRef.current = false;
    setWarningVisible(false);
  };

  const confirmWarning = () => {
    warningConfirmedRef.current = true;
    setWarningVisible(false);
  };

  const handleWarningClosed = () => {
    const seed = pendingSeedRef.current;
    pendingSeedRef.current = null;

    if (warningConfirmedRef.current && seed) {
      continueToSeedWords(seed);
    }

    warningConfirmedRef.current = false;
  };

  return (
    <View style={signedOutFlowStyles.container}>
      {showHeader ? (
        <CompactSetupHeader
          onBack={onBack || (() => navigation.goBack())}
          progress={0.75}
          title={SETUP_STEP_TITLES.SEED_INTRO}
        />
      ) : null}
      <Animated.View
        style={[
          signedOutFlowStyles.content,
          signedOutFlowStyles.afterHeaderTitle,
          contentAnimatedStyle,
        ]}>
        <View style={signedOutFlowStyles.form}>
          <View style={styles.guidanceList}>
            {GUIDANCE.map(item =>
              verifyText && item.key === 'verify' ? {...item, text: verifyText} : item,
            ).map(item => (
              <View key={item.key} style={styles.guidanceRow}>
                <item.IconComponent
                  color={theme.colors.textSubtle}
                  size={28}
                  strokeWidth={2.1}
                />
                {renderGuidanceText(item)}
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
      <SafeBottomActionStack>
        <AppButton
          disabled={loading}
          height={56}
          loading={loading}
          onPress={showRecoveryPhrase}
          testID="onboarding.seedIntro.showPhrase"
          variant="primary">
          {'Show Secret Recovery Phrase'}
        </AppButton>
      </SafeBottomActionStack>
      <BottomSheetModal
        visible={warningVisible}
        onClose={closeWarning}
        onClosed={handleWarningClosed}
        maxHeight="64%">
        <View style={styles.warningSheet}>
          <Text style={styles.warningTitle}>
            {'Protect your Secret Recovery Phrase'}
          </Text>
          <Text style={[signedOutSheetStyles.bodyText, styles.warningBody]}>
            {
              'Never share your Secret Recovery Phrase with anyone. Anyone with these words can control your wallet.'
            }
          </Text>
          <Text style={[signedOutSheetStyles.bodyText, styles.warningBody]}>
            {'Verus will never ask for it.'}
          </Text>
          <AppButton
            height={56}
            onPress={confirmWarning}
            style={styles.warningButton}
            testID="onboarding.recoveryWarning.confirm"
            variant="primary">
            {'I understand'}
          </AppButton>
        </View>
      </BottomSheetModal>
    </View>
  );
}

const createStyles = theme =>
  StyleSheet.create({
  guidanceList: {
    gap: 28,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  guidanceText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    ...fontStyle('regular'),
  },
  guidanceTextEmphasis: {
    color: theme.colors.textPrimary,
    ...fontStyle('semiBold'),
  },
  warningSheet: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  warningTitle: {
    color: theme.colors.textPrimary,
    fontSize: 21,
    lineHeight: 27,
    ...fontStyle('semiBold'),
  },
  warningBody: {
    marginTop: 12,
  },
  warningButton: {
    marginTop: 22,
  },
});
