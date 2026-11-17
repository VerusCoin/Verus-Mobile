/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet} from 'react-native';
import AlertAsync from 'react-native-alert-async';
import {useDispatch} from 'react-redux';
import {saveGeneralSettings} from '../../../../actions/actionCreators';
import {switchTestnetEnvironment} from '../../../../actions/actions/testnetEnvironment';
import { refreshTestnetPrices } from '../../../../actions/actions/wallet/dispatchers/general/updates';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {MINIMUM_GAS_PRICE_GWEI} from '../../../../utils/constants/web3Constants';
import {
  getTestnetEnvironment,
  hasPrivateTestnetEnvironment,
  TESTNET_ENVIRONMENT_PRIVATE,
  TESTNET_ENVIRONMENT_PUBLIC,
} from '../../../../utils/testnetEnvironment';
import {DisplayCurrencySheet} from '../../../Home/components/SignedInWalletSheets';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsSwitchRow,
} from '../../components/SettingsScaffold';
import SettingsFieldSheet from '../../components/SettingsFieldSheet';
import StatusBadge from '../../../../components/StatusBadge';

const NOT_SAVED = 'Not saved. Try again.';

// The value is a whole number: the ETH fee code reads the gas price with
// BigInt().
const NUMBER_SETTINGS = {
  minGasPriceGwei: {
    title: 'Min. ETH gas price',
    label: 'Gwei',
    helper: 'A whole number, 0 or higher.',
    error: 'Enter a whole number, 0 or higher.',
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
  },
};

const hasSetting = (settings, key) =>
  Object.prototype.hasOwnProperty.call(settings, key);

const validateNumberSetting = (key, value) => {
  const config = NUMBER_SETTINGS[key];
  const text = value == null ? '' : value.toString().trim();

  if (!/^\d+$/.test(text)) return config.error;

  const number = Number(text);

  if (number < config.min || number > config.max) return config.error;

  return null;
};

