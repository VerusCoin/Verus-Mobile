/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import Styles from '../../../../styles/index';
import Colors from '../../../../globals/colors';
import {
  CURRENCY_NAMES,
  SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES,
} from '../../../../utils/constants/currencies';
import NumberPadModal from '../../../../components/NumberPadModal/NumberPadModal';
import {Divider, List, Portal, Text, Button, Switch} from 'react-native-paper';
import ListSelectionModal from '../../../../components/ListSelectionModal/ListSelectionModal';
import {saveGeneralSettings} from '../../../../actions/actionCreators';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {NavigationActions} from '@react-navigation/compat';
import { ADDRESS_BLOCKLIST_FROM_WEBSERVER } from '../../../../utils/constants/constants';

const NO_DEFAULT = 'None';

const WalletSettings = props => {
  const isMounted = useRef(false);
  const generalWalletSettings = useSelector(
    state => state.settings.generalWalletSettings,
  );
  const accounts = useSelector(state => state.authentication.accounts);
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const dispatch = useDispatch();

  const [settings, setSettings] = useState({...generalWalletSettings});
  const [homeCardDragDetection, setHomeCardDragDetection] = useState(
    generalWalletSettings.homeCardDragDetection != null
      ? generalWalletSettings.homeCardDragDetection
      : false,
  );
  const [allowSettingVerusPaySlippage, setAllowSettingVerusPaySlippage] = useState(
    !!generalWalletSettings.allowSettingVerusPaySlippage
  );

  const [errors, setErrors] = useState({
    maxTxCount: false,
    displayCurrency: false,
  });
  const [loading, setLoading] = useState(false);
  const [currentNumberInputModal, setCurrentNumberInputModal] = useState(null);
  const [displayCurrencyModalOpen, setDisplayCurrencyModalOpen] =
    useState(false);
  const [defaultProfileModalOpen, setDefaultProfileModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const openNumberInputModal = inputKey => setCurrentNumberInputModal(inputKey);
  const closeNumberInputModal = () => setCurrentNumberInputModal(null);
  const openDisplayCurrencyModal = () => setDisplayCurrencyModalOpen(true);
  const closeDisplayCurrencyModal = () => setDisplayCurrencyModalOpen(false);
  const openDefaultProfileModal = () => setDefaultProfileModalOpen(true);
  const closeDefaultProfileModal = () => setDefaultProfileModalOpen(false);

  const handleSubmit = () => {
    Keyboard.dismiss();
    validateFormData();
  };

  useEffect(() => {
    if (isMounted.current) {
      setSettings({
        ...settings,
        homeCardDragDetection,
        allowSettingVerusPaySlippage
      });
      setHasChanges(true);
    } else {
      isMounted.current = true;
    }
  }, [homeCardDragDetection, allowSettingVerusPaySlippage]);

  const describeSlippage = () => {
    createAlert(
      "Slippage", 
      "Before editing maximum slippage on your VerusPay invoices, ensure you are aware of the risks. " +
      "The maximum slippage value is used to limit which currencies others will be allowed to pay your invoice with." + 
      " The percentage value you set is the maximum allowed difference between the estimated conversion outcome of the payee's chosen " + 
      "conversion path, and the real outcome. This value is calculated for each currency using factors that determine their" + 
      " respective volatilites, like the amount of currency in their respective reserves. Setting a high slippage value introduces " + 
      " the risk of receiving an amount of currency unexpectedly lower than what you set as the invoice amount."
    )
  }

  const toggleAllowSettingVerusPaySlippage = () => {
    if (!allowSettingVerusPaySlippage) {
      describeSlippage()
    }

    setAllowSettingVerusPaySlippage(!allowSettingVerusPaySlippage);
  }

  const saveSettings = async () => {
    setLoading(true);
    try {
      const stateToSave = {
        maxTxCount: Number(settings.maxTxCount),
        displayCurrency: settings.displayCurrency,
        defaultAccount:
          settings.defaultAccount === NO_DEFAULT ? null : settings.defaultAccount,
        homeCardDragDetection,
        allowSettingVerusPaySlippage,
        ackedCurrencyDisclaimer: settings.ackedCurrencyDisclaimer,
        addressBlocklistDefinition:
          settings.addressBlocklistDefinition == null
            ? {
                type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
                data: null,
              }
            : settings.addressBlocklistDefinition,
        addressBlocklist:
          settings.addressBlocklist == null ? [] : settings.addressBlocklist,
        vrpcOverrides: settings.vrpcOverrides == null ? {} : settings.vrpcOverrides,
      };
      const res = await saveGeneralSettings(stateToSave);
      dispatch(res);
      createAlert('Success', 'General wallet settings saved.');
      setSettings({...generalWalletSettings});
      setLoading(false);
    } catch (err) {
      createAlert('Error', err.message);
      console.warn(err.message);
      setLoading(false);
    }
  };

  const handleError = (error, field) => {
    setErrors({...errors, [field]: error});
  };

  const back = () => {
    props.navigation.dispatch(NavigationActions.back());
  };

  const validateFormData = () => {
    setErrors({maxTxCount: null, displayCurrency: null});
    let _errors = false;
    const _maxTxCount = settings.maxTxCount;

    if (
      !_maxTxCount ||
      _maxTxCount.length === 0 ||
      isNaN(_maxTxCount) ||
      Number(_maxTxCount) < 10 ||
      Number(_maxTxCount) > 100
    ) {
      handleError('Please enter a valid number from 10 to 100', 'maxTxCount');
      _errors = true;
    }

    if (!_errors) {
      saveSettings();
    }
  };

  const defaultAccount =
    settings.defaultAccount == null
      ? null
      : accounts.find(item => item.accountHash === settings.defaultAccount);
  const defaultAccountName = defaultAccount == null ? null : defaultAccount.id;

  return (
    <View style={Styles.defaultRoot}>
      <Portal>
        {currentNumberInputModal != null && (
          <NumberPadModal
            value={Number(settings[currentNumberInputModal])}
            visible={currentNumberInputModal != null}
            onChange={(number) => {
              setSettings({
                ...settings,
                [currentNumberInputModal]: number.toString(),
              });
              setHasChanges(true);
            }}
            cancel={() => closeNumberInputModal()}
            decimals={0}
          />
        )}
        {displayCurrencyModalOpen && (
          <ListSelectionModal
            title="Currencies"
            selectedKey={settings.displayCurrency}
            visible={displayCurrencyModalOpen}
            onSelect={(item) => {
              setSettings({
                ...settings,
                displayCurrency: item.key,
              });
              setHasChanges(true);
            }}
            data={SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES.map(key => ({
              key,
              title: key,
              description: CURRENCY_NAMES[key],
            }))}
            cancel={() => closeDisplayCurrencyModal()}
          />
        )}
        {defaultProfileModalOpen && (
          <ListSelectionModal
            title="Profiles"
            selectedKey={settings.defaultAccount}
            visible={defaultProfileModalOpen}
            onSelect={(item) => {
              setSettings({
                ...settings,
                defaultAccount: item.key,
              });
              setHasChanges(true);
            }}
            data={[
              {
                key: NO_DEFAULT,
                title: 'None',
                description: 'Manually select profile on app start',
              },
              ...accounts.map(item => ({
                key: item.accountHash,
                title: item.id,
                description:
                  item.id === activeAccount.id ? 'Currently logged in' : null,
              })),
            ]}
            cancel={() => closeDefaultProfileModal()}
          />
        )}
      </Portal>
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader>{'Display Settings'}</List.Subheader>
        <TouchableOpacity
          onPress={() => openNumberInputModal('maxTxCount')}
          style={{...Styles.flex}}>
          <Divider />
          <List.Item
            title={'Max. Display TXs'}
            description="Max. displayed Electrum transactions"
            right={() => (
              <Text style={Styles.listItemTableCell}>
                {settings.maxTxCount}
              </Text>
            )}
          />
          <Divider />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openDisplayCurrencyModal()}
          style={{...Styles.flex}}>
          <List.Item
            title={'Universal Display Currency'}
            description="The currency used to display value"
            right={() => (
              <Text style={Styles.listItemTableCell}>
                {settings.displayCurrency}
              </Text>
            )}
          />
          <Divider />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setHomeCardDragDetection(!homeCardDragDetection);
          }}
        >
          <List.Item
            title="Automatic Drag Detection"
            description="Move home screen cards when dragged"
            right={() => (
              <View
                style={{
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                }}
              >
                <Switch
                  value={homeCardDragDetection}
                  onValueChange={() => {
                    setHomeCardDragDetection(!homeCardDragDetection);
                  }}
                  color={Colors.primaryColor}
                />
              </View>
            )}
          />
          <Divider />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleAllowSettingVerusPaySlippage}
        >
          <List.Item
            title="Edit max VerusPay invoice slippage"
            description="Show the option to edit maximum slippage when creating a VerusPay invoice with conversion"
            right={() => (
              <View
                style={{
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                }}
              >
                <Switch
                  value={allowSettingVerusPaySlippage}
                  onValueChange={toggleAllowSettingVerusPaySlippage}
                  color={Colors.primaryColor}
                />
              </View>
            )}
          />
          <Divider />
        </TouchableOpacity>
        <List.Subheader>{'Start Settings'}</List.Subheader>
        <TouchableOpacity
          onPress={() => openDefaultProfileModal()}
          style={{...Styles.flex}}>
          <Divider />
          <List.Item
            title={'Default Profile'}
            description="Automatically selected profile on app start"
            right={() => (
              <Text style={Styles.listItemTableCell}>
                {defaultAccountName == null ? NO_DEFAULT : defaultAccountName}
              </Text>
            )}
          />
          <Divider />
        </TouchableOpacity>
      </ScrollView>
      <View style={Styles.highFooterContainer}>
        {loading ? (
          <ActivityIndicator
            animating={loading}
            style={{
              paddingTop: 32
            }}
            size="large"
          />
        ) : (
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button
              textColor={Colors.warningButtonColor}
              onPress={back}
            >
              {"Back"}
            </Button>
            <Button
              mode='contained'
              onPress={handleSubmit}
              disabled={!hasChanges}
            >
              {"Confirm"}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
};

export default WalletSettings;
