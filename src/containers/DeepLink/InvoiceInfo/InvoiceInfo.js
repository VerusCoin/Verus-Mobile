import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, TouchableOpacity, View} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import { Button, Divider, List, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { blocksToTime, satsToCoins, unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
import Colors from '../../../globals/colors';
import { VerusPayTextLogo } from '../../../images/customIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import BigNumber from 'bignumber.js';

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
    if (!inv.details.acceptsNonVerusSystems() && !inv.details.excludesVerusBlockchain()) {
      return inv.details.isTestnet() ? 'VRSCTEST' : 'VRSC'
    }

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
    
          return getFriendlyNameMap(CoinDirectory.getBasicCoinObj(chain).system_id, identityObj);
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

  const [isListSelectionModalVisible, setIsListSelectionModalVisible] = useState(false);
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
  const isWrongInvoiceType = useSelector(state => {
    const isTestAccount =
      state.authentication.activeAccount &&
      Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;

    return (
      state.authentication.signedIn &&
      ((isTestAccount && !inv.details.isTestnet()) ||
      (!isTestAccount && inv.details.isTestnet()))
    );
  });

  const [sendCurrencyDefinition, setSendCurrencyDefinition] = useState(null);
  const [selectCurrencyModalProps, setSelectCurrencyModalProps] = useState(null);
  const [coinDetailsModalProps, setCoinDetailsModalProps] = useState(null);

  handleContinue = () => {
    if (signedIn) {
      props.navigation.navigate('InvoicePaymentConfiguration', props);
    } else {
      setWaitingForSignin(true);
      const allowList = inv.details.isTestnet() ? accounts.filter(x => {
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
          x.testnetOverrides[coinObj.id] != null
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
            inv.details.isTestnet() ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to ${
            inv.details.isTestnet() ? 'testnet' : 'mainnet'
          } login request.`,
        );
      }
    }
  };

  const openListSelectionModal = () => {
    setIsListSelectionModalVisible(true);
  };
  
  const handleSupportedNetworkSelect = (item) => {
    setIsListSelectionModalVisible(false);
  };

  const describeSlippage = () => {
    createAlert(
      "Slippage", 
      "The maximum estimated deviation percentage is used to limit which currencies you are allowed to convert through." + 
      " The percentage shown is the maximum allowed difference between the estimated conversion outcome of your chosen " + 
      "conversion path, and the real outcome. This value is calculated for each currency using factors that determine their" + 
      " respective volatilites, like the amount of currency in their respective reserves."
    )
  }

  const wrongInvoiceType = isTestInvoice => {
    createAlert(
      isTestInvoice ? 'Testnet Invoice' : 'Mainnet Invoice',
      `This invoice was created for ${
        isTestInvoice ? 'testnet' : 'mainnet'
      }, but you are using a ${
        isTestInvoice ? 'mainnet' : 'testnet'
      } profile. Please logout, select a ${
        isTestInvoice ? 'testnet' : 'mainnet'
      } profile, and retry this invoice to continue.`,
      [
        {
          text: 'Ok',
          onPress: () => {
            cancel();
            resolveAlert(true);
          },
        },
      ],
      {
        cancelable: false,
      },
    );
  };

  useEffect(() => {
    if (isWrongInvoiceType) {
      wrongInvoiceType(inv.details.isTestnet());
    }
  }, [])

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
          cancel={() => setIsListSelectionModalVisible(false)}
          title="Supported Payment Networks"
          flexHeight={1}
        />}
      </Portal>
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={Styles.focalCenter}>
          <VerusPayTextLogo width={'55%'} height={'10%'} />
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
                  <List.Item title={"This invoice accepts conversion, continue to see which currencies you can pay it with."} titleNumberOfLines={100}/>
                  <Divider />
                  <List.Item 
                    title={`${satsToCoins(BigNumber(inv.details.maxestimatedslippage)).multipliedBy(100).toString()}%`} 
                    titleNumberOfLines={100}
                    description={'Max. est. deviation from predicted conversion result'}
                    right={props => <List.Icon {...props} icon={'information'} size={20} />}
                    onPress={() => describeSlippage()}
                  />
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
                    description={'Supported Verus blockchains'}
                    right={props => <List.Icon {...props} icon={'information'} size={20} />}
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
            textColor={Colors.warningButtonColor}
            style={{ width: 148 }}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{ width: 148 }}
            disabled={isWrongInvoiceType}
            onPress={() => handleContinue()}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default InvoiceInfo;
