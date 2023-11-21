import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, TouchableOpacity, View} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { blocksToTime, unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { VerusIdLogo } from '../../../images/customIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';

const InvoiceInfo = props => {
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
  } = props;
  const { fullyqualifiedname } = currencyDefinition;
  const [inv, setInv] = useState(new primitives.VerusPayInvoice(deeplinkData));
  const [mainHeading, setMainHeading] = useState(getMainHeading());
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [acceptedSystemsLabel, setAcceptedSystemsLabel] = useState(getAcceptedSystemsLabel());
  const [loading, setLoading] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const accounts = useSelector(state => state.authentication.accounts);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);

  const [sendCurrencyDefinition, setSendCurrencyDefinition] = useState(null);
  const [selectCurrencyModalProps, setSelectCurrencyModalProps] = useState(null);
  const [coinDetailsModalProps, setCoinDetailsModalProps] = useState(null);

  const { system_id, signing_id, details } = inv;
  const chain_id = getSystemNameFromSystemId(system_id);

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  }

  const getMainHeading = () => {
    const recipientLabel = inv.isSigned() ? signerFqn : 'This unsigned invoice';
    const amountLabel = inv.details.acceptsAnyAmount() ? 'any amount of' : amountDisplay;
    const destinationLabel = destinationDisplay;
    const currencyLabel = fullyqualifiedname;

    return `${recipientLabel} is requesting ${amountLabel} ${currencyLabel} to ${destinationLabel}.`
  }

  const getAcceptedSystemsLabel = () => {
    const acceptedNames = Object.values(acceptedSystemsDefinitions.definitions).map(definition => {
      return definition.fullyqualifiedname
    }).join(', ')

    if (acceptedSystemsDefinitions.remainingSystems.length > 0) {
      return acceptedNames + ` + ${acceptedSystemsDefinitions.remainingSystems} more`
    } else return acceptedNames
  }

  const getExpiryLabel = () => {
    if (!inv.details.expires()) return "";

    return blocksToTime(inv.details.expiryheight.toNumber() - chainInfo.longestchain);
  }

  const getCoinObj = () => {
    return CoinDirectory.findCoinObj(chain_id);
  }

  const openVerusIdDetailsModal = (chain, iAddress) => {
    setVerusIdDetailsModalProps({
      loadVerusId: () => getVerusId(chain, iAddress),
      visible: true,
      animationType: 'slide',
      cancel: () => setVerusIdDetailsModalProps(null),
      loadFriendlyNames: async () => {
        try {
          const identityObj = await getVerusId(chain, iAddress);
    
          return getFriendlyNameMap(CoinDirectory.getBasicCoinObj(chain), identityObj);
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain
    });
  }

  useEffect(() => {
    if (signedIn && waitingForSignin) {
      handleContinue();
    }
  }, [signedIn, waitingForSignin]);

  useEffect(() => {
    if (selectCurrencyModalProps == null) {
      setSendCurrencyDefinition(null);
    }
  }, [selectCurrencyModalProps]);

  useEffect(() => {
    setMainHeading(getMainHeading())
  }, [inv]);

  useEffect(() => {
    setAcceptedSystemsLabel(getAcceptedSystemsLabel())
  }, [acceptedSystemsDefinitions]);

  useEffect(() => {
    setCoinObj(getCoinObj())
  }, [chain_id, inv]);

  useEffect(() => {
    setInv(new primitives.VerusPayInvoice(deeplinkData))
  }, [deeplinkData]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime))
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false)
    } else setLoading(true)
  }, [sendModalType]);

  handleContinue = () => {
    if (signedIn) {
      if (!inv.details.acceptsConversion() && !inv.details.acceptsNonVerusSystems()) {
        props.navigation.navigate('InvoicePaymentConfiguration', {
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
        });
      }
    } else {
      setWaitingForSignin(true);
      const coinObj = CoinDirectory.findCoinObj(chain_id);
      const allowList = coinObj.testnet ? accounts.filter(x => {
        if (
          x.testnetOverrides &&
          x.testnetOverrides[coinObj.mainnet_id] === coinObj.id
        ) {
          return true;
        } else {
          return false;
        }
      }) : accounts.filter(x => {
        if (
          x.testnetOverrides &&
          x.testnetOverrides[coinObj.mainnet_id] != null
        ) {
          return false;
        } else {
          return true;
        }
      })

      if (allowList.length > 0) {
        const data = {
          [SEND_MODAL_USER_ALLOWLIST]: allowList
        }
  
        openAuthenticateUserModal(data);
      } else {
        createAlert(
          "Cannot continue",
          `No ${
            coinObj.testnet ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to ${
            coinObj.testnet ? 'testnet' : 'mainnet'
          } login request.`,
        );
      }
    }
  };

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
      </Portal>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.focalCenter}>
        <VerusIdLogo width={'55%'} height={'10%'} />
        <View style={Styles.wideBlock}>
          <Text style={{fontSize: 20, textAlign: 'center'}}>
            {mainHeading}
          </Text>
        </View>
        <View style={Styles.fullWidth}>
          {
            inv.details.acceptsConversion() && (
              <React.Fragment>
                <List.Item title={"This invoice accepts conversion, continue to see which currencies you can pay it with."}/>
                <Divider />
              </React.Fragment>
            )
          }
          {
            inv.details.expires() && (
              <React.Fragment>
                <List.Item title={expiryLabel} description={'Expires in approx.'} />
                <Divider />
              </React.Fragment>
            )
          }
          {
            inv.details.acceptsNonVerusSystems() && (
              <React.Fragment>
                <List.Item title={acceptedSystemsDefinitions} description={'Supported payment networks'} />
                <Divider />
              </React.Fragment>
            )
          }
          {
            inv.isSigned() && (
              <React.Fragment>
                <TouchableOpacity
                  onPress={() => openVerusIdDetailsModal(chain_id, signing_id)}>
                  <List.Item
                    title={signerFqn}
                    description={'Requested by'}
                    right={props => <List.Icon {...props} icon={'information'} size={20} />}
                  />
                  <Divider />
                </TouchableOpacity>
                <List.Item title={chain_id} description={'Signature system'} />
                <Divider />
                <List.Item title={sigDateString} description={'Signed on'} />
                <Divider />
              </React.Fragment>
            )
          }
        </View>
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
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={Colors.verusGreenColor}
            style={{width: 148}}
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InvoiceInfo;
