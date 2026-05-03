// Updated invoice request UI to match DeepLink request styling.
import React, {useState, useEffect} from 'react';
import {Platform, SafeAreaView, ScrollView, TouchableOpacity, View} from 'react-native';
import { primitives } from "verusid-ts-client"
import { Button, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { blocksToTime, satsToCoins, unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../../globals/colors';
import GradientButton from '../../../components/GradientButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { AUTHENTICATE_USER_SEND_MODAL, SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import BigNumber from 'bignumber.js';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { invoiceInfoStyles as styles } from '../../../styles';

const DetailRow = ({ title, subtitle, onPress, rightIcon, showBorder }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper
      style={[
        styles.detailRow,
        showBorder && styles.detailRowBorder,
        onPress && styles.detailRowPressable,
      ]}
      {...wrapperProps}
    >
      <View style={styles.detailLeft}>
        <Text style={styles.detailTitle}>{title}</Text>
        {subtitle ? <Text style={styles.detailSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightIcon ? (
        <MaterialCommunityIcons name={rightIcon} size={18} color="#888" />
      ) : null}
    </Wrapper>
  );
};

const InvoiceInfo = props => {
  const { 
    detailsBufferString, 
    isSigned,
    invoiceVersion,
    sigtime, 
    cancel, 
    signerFqn, 
    signerSystemID,
    signerIdentityID,
    currencyDefinition, 
    amountDisplay, 
    destinationDisplay,
    coinObj,
    chainInfo,
    acceptedSystemsDefinitions
  } = props;
  const insets = useSafeAreaInsets();
  const bottomNavigationInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 24 : 0,
  );
  const footerBottomPadding = 16 + bottomNavigationInset;

  const { fullyqualifiedname } = currencyDefinition;
  const [details, setDetails] = useState(new primitives.VerusPayInvoiceDetails());
  const chain_id = isSigned ? getSystemNameFromSystemId(signerSystemID) : null;

  const getVerusId = async (chain, iAddrOrName) => {
    const identity = await getIdentity(CoinDirectory.getBasicCoinObj(chain).system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  }

  const getAcceptedSystemsLabel = () => {
    if (!details.acceptsNonVerusSystems() && !details.excludesVerusBlockchain()) {
      return details.isTestnet() ? 'VRSCTEST' : 'VRSC'
    }

    const acceptedNames = Object.values(acceptedSystemsDefinitions.definitions).map(definition => {
      return definition.fullyqualifiedname
    }).join(', ')

    if (acceptedSystemsDefinitions.remainingSystems.length > 0) {
      return acceptedNames + ` + ${acceptedSystemsDefinitions.remainingSystems.length} more`
    } else return acceptedNames
  }

  const getExpiryLabel = () => {
    if (!details.expires()) return "";

    return blocksToTime(details.expiryheight.toNumber() - chainInfo.longestchain);
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

  const handleSignerDetailsPress = () => {
    if (!chain_id || !signerIdentityID) {
      createAlert('Signer unavailable', 'No signer identity is available for this invoice.');
      return;
    }

    openVerusIdDetailsModal(chain_id, signerIdentityID);
  }

  const [isListSelectionModalVisible, setIsListSelectionModalVisible] = useState(false);
  const [listData, setListData] = useState([]);
  const [expiryLabel, setExpiryLabel] = useState(getExpiryLabel());
  const [acceptedSystemsLabel, setAcceptedSystemsLabel] = useState(getAcceptedSystemsLabel());
  const [loading, setLoading] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);
  const [sigDateString, setSigDateString] = useState(unixToDate(sigtime));
  const [waitingForSignin, setWaitingForSignin] = useState(false);

  const accounts = useObjectSelector(state => state.authentication.accounts);
  
  const signedIn = useSelector(state => state.authentication.signedIn);
  const sendModalType = useSelector(state => state.sendModal.type);

  const isTestAccount = useSelector(state => {
    return state.authentication.activeAccount && Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0;
  });

  const isSignedIn = useSelector(state => {
    return state.authentication.signedIn
  })

  const [sendCurrencyDefinition, setSendCurrencyDefinition] = useState(null);
  const [selectCurrencyModalProps, setSelectCurrencyModalProps] = useState(null);
  const [coinDetailsModalProps, setCoinDetailsModalProps] = useState(null);

  handleContinue = () => {
    if (signedIn) {
      props.navigation.navigate('InvoicePaymentConfiguration', props);
    } else {
      setWaitingForSignin(true);
      const allowList = details.isTestnet() ? accounts.filter(x => {
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
            details.isTestnet() ? 'testnet' : 'mainnet'
          } profiles found, cannot respond to ${
            details.isTestnet() ? 'testnet' : 'mainnet'
          } login request.`,
        );
      }
    }
  };

  const openListSelectionModal = () => {
    setIsListSelectionModalVisible(true);
  };

  const isWrongInvoiceType = (det) => {
    return isSignedIn && ((isTestAccount && !det.isTestnet()) || (!isTestAccount && det.isTestnet()))
  }
  
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
    setExpiryLabel(getExpiryLabel())
  }, [isSigned, signerSystemID, details]);

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
    const det = new primitives.VerusPayInvoiceDetails();

    det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0, new primitives.BigNumber(invoiceVersion));

    setDetails(det);

    if (isWrongInvoiceType(det)) {
      wrongInvoiceType(det.isTestnet());
    }
  }, [detailsBufferString]);

  useEffect(() => {
    setSigDateString(unixToDate(sigtime))
  }, [sigtime]);

  useEffect(() => {
    if (sendModalType != AUTHENTICATE_USER_SEND_MODAL) {
      setLoading(false)
    } else setLoading(true)
  }, [sendModalType]);

  const requesterLabel = signerFqn || signerIdentityID || 'Unknown signer';
  const canOpenSignerModal = Boolean(chain_id && signerIdentityID);
  
  const isAnyAmount = details.acceptsAnyAmount() || amountDisplay == null;
  const heroAmount = isAnyAmount ? "Any Amount" : amountDisplay;
  const heroCurrency = fullyqualifiedname;

  const destinationLabel = details.acceptsAnyDestination() || !destinationDisplay
    ? 'Any destination'
    : destinationDisplay;

  const detailRows = [];
  detailRows.push({
    key: 'destination',
    title: destinationLabel,
    subtitle: 'Destination',
    onPress: details.acceptsAnyDestination()
      ? null
      : () =>
          copyToClipboard(destinationDisplay, {
            title: 'Destination copied',
            message: `${destinationDisplay} copied to clipboard.`,
          }),
    rightIcon: details.acceptsAnyDestination() ? null : 'content-copy',
  });

  if (details.acceptsConversion()) {
    detailRows.push({
      key: 'conversion',
      title: 'Conversion supported',
      subtitle: 'You can pay with other currencies.',
    });
    detailRows.push({
      key: 'slippage',
      title: `${satsToCoins(BigNumber(details.maxestimatedslippage)).multipliedBy(100).toString()}%`,
      subtitle: 'Max. est. deviation from predicted conversion result',
      onPress: () => describeSlippage(),
      rightIcon: 'information-outline',
    });
  }

  if (details.expires()) {
    detailRows.push({
      key: 'expiry',
      title: expiryLabel,
      subtitle: 'Expires in approx.',
    });
  }

  if (details.acceptsNonVerusSystems()) {
    detailRows.push({
      key: 'networks',
      title: acceptedSystemsLabel,
      subtitle: 'Supported payment networks',
      onPress: () => openListSelectionModal(),
      rightIcon: 'information-outline',
    });
  }

  if (details.isTagged()) {
    detailRows.push({
      key: 'tag-note',
      title: 'Tagged invoice',
      subtitle: 'The payment will be easier to recognize on-chain.',
    });
    detailRows.push({
      key: 'tag',
      title: details.tag.address,
      subtitle: 'Transaction tag',
      onPress: () =>
        copyToClipboard(details.tag.address, {
          title: 'Tag copied',
          message: `${details.tag.address} copied to clipboard.`,
        }),
      rightIcon: 'content-copy',
    });
  }

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        {isListSelectionModalVisible && (
          <ListSelectionModal
            visible={isListSelectionModalVisible}
            data={listData}
            showSearch={true}
            searchPlaceholder="Search networks"
            onSelect={handleSupportedNetworkSelect}
            cancel={() => setIsListSelectionModalVisible(false)}
            title="Supported Payment Networks"
            flexHeight={1}
          />
        )}
      </Portal>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.mainTitle}>VerusPay invoice</Text>
        </View>

        {isSigned ? (
          <TouchableOpacity
            style={styles.requesterCard}
            onPress={canOpenSignerModal ? handleSignerDetailsPress : undefined}
            activeOpacity={canOpenSignerModal ? 0.7 : 1}
          >
            <View style={styles.requesterHeaderRow}>
              <View style={styles.requesterIconContainer}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={28}
                  color={Colors.verusGreenColor}
                />
              </View>
              <View style={styles.requesterTextContainer}>
                <Text style={styles.requesterLabel}>Request from</Text>
                <Text style={styles.requesterName}>{requesterLabel}</Text>
              </View>
              {canOpenSignerModal ? (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={Colors.verusDarkGray}
                />
              ) : null}
            </View>
            <View style={styles.requesterDetailsRow}>
              {chain_id ? (
                <View style={styles.chipContainer}>
                  <Text style={styles.chipText}>{chain_id}</Text>
                </View>
              ) : null}
              {sigDateString ? (
                <View style={styles.chipContainer}>
                  <Text style={styles.chipText}>{sigDateString}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.unsignedCard}>
            <View style={styles.unsignedIconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#B45309" />
            </View>
            <View style={styles.unsignedTextContainer}>
              <Text style={styles.unsignedTitle}>Unsigned invoice</Text>
              <Text style={styles.unsignedSubtitle}>
                This invoice does not include a signer identity.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.heroContainer}>
          <Text style={styles.heroAmount}>{heroAmount}</Text>
          <Text style={styles.heroCurrency}>{heroCurrency}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Invoice details</Text>
            </View>
          </View>
          <View style={styles.sectionContent}>
            {detailRows.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No additional details.</Text>
              </View>
            ) : (
              detailRows.map((row, index) => (
                <DetailRow
                  key={row.key}
                  title={row.title}
                  subtitle={row.subtitle}
                  onPress={row.onPress}
                  rightIcon={row.rightIcon}
                  showBorder={index > 0}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
      <View style={[styles.footer, {paddingBottom: footerBottomPadding}]}>
        <View style={styles.ctaCol}>
          <Button
            mode="contained"
            onPress={() => cancel()}
            style={styles.secondaryCta}
            contentStyle={styles.secondaryCtaContent}
            uppercase={false}
            buttonColor="#EBF6FF"
            textColor={Colors.primaryColor}
            labelStyle={styles.secondaryCtaLabel}
          >
            Cancel
          </Button>
        </View>
        <View style={styles.ctaCol}>
          <GradientButton onPress={() => handleContinue()} style={styles.primaryCta}>
            Continue
          </GradientButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default InvoiceInfo;
