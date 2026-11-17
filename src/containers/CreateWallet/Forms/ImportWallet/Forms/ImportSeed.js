import {validateMnemonic, wordlists} from 'bip39';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Clipboard,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Chip, Text} from 'react-native-paper';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../../globals/fonts';
import {createSignedOutFlowStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../../hooks/useOnboardingSmallDeviceLayout';

const SEED_WORD_COUNT = 24;
const ENGLISH_WORDLIST = wordlists.EN;
const SUGGESTION_LIMIT = 8;
const INPUT_FOCUS_DELAY = 80;
const PAGE_ANIMATION_DURATION = 320;
const SCROLL_FADE_HEIGHT = 28;

const createEmptyWords = () => Array(SEED_WORD_COUNT).fill('');

const cleanSeedWord = value =>
  value == null ? '' : value.toLowerCase().replace(/\s/g, '');

const splitSeedText = value => {
  if (value == null || value.length === 0) return [];

  if (value.includes('  ')) {
    return value.split(' ').slice(0, SEED_WORD_COUNT);
  }

  return value.trim().split(/\s+/g).filter(Boolean).slice(0, SEED_WORD_COUNT);
};

const compactPhraseFromWords = words => words.filter(Boolean).join(' ');

const slotPhraseFromWords = words => words.join(' ');

const resolveSeedWord = value => {
  const cleanWord = cleanSeedWord(value);

  if (ENGLISH_WORDLIST.includes(cleanWord)) return cleanWord;

  if (cleanWord.length < 4) return null;

  return (
    ENGLISH_WORDLIST.find(word => word.slice(0, 4) === cleanWord.slice(0, 4)) ||
    null
  );
};

const parseSeedText = value => {
  const tokens = splitSeedText(value);
  const words = createEmptyWords();
  const invalidIndexes = [];
  const tokenCount =
    value == null ? 0 : value.trim().split(/\s+/g).filter(Boolean).length;

  tokens.forEach((token, index) => {
    const cleanWord = cleanSeedWord(token);

    if (cleanWord.length === 0) return;

    const resolvedWord = resolveSeedWord(cleanWord);

    words[index] = resolvedWord || cleanWord;

    if (resolvedWord == null) {
      invalidIndexes.push(index);
    }
  });

  return {
    words,
    invalidIndexes,
    extraWordCount: Math.max(0, tokenCount - SEED_WORD_COUNT),
  };
};

const getNextEditableIndex = (words, invalidIndexes) => {
  const firstInvalidIndex = invalidIndexes[0];

  if (firstInvalidIndex != null) return firstInvalidIndex;

  const firstEmptyIndex = words.findIndex(word => word.length === 0);

  if (firstEmptyIndex >= 0) return firstEmptyIndex;

  return SEED_WORD_COUNT - 1;
};

const ScrollFade = ({position, styles, theme}) => {
  const isTop = position === 'top';
  const gradientId = isTop
    ? 'reviewWordListTopFade'
    : 'reviewWordListBottomFade';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrollFade,
        isTop ? styles.scrollFadeTop : styles.scrollFadeBottom,
      ]}>
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop
              offset="0"
              stopColor={theme.colors.background}
              stopOpacity={isTop ? 1 : 0}
            />
            <Stop
              offset="1"
              stopColor={theme.colors.background}
              stopOpacity={isTop ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect fill={`url(#${gradientId})`} height="100%" width="100%" />
      </Svg>
    </View>
  );
};
export default function ImportSeed({
  setImportedSeed,
  importedSeed,
  onComplete,
  onImportProgressChange,
  onReviewModeChange,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentWord, setCurrentWord] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [entryMessage, setEntryMessage] = useState(null);
  const [entryMode, setEntryMode] = useState(false);
  const [invalidWordIndexes, setInvalidWordIndexes] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewScroll, setReviewScroll] = useState({
    contentHeight: 0,
    layoutHeight: 0,
    y: 0,
  });
  const [words, setWords] = useState(createEmptyWords);
  const inputRef = useRef(null);
  const pageProgress = useRef(new Animated.Value(0)).current;
  const {keyboardVisible, smallDevice} = useOnboardingSmallDeviceLayout();

  const invalidWordIndexSet = useMemo(
    () => new Set(invalidWordIndexes),
    [invalidWordIndexes],
  );
  const completedWordCount = words.filter(
    (word, index) => word.length > 0 && !invalidWordIndexSet.has(index),
  ).length;
  const currentWordClean = cleanSeedWord(currentWord);
  const currentResolvedWord = resolveSeedWord(currentWordClean);
  const allWordsFilled =
    completedWordCount === SEED_WORD_COUNT && invalidWordIndexes.length === 0;
  const compactPhrase = compactPhraseFromWords(words);
  const isValidMnemonic =
    allWordsFilled && validateMnemonic(compactPhrase, ENGLISH_WORDLIST);
  const checksumError = allWordsFilled && !isValidMnemonic;
  const suggestions = useMemo(() => {
    if (currentWordClean.length < 3) return [];

    return ENGLISH_WORDLIST.filter(word =>
      word.startsWith(currentWordClean),
    ).slice(0, SUGGESTION_LIMIT);
  }, [currentWordClean]);
  const currentWordError = (() => {
    if (currentWordClean.length === 0) return null;
    if (currentResolvedWord != null) return null;
    if (suggestions.length > 0) return null;
    if (currentWordClean.length < 4) return null;

    return 'Word not found.';
  })();
  const reviewMessage = (() => {
    if (invalidWordIndexes.length > 0) {
      return 'One or more words are not valid BIP39 words.';
    }

    if (checksumError) {
      return 'The words are valid, but the phrase checksum does not match.';
    }

    if (allWordsFilled) {
      return null;
    }

    return `${completedWordCount} of ${SEED_WORD_COUNT} words complete.`;
  })();
  const reviewCanScroll =
    reviewScroll.contentHeight > reviewScroll.layoutHeight + 1;
  const showReviewTopFade = reviewCanScroll && reviewScroll.y > 2;
  const showReviewBottomFade =
    reviewCanScroll &&
    reviewScroll.y + reviewScroll.layoutHeight <
      reviewScroll.contentHeight - 2;
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
    const parsedSeed = parseSeedText(importedSeed);
    const firstEmptyIndex = parsedSeed.words.findIndex(word => word.length === 0);
    const nextIndex = getNextEditableIndex(
      parsedSeed.words,
      parsedSeed.invalidIndexes,
    );

    setWords(parsedSeed.words);
    setInvalidWordIndexes(parsedSeed.invalidIndexes);
    setCurrentWordIndex(nextIndex);
    setReviewMode(
      firstEmptyIndex < 0 && parsedSeed.invalidIndexes.length === 0,
    );

    if (parsedSeed.extraWordCount > 0) {
      setEntryMessage('Only the first 24 words were used.');
    }
  }, [importedSeed]);

  useEffect(() => {
    setCurrentWord(words[currentWordIndex] || '');
  }, [currentWordIndex, words]);

  useEffect(() => {
    if (keyboardVisible && !reviewMode) {
      setEntryMode(true);
    }
  }, [keyboardVisible, reviewMode]);

  useEffect(() => {
    if (onImportProgressChange) {
      onImportProgressChange(completedWordCount / SEED_WORD_COUNT);
    }
  }, [completedWordCount, onImportProgressChange]);

  // The header title says whether the user enters or reviews the phrase.
  useEffect(() => {
    if (onReviewModeChange) {
      onReviewModeChange(reviewMode);
    }
  }, [onReviewModeChange, reviewMode]);

  useEffect(() => {
    if (reviewMode) {
      setReviewScroll(previousScroll => ({
        ...previousScroll,
        y: 0,
      }));
    }
  }, [reviewMode]);

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
  }, [pageProgress, reviewMode]);

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus?.();
    }, INPUT_FOCUS_DELAY);
  };

  const syncWords = nextWords => {
    const nextInvalidIndexes = nextWords.reduce((indexes, word, index) => {
      if (word.length > 0 && resolveSeedWord(word) == null) {
        return [...indexes, index];
      }

      return indexes;
    }, []);

    setWords(nextWords);
    setInvalidWordIndexes(nextInvalidIndexes);
    setImportedSeed(slotPhraseFromWords(nextWords));

    return nextInvalidIndexes;
  };

  const goToWord = index => {
    const nextIndex = Math.max(0, Math.min(index, SEED_WORD_COUNT - 1));

    setReviewMode(false);
    setEntryMode(true);
    setCurrentWordIndex(nextIndex);
    focusInput();
  };

  const applySeedText = value => {
    const parsedSeed = parseSeedText(value);
    const firstEmptyIndex = parsedSeed.words.findIndex(word => word.length === 0);
    const nextIndex = getNextEditableIndex(
      parsedSeed.words,
      parsedSeed.invalidIndexes,
    );

    syncWords(parsedSeed.words);
    setCurrentWordIndex(nextIndex);
    setReviewMode(
      firstEmptyIndex < 0 && parsedSeed.invalidIndexes.length === 0,
    );
    setEntryMessage(
      parsedSeed.extraWordCount > 0
        ? 'Only the first 24 words were used.'
        : null,
    );

    if (firstEmptyIndex < 0 && parsedSeed.invalidIndexes.length === 0) {
      setEntryMode(false);
      Keyboard.dismiss();
    } else {
      setEntryMode(true);
      focusInput();
    }
  };

  const handleCurrentWordChange = text => {
    const pastedWords = text.trim().split(/\s+/g).filter(Boolean);

    if (pastedWords.length > 1) {
      applySeedText(text);
      return;
    }

    setEntryMessage(null);
    setCurrentWord(cleanSeedWord(text));
  };

  const commitWord = value => {
    const resolvedWord = resolveSeedWord(value);

    if (resolvedWord == null) {
      setEntryMessage('Choose a valid BIP39 word.');
      return;
    }

    const nextWords = [...words];

    nextWords[currentWordIndex] = resolvedWord;
    syncWords(nextWords);

    const nextEmptyIndex = nextWords.findIndex(
      (word, index) => index > currentWordIndex && word.length === 0,
    );
    const fallbackEmptyIndex = nextWords.findIndex(word => word.length === 0);
    const nextIndex =
      nextEmptyIndex >= 0 ? nextEmptyIndex : fallbackEmptyIndex;

    setEntryMessage(null);

    if (nextIndex >= 0) {
      setEntryMode(true);
      setCurrentWordIndex(nextIndex);
      focusInput();
      return;
    }

    setEntryMode(false);
    setReviewMode(true);
    Keyboard.dismiss();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getString();

      if (clipboardText == null || clipboardText.trim().length === 0) {
        setEntryMessage('Clipboard is empty.');
        return;
      }

      applySeedText(clipboardText);
    } catch (e) {
      setEntryMessage('Unable to read clipboard.');
    }
  };

  const handleImport = () => {
    if (!isValidMnemonic) {
      setEntryMode(false);
      setReviewMode(true);
      Keyboard.dismiss();
      return;
    }

    onComplete(compactPhrase);
  };

  const updateReviewScroll = scrollUpdate => {
    setReviewScroll(previousScroll => {
      const nextScroll = {
        ...previousScroll,
        ...scrollUpdate,
      };

      if (
        Math.abs(previousScroll.y - nextScroll.y) < 1 &&
        previousScroll.contentHeight === nextScroll.contentHeight &&
        previousScroll.layoutHeight === nextScroll.layoutHeight
      ) {
        return previousScroll;
      }

      return nextScroll;
    });
  };

  const handleReviewScroll = ({nativeEvent}) => {
    updateReviewScroll({
      contentHeight: nativeEvent.contentSize.height,
      layoutHeight: nativeEvent.layoutMeasurement.height,
      y: nativeEvent.contentOffset.y,
    });
  };

  const wordEntryActive = !reviewMode && (entryMode || keyboardVisible);
  const compactEntryLayout = !reviewMode && (smallDevice || keyboardVisible);
  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    if (!reviewMode) {
      setEntryMode(false);
    }
  };

  const renderWordSlot = (word, index) => {
    const isActive = index === currentWordIndex && !reviewMode;
    const isInvalid = invalidWordIndexSet.has(index);
    const isComplete = word.length > 0 && !isInvalid;
    const label = wordEntryActive ? `${index + 1}` : word || `${index + 1}`;

    return (
      <TouchableOpacity
        accessibilityLabel={`Word ${index + 1}${word ? `, ${word}` : ''}`}
        accessibilityRole="button"
        activeOpacity={0.78}
        key={index}
        onPress={() => goToWord(index)}
        testID={`onboarding.importSeed.wordSlot.${index + 1}`}
        style={[
          styles.wordSlot,
          compactEntryLayout && styles.wordSlotCompact,
          reviewMode && styles.wordSlotReview,
          isComplete && styles.wordSlotComplete,
          isActive && styles.wordSlotActive,
          isInvalid && styles.wordSlotInvalid,
        ]}>
        {reviewMode ? (
          <Text
            style={[
              styles.wordSlotIndex,
              isInvalid && styles.wordSlotIndexInvalid,
            ]}>
            {index + 1}
          </Text>
        ) : null}
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[
            styles.wordSlotText,
            compactEntryLayout && styles.wordSlotTextCompact,
            reviewMode && styles.wordSlotTextReview,
            isComplete && styles.wordSlotTextComplete,
            isActive && styles.wordSlotTextActive,
            isInvalid && styles.wordSlotTextInvalid,
          ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const shouldShowFooter = !wordEntryActive || reviewMode;
  const getFooterLabel = () => {
    if (reviewMode) return 'Import wallet';
    if (allWordsFilled) return 'Review phrase';

    return 'Paste all words';
  };
  const getFooterAction = () => {
    if (reviewMode) return handleImport;
    if (allWordsFilled) return () => setReviewMode(true);

    return handlePasteFromClipboard;
  };
  const getFooterTestID = () => {
    if (reviewMode) return 'onboarding.importSeed.import';
    if (allWordsFilled) return 'onboarding.importSeed.review';

    return 'onboarding.importSeed.paste';
  };
  // The progress line shows while the user is not typing a word, on
  // windows taller than 667 points.
  const showEntryContext = !smallDevice && !wordEntryActive;

  const renderWordGrid = () => (
    <View
      style={[
        styles.wordGrid,
        compactEntryLayout && styles.wordGridCompact,
        reviewMode && styles.wordGridReview,
        !reviewMode && !showEntryContext && styles.wordGridFirst,
      ]}>
      {words.map(renderWordSlot)}
    </View>
  );

  return (
    <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback
        accessible={false}
        onPress={handleDismissKeyboard}>
        <View style={styles.content}>
          {reviewMode ? (
            <Animated.View style={[styles.reviewContent, pageAnimatedStyle]}>
              <View style={styles.reviewHeader}>
                {reviewMessage ? (
                  <Text
                    style={[
                      styles.contextText,
                      styles.reviewContextText,
                      (checksumError || invalidWordIndexes.length > 0) &&
                        styles.contextTextWarning,
                    ]}>
                    {reviewMessage}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.reviewListContainer,
                  !reviewMessage && styles.reviewListContainerFirst,
                ]}>
                <ScrollView
                  bounces={false}
                  contentContainerStyle={styles.reviewListContent}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={(_, height) =>
                    updateReviewScroll({contentHeight: height})
                  }
                  onLayout={({nativeEvent}) =>
                    updateReviewScroll({
                      layoutHeight: nativeEvent.layout.height,
                    })
                  }
                  onScroll={handleReviewScroll}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}>
                  {renderWordGrid()}
                </ScrollView>
                {showReviewTopFade ? (
                  <ScrollFade position="top" styles={styles} theme={theme} />
                ) : null}
                {showReviewBottomFade ? (
                  <ScrollFade
                    position="bottom"
                    styles={styles}
                    theme={theme}
                  />
                ) : null}
              </View>
            </Animated.View>
          ) : (
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
                {showEntryContext ? (
                  <Text
                    style={[
                      styles.contextText,
                      (checksumError || invalidWordIndexes.length > 0) &&
                        styles.contextTextWarning,
                    ]}>
                    {reviewMode
                      ? reviewMessage
                      : `${completedWordCount} of ${SEED_WORD_COUNT} words complete.`}
                  </Text>
                ) : null}
                {renderWordGrid()}
                {!reviewMode && (!smallDevice || wordEntryActive) ? (
                  <View
                    style={[
                      styles.entryPanel,
                      compactEntryLayout && styles.entryPanelCompact,
                    ]}>
                    <Text style={styles.entryLabel}>
                      {`Word ${currentWordIndex + 1} of ${SEED_WORD_COUNT}`}
                    </Text>
                    <View style={styles.inputRow}>
                      <AppTextInput
                        autoCapitalize="none"
                        autoComplete="off"
                        autoCorrect={false}
                        blurOnSubmit={false}
                        containerStyle={styles.wordInput}
                        enablesReturnKeyAutomatically
                        errorText={currentWordError}
                        helperText={entryMessage}
                        importantForAutofill="no"
                        inputStyle={styles.wordInputText}
                        onChangeText={handleCurrentWordChange}
                        onSubmitEditing={() => commitWord(currentWord)}
                        ref={inputRef}
                        returnKeyType="next"
                        spellCheck={false}
                        testID="onboarding.importSeed.wordInput"
                        textContentType="none"
                        value={currentWord}
                      />
                      <AppButton
                        disabled={currentResolvedWord == null}
                        height={48}
                        onPress={() => commitWord(currentWord)}
                        style={styles.nextButton}
                        testID="onboarding.importSeed.wordNext"
                        variant="primary">
                        {'Next'}
                      </AppButton>
                    </View>
                    {suggestions.length > 0 ? (
                      <ScrollView
                        contentContainerStyle={styles.suggestions}
                        horizontal
                        keyboardShouldPersistTaps="handled"
                        showsHorizontalScrollIndicator={false}>
                        {suggestions.map(suggestion => (
                          <Chip
                            key={suggestion}
                            mode="outlined"
                            onPress={() => commitWord(suggestion)}
                            style={styles.suggestionChip}
                            textStyle={styles.suggestionText}>
                            {suggestion}
                          </Chip>
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                ) : null}
              </Animated.View>
            </ScrollView>
          )}
        </View>
      </TouchableWithoutFeedback>
      {shouldShowFooter ? (
        <SafeBottomActionStack
          bottomSpacing={
            keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30
          }
          gap={10}
          includeBottomInset={!keyboardVisible}
          safeAreaSpacing={
            keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
          }>
          <AppButton
            disabled={reviewMode && !isValidMnemonic}
            height={56}
            onPress={getFooterAction()}
            testID={getFooterTestID()}
            variant={reviewMode ? 'primary' : 'secondary'}>
            {getFooterLabel()}
          </AppButton>
        </SafeBottomActionStack>
      ) : null}
    </KeyboardAvoidingForm>
  );
}

const createStyles = theme =>
  StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  reviewContent: {
    flex: 1,
    paddingTop: theme.spacing.stepTopWithHeaderTitle,
  },
  reviewHeader: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  reviewContextText: {
    marginTop: 0,
  },
  reviewListContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginTop: 22,
    overflow: 'hidden',
  },
  reviewListContainerFirst: {
    marginTop: 0,
  },
  reviewListContent: {
    paddingBottom: SCROLL_FADE_HEIGHT + 6,
  },
  scrollFade: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: SCROLL_FADE_HEIGHT,
  },
  scrollFadeTop: {
    top: 0,
  },
  scrollFadeBottom: {
    bottom: 0,
  },
  contextText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  contextTextWarning: {
    color: theme.colors.danger,
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 8,
    rowGap: 8,
    marginTop: 22,
  },
  wordGridCompact: {
    columnGap: 4,
    rowGap: 6,
    marginTop: 10,
  },
  wordGridReview: {
    marginTop: 0,
  },
  wordGridFirst: {
    marginTop: 0,
  },
  wordSlot: {
    width: '23%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
  },
  wordSlotCompact: {
    width: '10.9%',
    height: 26,
    paddingHorizontal: 0,
  },
  wordSlotReview: {
    width: '48%',
    height: 38,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
  },
  wordSlotComplete: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceRaised,
  },
  wordSlotActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  wordSlotInvalid: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surfaceRaised,
  },
  wordSlotIndex: {
    width: 28,
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('bold'),
  },
  wordSlotIndexInvalid: {
    color: theme.colors.danger,
  },
  wordSlotText: {
    maxWidth: '100%',
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  wordSlotTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  wordSlotTextReview: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  wordSlotTextComplete: {
    color: theme.colors.textPrimary,
  },
  wordSlotTextActive: {
    color: theme.colors.link,
  },
  wordSlotTextInvalid: {
    color: theme.colors.danger,
  },
  entryPanel: {
    marginTop: 18,
  },
  entryPanelCompact: {
    marginTop: 10,
  },
  entryLabel: {
    marginBottom: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  wordInput: {
    flex: 1,
  },
  wordInputText: {
    fontSize: 18,
  },
  nextButton: {
    width: 88,
    marginTop: 0,
  },
  suggestions: {
    paddingTop: 12,
    paddingRight: 2,
    gap: 8,
  },
  suggestionChip: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  suggestionText: {
    ...theme.typography.labelMd,
    color: theme.colors.link,
  },
});
