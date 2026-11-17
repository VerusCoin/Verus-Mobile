import React, {useEffect, useMemo} from 'react';
import {Appearance, Platform, StatusBar, useColorScheme} from 'react-native';
import {
  Provider as PaperProvider,
  configureFonts,
  MD2DarkTheme,
  MD2LightTheme,
} from 'react-native-paper';
import {useSelector} from 'react-redux';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';
import OnboardingThemeProvider from '../onboarding/OnboardingThemeProvider';
import {
  ONBOARDING_THEME_MODE,
  resolveOnboardingTheme,
} from '../onboarding/tokens';

const fontConfig = {
  default: {
    regular: fontStyle('regular'),
    medium: fontStyle('semiBold'),
    light: fontStyle('light'),
    thin: fontStyle('extraLight'),
  },
  ios: {
    regular: fontStyle('regular'),
    medium: fontStyle('semiBold'),
    light: fontStyle('light'),
    thin: fontStyle('extraLight'),
  },
  android: {
    regular: fontStyle('regular'),
    medium: fontStyle('semiBold'),
    light: fontStyle('light'),
    thin: fontStyle('extraLight'),
  },
};

const normalizeAppearance = appearance => {
  if (appearance === ONBOARDING_THEME_MODE.LIGHT) {
    return ONBOARDING_THEME_MODE.LIGHT;
  }

  if (appearance === ONBOARDING_THEME_MODE.DARK) {
    return ONBOARDING_THEME_MODE.DARK;
  }

  return ONBOARDING_THEME_MODE.SYSTEM;
};

const resolveAppearance = (preference, systemColorScheme) => {
  if (preference !== ONBOARDING_THEME_MODE.SYSTEM) return preference;
  return systemColorScheme === ONBOARDING_THEME_MODE.DARK
    ? ONBOARDING_THEME_MODE.DARK
    : ONBOARDING_THEME_MODE.LIGHT;
};

// Paper's backdrop takes one color, so fold the scrim opacity into it.
const scrimColor = ({scrim, scrimOpacity}) => {
  const value = parseInt(scrim.slice(1), 16);

  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${
    value & 255
  }, ${scrimOpacity})`;
};

const createPaperTheme = semanticTheme => {
  const baseTheme = semanticTheme.isDark ? MD2DarkTheme : MD2LightTheme;

  return {
    ...baseTheme,
    dark: semanticTheme.isDark,
    colors: {
      ...baseTheme.colors,
      primary: semanticTheme.colors.primary,
      accent: Colors.verusGreenColor,
      background: semanticTheme.colors.background,
      surface: semanticTheme.colors.surface,
      text: semanticTheme.colors.textPrimary,
      placeholder: semanticTheme.colors.textSubtle,
      backdrop: scrimColor(semanticTheme.colors),
      notification: semanticTheme.colors.danger,
    },
    fonts: configureFonts({config: fontConfig, isV3: false}),
    version: 2,
  };
};

const AppThemeProvider = ({children}) => {
  const systemColorScheme = useColorScheme();
  const appearance = useSelector(
    state => state.settings?.generalWalletSettings?.appearance,
  );
  const preference = normalizeAppearance(appearance);
  const resolvedMode = resolveAppearance(preference, systemColorScheme);
  const semanticTheme = useMemo(
    () => resolveOnboardingTheme(resolvedMode),
    [resolvedMode],
  );
  const paperTheme = useMemo(
    () => createPaperTheme(semanticTheme),
    [semanticTheme],
  );

  // iOS draws native controls such as switches from the phone's appearance,
  // not the in-app theme. On the light theme with a dark phone, an off switch
  // was almost invisible. The app windows follow the in-app choice instead.
  // Android switches take their colours from the Paper theme.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    Appearance.setColorScheme(
      preference === ONBOARDING_THEME_MODE.SYSTEM ? null : preference,
    );
  }, [preference]);

  return (
    <OnboardingThemeProvider modeOverride={resolvedMode}>
      <PaperProvider theme={paperTheme}>
        <StatusBar
          barStyle={semanticTheme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={semanticTheme.colors.background}
        />
        {children}
      </PaperProvider>
    </OnboardingThemeProvider>
  );
};

export default AppThemeProvider;
