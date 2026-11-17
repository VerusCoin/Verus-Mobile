import {useContext} from 'react';
import {OnboardingThemeContext} from './OnboardingThemeProvider';

const useOnboardingTheme = () => useContext(OnboardingThemeContext);

export default useOnboardingTheme;
