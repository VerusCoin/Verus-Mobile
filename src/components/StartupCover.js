import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {fontStyle} from '../globals/fonts';
import {VerusLogo} from '../images/customIcons';
import {useOnboardingTheme} from '../theme/onboarding';

const startupPoster = require('../../assets/images/verus-waves-poster.png');

const LOGO_ASPECT_RATIO = 2084 / 7305;
const LOGO_TOP_MARGIN = 22;
const LOADING_INDICATOR_DELAY_MS = 900;

const StartupCover = ({loading = false, securityCover = false, startupError}) => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showLoadingState, setShowLoadingState] = useState(false);
  const logoWidth = width * 0.3;
  const logoVariant = theme.isDark ? 'monochrome' : 'default';
  const showStartupError = startupError != null;
  const showStatus = !securityCover && (showStartupError || showLoadingState);
  const statusColor = theme.isDark
    ? theme.colors.textPrimary
    : theme.colors.onPrimary;

  useEffect(() => {
    if (!loading || showStartupError) {
      setShowLoadingState(false);
      return undefined;
    }

    const timer = setTimeout(
      () => setShowLoadingState(true),
      LOADING_INDICATOR_DELAY_MS,
    );

    return () => clearTimeout(timer);
  }, [loading, showStartupError]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <ImageBackground
        source={startupPoster}
        resizeMode="cover"
        style={styles.background}
      />
      <View style={styles.veil} />
      <View
        style={[
          styles.logoContainer,
          {
            top: insets.top + LOGO_TOP_MARGIN,
          },
        ]}>
        <VerusLogo
          width={logoWidth}
          height={logoWidth * LOGO_ASPECT_RATIO}
          variant={logoVariant}
        />
      </View>
      {showStatus && (
        <View
          accessibilityLiveRegion={showStartupError ? 'assertive' : 'polite'}
          accessibilityRole={showStartupError ? 'alert' : undefined}
          style={[
            styles.statusContainer,
            {
              bottom: insets.bottom + 44,
            },
          ]}>
          {showStartupError ? (
            <>
              <Text style={[styles.errorTitle, {color: statusColor}]}>
                {"Verus Wallet couldn't finish opening"}
              </Text>
              <Text style={[styles.statusText, {color: statusColor}]}>
                {'Close and reopen the app.'}
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator color={statusColor} />
              <Text style={[styles.statusText, {color: statusColor}]}>
                {'Preparing Verus Wallet'}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundVideo,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
    },
    veil: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.videoVeil,
    },
    logoContainer: {
      position: 'absolute',
      left: 32,
      right: 32,
      alignItems: 'flex-start',
    },
    statusContainer: {
      position: 'absolute',
      left: 32,
      right: 32,
      alignItems: 'center',
    },
    statusText: {
      marginTop: 12,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    errorTitle: {
      textAlign: 'center',
      fontSize: 17,
      lineHeight: 23,
      ...fontStyle('semiBold'),
    },
  });

export default StartupCover;
