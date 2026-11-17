import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {
  ONBOARDING_THEME_MODE,
  ONBOARDING_THEMES,
  resolveOnboardingTheme,
} from './tokens';

export const OnboardingThemeContext = createContext(ONBOARDING_THEMES.light);
// Keep the public fallback for consumers outside a provider, while distinguishing
// a real parent provider from that fallback when resolving a nested mode.
const InheritedModeContext = createContext(null);

const normalizeMode = mode => {
  if (mode === ONBOARDING_THEME_MODE.DARK) return ONBOARDING_THEME_MODE.DARK;
  if (mode === ONBOARDING_THEME_MODE.LIGHT) return ONBOARDING_THEME_MODE.LIGHT;

  return null;
};

const OnboardingThemeProvider = ({children, modeOverride}) => {
  const systemColorScheme = useColorScheme();
  const parentMode = useContext(InheritedModeContext);
  const mode = normalizeMode(modeOverride) || parentMode || normalizeMode(systemColorScheme);
  const theme = useMemo(
    () => resolveOnboardingTheme(mode || ONBOARDING_THEME_MODE.LIGHT),
    [mode],
  );

  return (
    <InheritedModeContext.Provider value={theme.mode}>
      <OnboardingThemeContext.Provider value={theme}>
        {children}
      </OnboardingThemeContext.Provider>
    </InheritedModeContext.Provider>
  );
};

export default OnboardingThemeProvider;
