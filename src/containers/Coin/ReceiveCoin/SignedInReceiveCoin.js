import React from 'react';
import {RefreshControl, ScrollView, TouchableOpacity, View} from 'react-native';
import {Button, Checkbox, Portal, Text, TextInput} from 'react-native-paper';
import CopyAction from '../../../components/CopyAction';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import NumberPadModal from '../../../components/NumberPadModal/NumberPadModal';
import QRModal from '../../../components/QRModal';
import {createSignedInStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {coinsList} from '../../../utils/CoinData/CoinsList';

const getSupportedNetworks = (subWallet, networkName) => {
  const isVerusNetwork =
    subWallet.network === coinsList.VRSC.currency_id ||
    subWallet.network === coinsList.VRSCTEST.currency_id;
  return isVerusNetwork ? networkName : networkName + ', VRSC';
};

const getAmountLabel = ({
  amountFiat,
  displayCurrency,
  fiatEnabled,
  price,
  selectedCoin,
}) => {
  if (!fiatEnabled || price === 0) return 'Amount';
  const estimateTicker = amountFiat
    ? selectedCoin.display_ticker
    : displayCurrency;
  return 'Amount (~' + price + ' ' + estimateTicker + ')';
};

const SignedInReceiveCoin = ({controller}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const {props, state} = controller;
  const {
    activeCoin,
    displayCurrency,
    generalWalletSettings,
    networkName,
    rates,
    subWallet,
  } = props;
  const {
    addressSelectModalOpen,
    addresses,
    allowConversion,
    amount,
    amountFiat,
    currentNumberInputModal,
    errors,
    loading,
    loadingBox,
    maxSlippage,
    selectedCoin,
    showingAddress,
    showModal,
    showVerusIconInQr,
    verusQRString,
  } = state;
  const price = controller.getPrice();
  const fiatEnabled = rates[displayCurrency] != null;

  if (loadingBox) return <AnimatedActivityIndicatorBox />;

  const showAddressQr = address => {
    controller.setState({
      verusQRString: address,
      showModal: true,
      showingAddress: true,
      showVerusIconInQr: false,
    });
  };

  return (
    <View style={styles.screen}>
      <Portal>
        {showModal && (
          <QRModal
            animationType="slide"
            transparent={false}
            visible={showModal && verusQRString && verusQRString.length > 0}
            qrString={verusQRString}
            showingAddress={showingAddress}
            showVerusIconInQr={showVerusIconInQr}
            cancel={() =>
              controller.setState({
                showModal: false,
                showingAddress: false,
                showVerusIconInQr: false,
              })
            }
          />
        )}
        {addressSelectModalOpen && (
          <ListSelectionModal
            title="Select an Address"
            flexHeight={1}
            visible
            onSelect={item => controller.validateFormData(item.key)}
            data={addresses.map((address, index) => ({
              key: index,
              title: address,
            }))}
            cancel={() => controller.setState({addressSelectModalOpen: false})}
          />
        )}
        {currentNumberInputModal != null && (
          <NumberPadModal
            value={Number(state[currentNumberInputModal])}
            visible
            onChange={number =>
              controller.setState({[currentNumberInputModal]: number.toString()})
            }
            cancel={() => controller.closeNumberInputModal()}
            decimals={activeCoin.decimals}
          />
        )}
      </Portal>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => controller.forceUpdate()} />
        }
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Receive to Card</Text>
        <Text style={styles.title}>{subWallet.name}</Text>
        {networkName != null && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => controller.networksInfoAlert()}
            style={[
              styles.surface,
              {marginTop: theme.spacing.md, padding: theme.spacing.md},
            ]}>
            <Text style={styles.rowDescription}>Supported networks</Text>
            <Text style={styles.rowTitle}>
              {getSupportedNetworks(subWallet, networkName)}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, {marginTop: theme.spacing.xl}]}>
          Address records
        </Text>
        {addresses.length === 0 ? (
          <View style={[styles.surface, {padding: theme.spacing.lg}]}>
            <Text style={styles.rowTitle}>No address available</Text>
            <Text style={styles.rowDescription}>
              Pull to refresh or choose a different Card.
            </Text>
          </View>
        ) : (
          addresses.map(address => {
            const addressInfo = subWallet.address_info[state.infoIndexes[address]];
            const label = addressInfo == null ? 'Address' : addressInfo.label;

            return (
              <View
                key={address}
                style={[
                  styles.surface,
                  {padding: theme.spacing.md, marginBottom: theme.spacing.sm},
                ]}>
                <Text style={styles.rowDescription}>{label}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text
                    selectable
                    style={[
                      styles.rowTitle,
                      {flex: 1, marginRight: theme.spacing.sm},
                    ]}>
                    {address}
                  </Text>
                  <CopyAction value={address} accessibilityLabel={'Copy ' + label} />
                  <Button compact icon="qrcode" onPress={() => showAddressQr(address)}>
                    QR
                  </Button>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.sectionTitle, {marginTop: theme.spacing.lg}]}>
          Payment request
        </Text>
        <TouchableOpacity onPress={() => controller.openNumberInputModal('amount')}>
          <TextInput
            label={getAmountLabel({
              amountFiat,
              displayCurrency,
              fiatEnabled,
              price,
              selectedCoin,
            })}
            mode="outlined"
            value={amount}
            editable={false}
            pointerEvents="none"
            error={errors.amount}
            right={
              <TextInput.Icon
                icon="swap-horizontal"
                disabled={!fiatEnabled}
                onPress={() => controller.setState({amountFiat: !amountFiat})}
              />
            }
          />
        </TouchableOpacity>

        {amount != 0 &&
          activeCoin.proto === 'vrsc' &&
          subWallet.id !== 'PRIVATE_WALLET' && (
            <View style={{marginTop: theme.spacing.md}}>
              <Checkbox.Item
                color={theme.colors.primary}
                label="Allow payment with conversion from a PBaaS currency"
                status={allowConversion ? 'checked' : 'unchecked'}
                onPress={() => controller.toggleAllowConversion()}
                mode="android"
              />
              {generalWalletSettings.allowSettingVerusPaySlippage &&
                allowConversion && (
                  <TouchableOpacity
                    onPress={() => controller.openNumberInputModal('maxSlippage')}>
                    <TextInput
                      label="Maximum slippage"
                      mode="outlined"
                      value={maxSlippage + '%'}
                      editable={false}
                      pointerEvents="none"
                      error={errors.maxSlippage}
                    />
                  </TouchableOpacity>
                )}
            </View>
          )}
        <Button
          mode="contained"
          icon="qrcode"
          contentStyle={{minHeight: 52}}
          style={{marginTop: theme.spacing.lg}}
          disabled={addresses.length === 0}
          onPress={
            addresses.length > 1
              ? () => controller.setState({addressSelectModalOpen: true})
              : () => controller.validateFormData(0)
          }>
          Generate request
        </Button>
      </ScrollView>
    </View>
  );
};

export default SignedInReceiveCoin;
