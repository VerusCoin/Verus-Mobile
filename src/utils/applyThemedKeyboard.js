import {useContext} from 'react';
import {Platform, TextInput} from 'react-native';
import {OnboardingThemeContext} from '../theme/onboarding/OnboardingThemeProvider';

// iOS colours the keyboard from the phone's appearance, not the in-app theme,
// so every field follows the active theme unless it sets its own appearance.
// Android keyboards ignore keyboardAppearance and keep their own setting.
const applyThemedKeyboard = () => {
  if (
    Platform.OS !== 'ios' ||
    TextInput.__verusKeyboardPatched ||
    typeof TextInput.render !== 'function'
  ) {
    return;
  }

  const originalRender = TextInput.render;

  TextInput.render = function renderWithThemedKeyboard(props, ref) {
    const theme = useContext(OnboardingThemeContext);
    const keyboardAppearance =
      props.keyboardAppearance ?? (theme.isDark ? 'dark' : 'light');

    return originalRender.call(this, {...props, keyboardAppearance}, ref);
  };

  TextInput.__verusKeyboardPatched = true;
};

export default applyThemedKeyboard;
