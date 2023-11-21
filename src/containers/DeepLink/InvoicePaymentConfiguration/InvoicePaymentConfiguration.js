import React, {useState, useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { useSelector } from 'react-redux';
import { openLinkIdentityModal, openProvisionIdentityModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { findCoinObj } from '../../../utils/CoinData/CoinData';
import { Button, Divider, List } from 'react-native-paper';
import { signLoginConsentResponse } from '../../../utils/api/channels/vrpc/requests/signLoginConsentResponse';
import BigNumber from 'bignumber.js';
import { VERUSID_NETWORK_DEFAULT } from "../../../../env/index";
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import Colors from '../../../globals/colors';
import { NavigationActions } from '@react-navigation/compat';

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
  const [loading, setLoading] = useState(false);
  const [linkedIds, setLinkedIds] = useState({});
  const inv = new primitives.VerusPayInvoice(deeplinkData);

  const activeCoinsForUser = useSelector(state => state.coins.activeCoinsForUser);
  const testnetOverrides = useSelector(state => state.authentication.activeAccount.testnetOverrides);

  const [sendCurrencyDefinition, setSendCurrencyDefinition] = useState(
    inv.details.acceptsConversion() ? null : currencyDefinition,
  );
  const [networkDefinition, setNetworkDefinition] = useState(null);

  const activeCoinIds = activeCoinsForUser.map(coinObj => coinObj.id);

  const { system_id } = inv;

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <ScrollView style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}>
      <Divider />
      <List.Item
        title={sendCurrencyDefinition != null ? sendCurrencyDefinition.fullyqualifiedname : "Select a currency"}
        description={"Currency to pay invoice in"}
        left={props => <List.Icon
          {...props}
          color={sendCurrencyDefinition ? Colors.verusGreenColor : Colors.warningButtonColor}
          icon={sendCurrencyDefinition != null ? "check" : "asterisk"}
          size={20}
        />}
      />
      <Divider />
      {inv.details.acceptsConversion() && <React.Fragment>
        <List.Item
          title={""}
          description={"Amount required to pay invoice"}
        />
        <Divider />
      </React.Fragment>}
      <List.Item
        title={
          inv.details.acceptsNonVerusSystems()
            ? networkDefinition == null
              ? 'Select a network'
              : networkDefinition
            : coinObj.display_name
        }
        description={'Network to pay invoice on'}
        left={props => (
          <List.Icon
            {...props}
            color={
              inv.details.acceptsNonVerusSystems() && networkDefinition == null
                ? Colors.warningButtonColor
                : Colors.verusGreenColor
            }
            icon={
              inv.details.acceptsNonVerusSystems() && networkDefinition == null
                ? 'asterisk'
                : 'check'
            }
            size={20}
          />
        )}
      />
      <Divider />
      <View
        style={{
          ...Styles.fullWidthBlock,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          display: 'flex',
        }}>
        <Button
          color={Colors.warningButtonColor}
          style={{width: 148}}
          onPress={() => props.navigation.dispatch(NavigationActions.back())}>
          Cancel
        </Button>
        <Button
          color={Colors.verusGreenColor}
          style={{width: 148}}
          //onPress={() => handleContinue()}
        >
          Continue
        </Button>
      </View>
    </ScrollView>
  );
};

export default InvoicePaymentConfiguration;
