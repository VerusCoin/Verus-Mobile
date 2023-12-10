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
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';

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
  const [inv, setInv] = useState(primitives.VerusPayInvoice.fromJson(deeplinkData));
  const { system_id, signing_id, details } = inv;
  const chain_id = inv.isSigned() ? getSystemNameFromSystemId(system_id) : null;

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

    return `${recipientLabel} is requesting ${amountLabel} ${currencyLabel} to ${destinationLabel}`
  }

  const getAcceptedSystemsLabel = () => {
    if (!inv.details.acceptsNonVerusSystems()) return coinObj.testnet ? 'VRSCTEST' : 'VRSC'

    const acceptedNames = Object.values(acceptedSystemsDefinitions.definitions).map(definition => {
      return definition.fullyqualifiedname
    }).join(', ')

    if (acceptedSystemsDefinitions.remainingSystems.length > 0) {
      return acceptedNames + ` + ${acceptedSystemsDefinitions.remainingSystems.length} more`
    } else return acceptedNames
  }

  const getExpiryLabel = () => {
    if (!inv.details.expires()) return "";

    return blocksToTime(inv.details.expiryheight.toNumber() - chainInfo.longestchain);
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

  const [isListSelectionModalVisible, setisListSelectionModalVisible] = useState(false);
  const [listData, setListData] = useState([]);
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

  handleContinue = () => {
    // if (signedIn) {
    //   if (!inv.details.acceptsConversion() && !inv.details.acceptsNonVerusSystems()) {
    //     props.navigation.navigate('InvoicePaymentConfiguration', {
    //       deeplinkData, 
    //       sigtime, 
    //       cancel, 
    //       signerFqn, 
    //       currencyDefinition, 
    //       amountDisplay, 
    //       destinationDisplay,
    //       coinObj,
    //       chainInfo,
    //       acceptedSystemsDefinitions
    //     });
    //   }
    // } else {
    //   setWaitingForSignin(true);
    //   const coinObj = CoinDirectory.findCoinObj(chain_id);
    //   const allowList = coinObj.testnet ? accounts.filter(x => {
    //     if (
    //       x.testnetOverrides &&
    //       x.testnetOverrides[coinObj.mainnet_id] === coinObj.id
    //     ) {
    //       return true;
    //     } else {
    //       return false;
    //     }
    //   }) : accounts.filter(x => {
    //     if (
    //       x.testnetOverrides &&
    //       x.testnetOverrides[coinObj.mainnet_id] != null
    //     ) {
    //       return false;
    //     } else {
    //       return true;
    //     }
    //   })

    //   if (allowList.length > 0) {
    //     const data = {
    //       [SEND_MODAL_USER_ALLOWLIST]: allowList
    //     }
  
    //     openAuthenticateUserModal(data);
    //   } else {
    //     createAlert(
    //       "Cannot continue",
    //       `No ${
    //         coinObj.testnet ? 'testnet' : 'mainnet'
    //       } profiles found, cannot respond to ${
    //         coinObj.testnet ? 'testnet' : 'mainnet'
    //       } login request.`,
    //     );
    //   }
    // }
  };

  const openListSelectionModal = () => {
    setisListSelectionModalVisible(true);
  };
  
  const handleSupportedNetworkSelect = (item) => {
    setisListSelectionModalVisible(false);
  };

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
    setExpiryLabel(getExpiryLabel())
  }, [inv]);

  useEffect(() => {
    setAcceptedSystemsLabel(getAcceptedSystemsLabel())

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
    setInv(primitives.VerusPayInvoice.fromJson(deeplinkData))
  }, [deeplinkData]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime))
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false)
    } else setLoading(true)
  }, [sendModalType]);

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={Styles.defaultRoot}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        {isListSelectionModalVisible && <ListSelectionModal
          visible={isListSelectionModalVisible}
          data={listData}
          onSelect={handleSupportedNetworkSelect}
          cancel={() => setisListSelectionModalVisible(false)}
          title="Supported Payment Networks"
          flexHeight={1}
        />}
      </Portal>
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={Styles.focalCenter}>
          <VerusIdLogo width={'55%'} height={'10%'} />
          <TouchableOpacity
            disabled={inv.details.acceptsAnyDestination()}
            style={Styles.wideBlock}
            onPress={() =>
              copyToClipboard(destinationDisplay, {
                title: 'Destination copied',
                message: `${destinationDisplay} copied to clipboard.`,
              })
            }>
            <Text style={{fontSize: 18, textAlign: 'center'}}>{mainHeading}</Text>
          </TouchableOpacity>
          <View style={Styles.fullWidth}>
            {(inv.details.acceptsConversion() ||
              inv.details.expires() ||
              inv.details.acceptsNonVerusSystems() ||
              inv.isSigned()
            ) && <Divider />}
            {
              inv.details.acceptsConversion() && (
                <React.Fragment>
                  <List.Item title={"This invoice accepts conversion, continue to see which currencies you can pay it with."} />
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
                  <List.Item
                    title={acceptedSystemsLabel}
                    onPress={openListSelectionModal}
                    titleNumberOfLines={100}
                    description={'Supported payment networks'}
                  />
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
                      description={'Signed by'}
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
        </ScrollView>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: '#fff' // or any other background color
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{ width: 148 }}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={Colors.verusGreenColor}
            style={{ width: 148 }}
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default InvoiceInfo;
