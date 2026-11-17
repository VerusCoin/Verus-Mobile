import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {saveGeneralSettings} from '../../../actions/actionCreators';
import signedInCopy from '../../../copy/signedIn';
import {ONBOARDING_THEME_MODE, useOnboardingTheme} from '../../../theme/onboarding';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../components/SettingsScaffold';

const OPTIONS = [
  {
    value: ONBOARDING_THEME_MODE.SYSTEM,
    title: signedInCopy.settings.system,
    description: signedInCopy.settings.systemDescription,
    icon: 'cellphone-cog',
  },
  {
    value: ONBOARDING_THEME_MODE.LIGHT,
    title: signedInCopy.settings.light,
    description: signedInCopy.settings.lightDescription,
    icon: 'white-balance-sunny',
  },
  {
    value: ONBOARDING_THEME_MODE.DARK,
    title: signedInCopy.settings.dark,
    description: signedInCopy.settings.darkDescription,
    icon: 'moon-waning-crescent',
  },
];

const styles = StyleSheet.create({
  radioSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const Appearance = () => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const appearance = useSelector(
    state =>
      state.settings.generalWalletSettings.appearance ||
      ONBOARDING_THEME_MODE.SYSTEM,
  );

  // A failed save keeps the old theme selected and shows on the chosen row.
  const [failedValue, setFailedValue] = useState(null);

  const selectAppearance = async value => {
    setFailedValue(null);

    try {
      dispatch(await saveGeneralSettings({appearance: value}));
    } catch (e) {
      console.warn(e);
      setFailedValue(value);
    }
  };

  return (
    <SettingsScreen testID="settings.appearance">
      <SettingsSection title="Theme">
        {OPTIONS.map((option, index) => {
          const selected = appearance === option.value;
          const radioColor = selected
            ? theme.isDark
              ? theme.colors.onPrimary
              : theme.colors.primary
            : theme.colors.textSubtle;

          return (
            <SettingsRow
              accessibilityRole="radio"
              accessibilityState={{selected}}
              choice
              description={option.description}
              error={
                failedValue === option.value ? 'Not saved. Try again.' : null
              }
              icon={option.icon}
              key={option.value}
              last={index === OPTIONS.length - 1}
              onPress={() => selectAppearance(option.value)}
              testID={`settings.appearance.${option.value}`}
              title={option.title}
              trailing={
                <View style={styles.radioSlot}>
                  <MaterialCommunityIcons
                    color={radioColor}
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                  />
                </View>
              }
            />
          );
        })}
      </SettingsSection>
    </SettingsScreen>
  );
};

export default Appearance;