const GeneralWalletSettings = () => {
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const isMounted = useRef(true);
  const pendingSettingsRef = useRef({});

  const [pendingSettings, setPendingSettings] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [numberSheet, setNumberSheet] = useState(null);
  const [numberSheetVisible, setNumberSheetVisible] = useState(false);
  const [displayCurrencySheetVisible, setDisplayCurrencySheetVisible] =
    useState(false);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const displayedSetting = key =>
    hasSetting(pendingSettings, key)
      ? pendingSettings[key]
      : generalWalletSettings[key];
  const isSaving = key => hasSetting(pendingSettings, key);

  const setRowError = (key, error) => {
    if (!isMounted.current) return;

    setRowErrors(current => {
      if (!error && !current[key]) return current;

      const next = {...current};
      if (error) {
        next[key] = error;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const setPendingSetting = (key, value) => {
    const nextPendingSettings = {
      ...pendingSettingsRef.current,
      [key]: value,
    };
    pendingSettingsRef.current = nextPendingSettings;

    if (isMounted.current) {
      setPendingSettings(nextPendingSettings);
    }
  };

  const clearPendingSetting = key => {
    const nextPendingSettings = {...pendingSettingsRef.current};
    delete nextPendingSettings[key];
    pendingSettingsRef.current = nextPendingSettings;

    if (isMounted.current) {
      setPendingSettings(nextPendingSettings);
    }
  };

  const persistSetting = async (key, value) => {
    if (hasSetting(pendingSettingsRef.current, key)) return;

    setRowError(key, null);

    if (Object.is(generalWalletSettings[key], value)) return;

    setPendingSetting(key, value);

    try {
      dispatch(await saveGeneralSettings({[key]: value}));
      if (key === 'testnetPrices') refreshTestnetPrices();
    } catch (err) {
      // The row reverts to the stored value and shows a short error.
      setRowError(key, NOT_SAVED);
      console.warn(`Failed to save ${key}: ${err?.message || err}`);
    } finally {
      clearPendingSetting(key);
    }
  };

  const toggleTestnetEnvironment = async value => {
    const environment = value
      ? TESTNET_ENVIRONMENT_PRIVATE
      : TESTNET_ENVIRONMENT_PUBLIC;

    if (hasSetting(pendingSettingsRef.current, 'testnetEnvironment')) return;

    const confirmed = await AlertAsync(
      value ? 'Switch to private testnet?' : 'Switch to public testnet?',
      'The app reloads. Testnet currencies you added are removed and need to be added again.',
      [
        {text: 'Cancel', onPress: () => Promise.resolve(false), style: 'cancel'},
        {text: 'Switch', onPress: () => Promise.resolve(true)},
      ],
      {cancelable: false},
    );

    if (!confirmed || !isMounted.current) return;

    setRowError('testnetEnvironment', null);
    setPendingSetting('testnetEnvironment', environment);

    try {
      await switchTestnetEnvironment(environment, dispatch);
    } catch (err) {
      setRowError('testnetEnvironment', NOT_SAVED);
      console.warn(
        `Failed to switch testnet environment: ${err?.message || err}`,
      );
      clearPendingSetting('testnetEnvironment');
    }
  };

  const openNumberSheet = key => {
    const currentValue =
      key === 'minGasPriceGwei' && displayedSetting(key) == null
        ? Number(MINIMUM_GAS_PRICE_GWEI)
        : Number(displayedSetting(key));

    setNumberSheet({
      key,
      value: isNaN(currentValue) ? '' : String(currentValue),
    });
    setNumberSheetVisible(true);
  };

  const closeNumberSheet = () => setNumberSheetVisible(false);

  const saveNumberSetting = value => {
    const key = numberSheet?.key;

    if (!key) return null;

    const error = validateNumberSetting(key, value);

    if (error) return error;

    closeNumberSheet();
    persistSetting(key, Number(value));
    return true;
  };

  const numberSheetConfig = numberSheet
    ? NUMBER_SETTINGS[numberSheet.key]
    : null;

  const savingIndicator = key =>
    isSaving(key) ? (
      <ActivityIndicator color={theme.colors.primary} size="small" />
    ) : null;

  return (
    <>
      <SettingsScreen
        safeAreaEdges={['left', 'right', 'bottom']}
        testID="settings.general">
        <SettingsSection title="Display">
          <SettingsRow
            accessibilityState={{busy: isSaving('displayCurrency')}}
            description="Currency used to display wallet value"
            disabled={isSaving('displayCurrency')}
            icon="currency-usd"
            onPress={() => setDisplayCurrencySheetVisible(true)}
            error={rowErrors.displayCurrency}
            testID="settings.general.displayCurrency"
            title="Universal display currency"
            trailing={savingIndicator('displayCurrency')}
            value={displayedSetting('displayCurrency')}
          />
          <SettingsSwitchRow
            busy={isSaving('enableExperimentalGenericRequests')}
            description="Allow deeplinks that include experimental features (identity update, app encryption, credentials, data packets, etc.)"
            descriptionNumberOfLines={100}
            icon="link-variant"
            last
            onValueChange={value =>
              persistSetting('enableExperimentalGenericRequests', value)
            }
            error={rowErrors.enableExperimentalGenericRequests}
            testID="settings.general.enableExperimentalGenericRequests"
            title="Enable experimental deeplinks"
            value={displayedSetting('enableExperimentalGenericRequests')}
          />
        </SettingsSection>

        <SettingsSection title="Ethereum">
          <SettingsRow
            accessibilityState={{busy: isSaving('minGasPriceGwei')}}
            description="Minimum Gwei used for simple ETH and ERC20 transfers"
            descriptionNumberOfLines={3}
            disabled={isSaving('minGasPriceGwei')}
            icon="gas-station-outline"
            last
            onPress={() => openNumberSheet('minGasPriceGwei')}
            error={rowErrors.minGasPriceGwei}
            testID="settings.general.minGasPriceGwei"
            title="Min. ETH gas price"
            trailing={savingIndicator('minGasPriceGwei')}
            value={
              displayedSetting('minGasPriceGwei') == null
                ? Number(MINIMUM_GAS_PRICE_GWEI)
                : displayedSetting('minGasPriceGwei')
            }
          />
        </SettingsSection>

        {__DEV__ && (
          <SettingsSection title="Developer">
            {hasPrivateTestnetEnvironment() && (
              <SettingsSwitchRow
                accessibilityLabel="Private testnet"
                busy={isSaving('testnetEnvironment')}
                description="Use the private Verus API and bridge contract"
                icon="flask-outline"
                onValueChange={toggleTestnetEnvironment}
                error={rowErrors.testnetEnvironment}
                testID="settings.general.testnetEnvironment"
                title={
                  getTestnetEnvironment() === TESTNET_ENVIRONMENT_PRIVATE ? (
                    <StatusBadge
                      label="Private testnet"
                      tone="warning"
                      style={styles.privateBadge}
                    />
                  ) : (
                    'Private testnet'
                  )
                }
                value={
                  displayedSetting('testnetEnvironment') ===
                  TESTNET_ENVIRONMENT_PRIVATE
                }
              />
            )}
            <SettingsSwitchRow
              busy={isSaving('testnetPrices')}
              description="Show on-chain prices for testnet coins"
              icon="currency-usd"
              last
              onValueChange={(value) => persistSetting('testnetPrices', value)}
              error={rowErrors.testnetPrices}
              testID="settings.general.testnetPrices"
              title="Testnet prices"
              value={displayedSetting('testnetPrices') === true}
            />
          </SettingsSection>
        )}
      </SettingsScreen>
      {numberSheetConfig ? (
        <SettingsFieldSheet
          helperText={numberSheetConfig.helper}
          initialValue={numberSheet.value}
          keyboardType="number-pad"
          label={numberSheetConfig.label}
          onClose={closeNumberSheet}
          onClosed={() => setNumberSheet(null)}
          onSave={saveNumberSetting}
          saveAccessibilityLabel={`Save ${numberSheetConfig.title}`}
          title={numberSheetConfig.title}
          visible={numberSheetVisible}
        />
      ) : null}
      <DisplayCurrencySheet
        displayCurrency={displayedSetting('displayCurrency')}
        onClose={() => setDisplayCurrencySheetVisible(false)}
        onSelect={currency => persistSetting('displayCurrency', currency)}
        visible={displayCurrencySheetVisible}
      />
    </>
  );
};

export default GeneralWalletSettings;

const styles = StyleSheet.create({
  privateBadge: {
    alignSelf: 'flex-start',
  },
});
