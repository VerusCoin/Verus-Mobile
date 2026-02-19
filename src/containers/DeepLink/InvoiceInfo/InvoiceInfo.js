// Updated invoice request UI to match DeepLink request styling.
import React, {useState, useEffect} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import { primitives } from "verusid-ts-client"
import { Button, Portal, Text } from 'react-native-paper';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { getFriendlyNameMap, getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { blocksToTime, satsToCoins, unixToDate } from '../../../utils/math';
import { useSelector } from 'react-redux';
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
      <View style={styles.footer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.2,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  requesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    zIndex: 2,
  },
  requesterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requesterIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requesterTextContainer: {
    flex: 1,
  },
  requesterLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  requesterName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  requesterDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  unsignedCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  unsignedIconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  unsignedTextContainer: {
    flex: 1,
  },
  unsignedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  unsignedSubtitle: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionHelper: {
    fontSize: 12,
    color: '#888',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    marginTop: -4,
  },
  sectionContent: {
    padding: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  detailRowPressable: {},
  detailLeft: {
    flex: 1,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  detailSubtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  emptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
  },
  footer: {
    backgroundColor: 'white',
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  ctaCol: {
    flex: 1,
    minWidth: 0,
  },
  secondaryCta: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF6FF',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  secondaryCtaContent: {
    height: 44,
  },
  secondaryCtaLabel: {
    color: Colors.primaryColor,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'none',
  },
  primaryCta: {
    width: '100%',
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 22,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -1,
    textAlign: 'center',
  },
  heroCurrency: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

export default InvoiceInfo;
