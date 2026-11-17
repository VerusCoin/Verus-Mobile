import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../../../components/AppButton';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../../globals/fonts';
import {createSignedOutFlowStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../../hooks/useOnboardingSmallDeviceLayout';
import CompactSetupHeader from '../../../../Onboard/components/CompactSetupHeader';
import {getSeedWordsTitle} from '../../../../Onboard/setupStepTitles';

export const WORDS_PER_STEP = 8;
const VERIFY_WORD_COUNT = 3;
const VERIFY_OPTION_COUNT = 4;
const PAGE_ANIMATION_DURATION = 320;

const getRandomInt = max => Math.floor(Math.random() * max);

const shuffle = items => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

// Ask one word from each part of the phrase. The other choices are words from
// the same part, so only the written phrase tells them apart. A blind guess
// passes 1 time in 64. The check gives no result until every word is picked:
// a result per tap lets anyone pass without a written phrase.
const createVerifyQuestions = words => {
  const count = Math.min(VERIFY_WORD_COUNT, words.length);

  return Array.from({length: count}, (_, part) => {
    const start = Math.floor((part * words.length) / count);
    const end = Math.floor(((part + 1) * words.length) / count);
    const index = start + getRandomInt(end - start);
    const answer = words[index];
    const otherWords = list =>
      shuffle([...new Set(list)].filter(word => word !== answer));
    const partWords = otherWords(words.slice(start, end));
    // A phrase with repeated words can run short of choices in one part.
    const phraseWords = otherWords(words).filter(
      word => !partWords.includes(word),
    );
    const decoys = [...partWords, ...phraseWords].slice(
      0,
      VERIFY_OPTION_COUNT - 1,
    );

    return {index, options: shuffle([answer, ...decoys])};
  });
};

const toOptionRows = options =>
  options.reduce((rows, option, index) => {
    if (index % 2 === 0) {
      rows.push([option]);
    } else {
      rows[rows.length - 1].push(option);
    }

    return rows;
  }, []);

export default function SeedWords({
  navigation,
  newSeed,
  onComplete,
  onBack,
  formStep: controlledFormStep,
  setFormStep: controlledSetFormStep,
  showHeader = true,
  completionLabel = 'Create wallet',
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const seedWords = useMemo(
    () => (newSeed ? newSeed.split(' ').filter(Boolean) : []),
    [newSeed],
  );
  const totalWordSteps = Math.ceil(seedWords.length / WORDS_PER_STEP);
  const [internalFormStep, setInternalFormStep] = useState(0);
  const [verifyQuestions, setVerifyQuestions] = useState([]);
  const [verifyPicks, setVerifyPicks] = useState([]);
  // Null until a wrong answer. Then one flag per word, and the picks lock.
  const [verifyMismatches, setVerifyMismatches] = useState(null);
  const pageProgress = useRef(new Animated.Value(0)).current;
  const {keyboardVisible, smallDevice} = useOnboardingSmallDeviceLayout();
  const formStep =
    controlledFormStep == null ? internalFormStep : controlledFormStep;
  const setActiveFormStep = controlledSetFormStep || setInternalFormStep;

  const isAtEnd = formStep >= totalWordSteps;
  const firstIndex = formStep * WORDS_PER_STEP;
  const displayWords = isAtEnd
    ? []
    : seedWords.slice(firstIndex, firstIndex + WORDS_PER_STEP);
  const verifyFailed = verifyMismatches != null;
  const allVerifyWordsPicked =
    verifyQuestions.length > 0 &&
    verifyQuestions.every((_, index) => verifyPicks[index] != null);
  const canContinue = !isAtEnd || verifyFailed || allVerifyWordsPicked;
  const progress = isAtEnd ? 0.95 : Math.min(0.9, 0.78 + formStep * 0.07);
  const pageAnimatedStyle = {
    opacity: pageProgress,
    transform: [
      {
        translateY: pageProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: pageProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  useEffect(() => {
    setActiveFormStep(0);
  }, [newSeed, setActiveFormStep]);

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        pageProgress.stopAnimation();

        if (reduceMotionEnabled) {
          pageProgress.setValue(1);
          return;
        }

        pageProgress.setValue(0);
        animation = Animated.timing(pageProgress, {
          toValue: 1,
          duration: PAGE_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          pageProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      pageProgress.stopAnimation();
    };
  }, [formStep, isAtEnd, pageProgress]);

  // Each visit to the check gets new words and new choices. A layout effect
  // keeps the last check from showing for a frame.
  useLayoutEffect(() => {
    if (isAtEnd && seedWords.length > 0) {
      const questions = createVerifyQuestions(seedWords);

      setVerifyQuestions(questions);
      setVerifyPicks(new Array(questions.length).fill(null));
      setVerifyMismatches(null);
    }
  }, [isAtEnd, seedWords]);

  const pickVerifyWord = (questionIndex, word) => {
    if (verifyFailed) return;

    setVerifyPicks(picks =>
      picks.map((pick, index) => (index === questionIndex ? word : pick)),
    );
  };

  const verifySeed = () => {
    const mismatches = verifyQuestions.map(
      (question, index) => verifyPicks[index] !== seedWords[question.index],
    );

    if (mismatches.some(Boolean)) {
      setVerifyMismatches(mismatches);
      return;
    }

    onComplete();
  };

  const next = () => {
    if (!canContinue) return;

    if (!isAtEnd) {
      setActiveFormStep(step => step + 1);
    } else if (verifyFailed) {
      // Show the words again from the start. The next check is new.
      setActiveFormStep(0);
    } else {
      verifySeed();
    }
  };

  const back = () => {
    if (formStep > 0) {
      setActiveFormStep(step => step - 1);
    } else {
      if (onBack) {
        onBack();
      } else {
        navigation.goBack();
      }
    }
  };

  const getPrimaryLabel = () => {
    if (isAtEnd) {
      return verifyFailed ? 'Show words again' : completionLabel;
    }

    if (formStep === totalWordSteps - 1) return 'Verify phrase';

    return 'Next words';
  };

  const getWordTileAnimatedStyle = index => {
    const start = Math.min(0.5, 0.08 + index * 0.045);

    return {
      opacity: pageProgress.interpolate({
        inputRange: [0, start, 1],
        outputRange: [0, 0, 1],
      }),
      transform: [
        {
          translateY: pageProgress.interpolate({
            inputRange: [0, start, 1],
            outputRange: [18, 18, 0],
          }),
        },
        {
          scale: pageProgress.interpolate({
            inputRange: [0, start, 1],
            outputRange: [0.97, 0.97, 1],
          }),
        },
      ],
    };
  };

  return (
    <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
      {showHeader ? (
        <CompactSetupHeader
          onBack={back}
          progress={progress}
          title={getSeedWordsTitle(isAtEnd)}
        />
      ) : null}
      <TouchableWithoutFeedback
        accessible={false}
        onPress={() => Keyboard.dismiss()}>
        <View style={styles.content}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              signedOutFlowStyles.scrollContent,
              signedOutFlowStyles.afterHeaderTitle,
            ]}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[signedOutFlowStyles.form, pageAnimatedStyle]}>
              {isAtEnd && smallDevice ? null : (
                <Text style={styles.contextText}>
                  {isAtEnd
                    ? 'Choose each word from your written phrase.'
                    : `Write down words ${firstIndex + 1}–${
                        firstIndex + displayWords.length
                      } of ${seedWords.length}`}
                </Text>
              )}
              {isAtEnd ? (
                <View
                  style={[
                    styles.verifyForm,
                    smallDevice && styles.verifyFormSmallDevice,
                  ]}>
                  {verifyQuestions.map((question, questionIndex) => {
                    const pick = verifyPicks[questionIndex];
                    const mismatch = verifyMismatches?.[questionIndex];

                    return (
                      <View
                        key={question.index}
                        style={
                          questionIndex > 0 && [
                            styles.verifyGroupSpaced,
                            smallDevice && styles.verifyGroupSpacedSmallDevice,
                          ]
                        }>
                        <Text style={styles.verifyLabel}>
                          {`Word ${question.index + 1}`}
                        </Text>
                        <View
                          style={[
                            styles.verifyOptions,
                            smallDevice && styles.verifyOptionsSmallDevice,
                          ]}>
                          {toOptionRows(question.options).map(
                            (row, rowIndex) => (
                              <View
                                key={rowIndex}
                                style={[
                                  styles.verifyOptionRow,
                                  smallDevice &&
                                    styles.verifyOptionsSmallDevice,
                                ]}>
                                {row.map((option, columnIndex) => {
                                  const selected = option === pick;
                                  const error = selected && mismatch;

                                  return (
                                    <TouchableOpacity
                                      accessibilityRole="button"
                                      accessibilityState={{
                                        disabled: verifyFailed,
                                        selected,
                                      }}
                                      activeOpacity={0.78}
                                      disabled={verifyFailed}
                                      key={option}
                                      onPress={() =>
                                        pickVerifyWord(questionIndex, option)
                                      }
                                      testID={`onboarding.seedWords.verify.${
                                        questionIndex + 1
                                      }.option.${rowIndex * 2 + columnIndex + 1}`}
                                      style={[
                                        styles.verifyOption,
                                        smallDevice &&
                                          styles.verifyOptionSmallDevice,
                                        selected && styles.verifyOptionSelected,
                                        error && styles.verifyOptionError,
                                        verifyFailed &&
                                          !selected &&
                                          styles.verifyOptionLocked,
                                      ]}>
                                      <Text
                                        numberOfLines={1}
                                        style={[
                                          styles.verifyOptionText,
                                          selected &&
                                            styles.verifyOptionTextSelected,
                                          error && styles.verifyOptionTextError,
                                        ]}>
                                        {option}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                                {row.length === 1 ? (
                                  <View style={styles.verifyOptionSpacer} />
                                ) : null}
                              </View>
                            ),
                          )}
                        </View>
                        {mismatch ? (
                          <Text style={styles.verifyError}>
                            Does not match.
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.wordsGrid}>
                  {displayWords.map((word, index) => (
                    <Animated.View
                      key={`${firstIndex + index}-${word}`}
                      style={[
                        styles.wordTile,
                        getWordTileAnimatedStyle(index),
                      ]}>
                      <Text style={styles.wordIndex}>
                        {firstIndex + index + 1}
                      </Text>
                      <Text
                        style={styles.wordText}
                        testID={`onboarding.seedWords.word.${
                          firstIndex + index + 1
                        }`}>
                        {word}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <SafeBottomActionStack
        bottomSpacing={keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30}
        gap={10}
        includeBottomInset={!keyboardVisible}
        safeAreaSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
        }>
        <AppButton
          disabled={!canContinue}
          height={56}
          onPress={next}
          testID="onboarding.seedWords.next"
          variant="primary">
          {getPrimaryLabel()}
        </AppButton>
      </SafeBottomActionStack>
    </KeyboardAvoidingForm>
  );
}

const createStyles = theme =>
  StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  contextText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  wordTile: {
    width: '48%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  wordIndex: {
    width: 32,
    color: theme.colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('bold'),
  },
  wordText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 17,
    lineHeight: 23,
    ...fontStyle('semiBold'),
  },
  verifyForm: {
    marginTop: 26,
  },
  // Small windows hide the context line, so the chips come first.
  verifyFormSmallDevice: {
    marginTop: 0,
  },
  verifyGroupSpaced: {
    marginTop: 24,
  },
  verifyGroupSpacedSmallDevice: {
    marginTop: 16,
  },
  // Matches the AppTextInput label.
  verifyLabel: {
    marginBottom: 8,
    color: theme.colors.textSecondary,
    ...theme.typography.labelMd,
  },
  verifyOptions: {
    gap: 8,
  },
  verifyOptionsSmallDevice: {
    gap: 6,
  },
  verifyOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyOption: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
  },
  verifyOptionSmallDevice: {
    height: 44,
  },
  // Blue, not the green selection: green would read as a correct answer
  // before the check runs. Dark mode uses the secondary button colours.
  verifyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.isDark
      ? theme.colors.primaryBackground
      : theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // Android draws elevation through a see-through fill.
    elevation: theme.isDark ? 0 : 2,
  },
  verifyOptionError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surfaceRaised,
  },
  verifyOptionLocked: {
    opacity: 0.45,
  },
  verifyOptionSpacer: {
    flex: 1,
  },
  verifyOptionText: {
    color: theme.colors.textPrimary,
    ...theme.typography.titleRow,
  },
  verifyOptionTextSelected: {
    color: theme.isDark ? theme.colors.textPrimary : theme.colors.primary,
  },
  verifyOptionTextError: {
    color: theme.colors.danger,
  },
  // Matches the AppTextInput error text.
  verifyError: {
    marginTop: 7,
    color: theme.colors.danger,
    ...theme.typography.caption,
  },
});
