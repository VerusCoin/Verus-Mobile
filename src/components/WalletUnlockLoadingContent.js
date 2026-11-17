import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import LottieView from 'lottie-react-native';
import {Text} from 'react-native-paper';
import {fontStyle} from '../globals/fonts';
import {useOnboardingTheme} from '../theme/onboarding';

const DEFAULT_CONTENT_HEIGHT = 217;
const LOADING_ANIMATION_SIZE = 96;
const LOADING_DOT_INTERVAL_MS = 300;

const WalletUnlockLoadingContent = ({
  height = DEFAULT_CONTENT_HEIGHT,
  message = 'Unlocking your wallet',
  showMessage = true,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loadingDotCount, setLoadingDotCount] = useState(0);

  useEffect(() => {
    if (!showMessage) return undefined;

    const dotInterval = setInterval(() => {
      setLoadingDotCount(value => (value + 1) % 4);
    }, LOADING_DOT_INTERVAL_MS);

    return () => clearInterval(dotInterval);
  }, [showMessage]);

  return (
    <View style={[styles.container, {height}]}>
      <View style={styles.content}>
        <LottieView
          accessibilityLabel={message}
          autoPlay
          loop
          source={require('../animations/loading_7bars.json')}
          style={styles.animation}
        />
        {showMessage ? (
          <View style={styles.messageRow}>
            <Text numberOfLines={1} style={styles.message}>
              {message}
            </Text>
            <Text style={styles.dots}>{'.'.repeat(loadingDotCount)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    animation: {
      width: LOADING_ANIMATION_SIZE,
      height: LOADING_ANIMATION_SIZE,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    message: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    dots: {
      width: 18,
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
  });

export default WalletUnlockLoadingContent;
