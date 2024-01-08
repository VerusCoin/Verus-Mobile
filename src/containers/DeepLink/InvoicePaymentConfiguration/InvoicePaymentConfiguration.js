import React, {useState, useEffect} from 'react';
import {ScrollView, View, SafeAreaView, Alert} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { useSelector } from 'react-redux';
import { openAddPbaasCurrencyModal, openConvertOrCrossChainSendModal, openLinkIdentityModal, openProvisionIdentityModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { findCoinObj } from '../../../utils/CoinData/CoinData';
import { Button, Divider, List, Portal } from 'react-native-paper';
import { signLoginConsentResponse } from '../../../utils/api/channels/vrpc/requests/signLoginConsentResponse';
import BigNumber from 'bignumber.js';
import { VERUSID_NETWORK_DEFAULT } from "../../../../env/index";
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import Colors from '../../../globals/colors';
import { NavigationActions } from '@react-navigation/compat';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import SubWalletSelectorModal from '../../SubWalletSelect/SubWalletSelectorModal';
import { SEND_MODAL_ADVANCED_FORM, SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_CONVERTTO_FIELD, SEND_MODAL_EXPORTTO_FIELD, SEND_MODAL_IS_PRECONVERT, SEND_MODAL_MEMO_FIELD, SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH, SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD, SEND_MODAL_PRICE_ESTIMATE, SEND_MODAL_SHOW_CONVERTTO_FIELD, SEND_MODAL_SHOW_EXPORTTO_FIELD, SEND_MODAL_SHOW_VIA_FIELD, SEND_MODAL_TO_ADDRESS_FIELD, SEND_MODAL_VIA_FIELD } from '../../../utils/constants/sendModal';
import { VRPC } from '../../../utils/constants/intervalConstants';

const InvoicePaymentConfiguration = props => {
  const {
    deeplinkData, 
    sigtime, 
    cancel, 
    signerFqn, 
    currencyDefinition, 
    amountDisplay, 
    destinationDisplay,
    coinObj,
    chainInfo,
    acceptedSystemsDefinitions
  } = props.route.params;
  const [isListSelectionModalVisible, setIsListSelectionModalVisible] = useState(false);
  const [isSubWalletSelectorModalVisible, setIsSubWalletSelectorModalVisible] = useState(false);
  const [listData, setListData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [linkedIds, setLinkedIds] = useState({});
  const [selectedSubWallet, setSelectedSubWallet] = useState(null);
  const inv = primitives.VerusPayInvoice.fromJson(deeplinkData);

  const [activeCoin, setActiveCoin] = useState(null);
  const [activeCoinCurrencyIds, setActiveCoinCurrencyIds] = useState([]);

  const [subWalletSetFirstTime, setSubWalletSetFirstTime] = useState(false);

  const [subWalletOptions, setSubWalletOptions] = useState([]);

  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  
  const testnetOverrides = useSelector(state => state.authentication.activeAccount.testnetOverrides);
  const allSubWallets = useSelector(state => state.coinMenus.allSubWallets)

  const [sendCurrencyDefinition, setSendCurrencyDefinition] = useState(
    inv.details.acceptsConversion() ? null : currencyDefinition,
  );

  const { system_id } = inv;

  const openListSelectionModal = () => {
    setIsListSelectionModalVisible(true);
  };

  useEffect(() => {
    if (acceptedSystemsDefinitions) {
      const dataList = Object.values(acceptedSystemsDefinitions.definitions).map(def => ({
        title: def.fullyqualifiedname,
        description: def.currencyid,
        key: def.currencyid
      }));
      setListData(dataList);
    }
  }, [acceptedSystemsDefinitions]);

  useEffect(() => {
    if (activeCoinsForUser) {
      setActiveCoinCurrencyIds(activeCoinsForUser.map(coinObj => coinObj.currency_id));
    }
  }, [activeCoinsForUser]);

  useEffect(() => {
    if (activeCoinsForUser && sendCurrencyDefinition) {
      setActiveCoin(activeCoinsForUser.find(x => x.currency_id === sendCurrencyDefinition.currencyid));
    }
  }, [activeCoinsForUser, sendCurrencyDefinition]);

  useEffect(() => {
    if (allSubWallets && activeCoin && allSubWallets[activeCoin.id]) {
      const validSubWallets = allSubWallets[activeCoin.id].filter(x => {
        const channelSplit = x.channel.split('.');
        if (channelSplit.length < 3) return false;

        const [channelName, iAddress, systemId] = channelSplit;

        if (channelName === VRPC) {
          if (inv.details.acceptsNonVerusSystems()) {
            return systemId === coinObj.currency_id || inv.details.acceptedsystems.includes(systemId);
          } else {
            return systemId === coinObj.currency_id;
          }
        }
      })

      if (!subWalletSetFirstTime) {
        setSubWalletSetFirstTime(true)
        setSelectedSubWallet(validSubWallets[0])
      }

      setSubWalletOptions(validSubWallets)
    } else {
      setSubWalletOptions([])
    }
  }, [allSubWallets, activeCoin]);
  
  const openAddCoinModal = () => {
    Alert.alert(
      'Add Currency',
      'In order to proceed in paying this invoice, you will need to add the ' +
        coinObj.display_ticker +
        ' currency to your wallet.',
    );

    openAddPbaasCurrencyModal(coinObj, {
      [SEND_MODAL_PBAAS_CURRENCY_PASSTHROUGH]: true,
      [SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD]: sendCurrencyDefinition.currencyid,
    })
  }

  const selectCurrencyAlert = () => {
    return createAlert("Select a Currency", "Please select a currency to pay in.")
  }

  const handleSelectSource = () => {
    if (sendCurrencyDefinition == null) selectCurrencyAlert()
    else if (activeCoin == null) openAddCoinModal()
    else {
      setIsSubWalletSelectorModalVisible(true)
    }
  }

  const onSelectSubwallet = (subWallet) => {
    setIsSubWalletSelectorModalVisible(false)
    setSelectedSubWallet(subWallet)
  }

  const handleContinue = () => {
    openConvertOrCrossChainSendModal(activeCoin, selectedSubWallet, {
      [SEND_MODAL_TO_ADDRESS_FIELD]: inv.details.acceptsAnyDestination() ? '' : inv.details.destination.getAddressString(),
      [SEND_MODAL_AMOUNT_FIELD]: inv.details.acceptsConversion() || inv.details.acceptsAnyAmount() ? '' : amountDisplay,
      [SEND_MODAL_MEMO_FIELD]: '',
      [SEND_MODAL_CONVERTTO_FIELD]: inv.details.acceptsConversion() ? '' : '',
      [SEND_MODAL_EXPORTTO_FIELD]: '',
      [SEND_MODAL_VIA_FIELD]: inv.details.acceptsConversion() ? '' : '',
      [SEND_MODAL_PRICE_ESTIMATE]: null,
      [SEND_MODAL_IS_PRECONVERT]: false,
      [SEND_MODAL_SHOW_CONVERTTO_FIELD]: inv.details.acceptsConversion(),
      [SEND_MODAL_SHOW_EXPORTTO_FIELD]: !inv.details.acceptsConversion() && !inv.details.expires(),
      [SEND_MODAL_SHOW_VIA_FIELD]: inv.details.acceptsConversion(),
      [SEND_MODAL_ADVANCED_FORM]: true
    })
  };

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {
          isSubWalletSelectorModalVisible && (
            <SubWalletSelectorModal
              visible={isSubWalletSelectorModalVisible}
              cancel={() => setIsSubWalletSelectorModalVisible(false)}
              animationType="slide"
              subWallets={subWalletOptions}
              chainTicker={activeCoin != null ? activeCoin.id : ""}
              displayTicker={activeCoin != null ? activeCoin.display_ticker : ""}
              onSelect={onSelectSubwallet}
            />
          )
        }
        {
          isListSelectionModalVisible && (
            <ListSelectionModal
              visible={isListSelectionModalVisible}
              data={listData}
              onSelect={handleNetworkSelect}
              cancel={() => setIsListSelectionModalVisible(false)}
              title="Supported Payment Networks"
              flexHeight={1}
            />
          )
        }
      </Portal>
      <View style={{flex: 1, width: '100%'}}>
        <ScrollView style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
          <Divider />
          {
            !inv.details.acceptsAnyAmount() && (
              <React.Fragment>
                <List.Item
                  title={!inv.details.acceptsConversion() ? amountDisplay : ''}
                  description={'Amount to pay'}
                  left={props => (
                    <List.Icon
                      {...props}
                      color={
                        sendCurrencyDefinition
                          ? Colors.verusGreenColor
                          : Colors.infoButtonColor
                      }
                      icon={
                        sendCurrencyDefinition != null ? 'check' : 'circle-edit-outline'
                      }
                      size={20}
                    />
                  )}
                />
                <Divider />
              </React.Fragment>
            )
          }
          <List.Item
            title={
              sendCurrencyDefinition != null
                ? sendCurrencyDefinition.fullyqualifiedname
                : 'Select a currency'
            }
            description={'Currency to pay in'}
            left={props => (
              <List.Icon
                {...props}
                color={
                  sendCurrencyDefinition
                    ? Colors.verusGreenColor
                    : Colors.infoButtonColor
                }
                icon={sendCurrencyDefinition != null ? 'check' : 'circle-edit-outline'}
                size={20}
              />
            )}
          />
          <Divider />
          <List.Item
            onPress={handleSelectSource}
            title={
              selectedSubWallet != null
                ? `${selectedSubWallet.name} (${
                    acceptedSystemsDefinitions &&
                    acceptedSystemsDefinitions.definitions[selectedSubWallet.network]
                      ? acceptedSystemsDefinitions.definitions[selectedSubWallet.network]
                          .fullyqualifiedname
                      : '??'
                  } network)`
                : 'Select a source'
            }
            description={'Source of funds to pay invoice from'}
            left={props => (
              <List.Icon
                {...props}
                color={
                  selectedSubWallet ? Colors.verusGreenColor : Colors.infoButtonColor
                }
                icon={selectedSubWallet != null ? 'check' : 'circle-edit-outline'}
                size={20}
              />
            )}
          />
          <Divider />
        </ScrollView>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#fff', // or any other background color
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{width: 148}}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={Colors.verusGreenColor}
            style={{width: 148}}
            disabled={activeCoin == null || selectedSubWallet == null || sendCurrencyDefinition == null}
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default InvoicePaymentConfiguration;
