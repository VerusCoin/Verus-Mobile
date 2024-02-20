import React, { Component } from "react"
import { 
  View, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  TextInput as NativeTextInput,
 } from "react-native"
import Styles from '../../../styles/index'
import QRModal from '../../../components/QRModal'
import Colors from '../../../globals/colors';
import { Portal, Button, TextInput, Checkbox } from "react-native-paper"
import TextInputModal from "../../../components/TextInputModal/TextInputModal"
import NumberPadModal from "../../../components/NumberPadModal/NumberPadModal"
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import { useSelector } from "react-redux";
import AnimatedActivityIndicatorBox from "../../../components/AnimatedActivityIndicatorBox";

export const RenderReceiveCoin = function() {
 
  const _price = this.getPrice();
  const {
    state,
    props,
  } = this;
  const { rates, displayCurrency, generalWalletSettings } = props;
  const {
    loading,
    showModal,
    verusQRString,
    selectedCoin,
    addresses,
    errors,
    amountFiat,
    currentTextInputModal,
    currentNumberInputModal,
    amount,
    addressSelectModalOpen,
    showingAddress,
    showVerusIconInQr,
    loadingBox,
    maxSlippage
  } = state;
  const fiatEnabled = rates[displayCurrency] != null;

  return loadingBox ? <AnimatedActivityIndicatorBox /> : (
    <View style={[Styles.defaultRoot,
    {
      backgroundColor: this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor,
    }
    ]}>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.horizontalCenterContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => this.forceUpdate()}
          />
        }>
        <Portal>
          {showModal && (
            <QRModal
              animationType="slide"
              transparent={false}
              visible={showModal && verusQRString && verusQRString.length > 0}
              qrString={verusQRString}
              showingAddress={showingAddress}
              showVerusIconInQr={showVerusIconInQr}
              cancel={() => {
                this.setState({
                  showModal: false,
                  showingAddress: false,
                  showVerusIconInQr: false
                });
              }}
            />
          )}
          {addressSelectModalOpen && (
            <ListSelectionModal
              title="Select an Address"
              flexHeight={1}
              visible={addressSelectModalOpen}
              onSelect={item => this.validateFormData(item.key)}
              data={this.state.addresses.map((addr, index) => {
                return {
                  key: index,
                  title: addr,
                };
              })}
              cancel={() => this.setState({addressSelectModalOpen: false})}
            />
          )}
          {currentTextInputModal != null && (
            <TextInputModal
              value={this.state[currentTextInputModal]}
              visible={currentTextInputModal != null}
              onChange={text => {
                if (text != null)
                  this.setState({[currentTextInputModal]: text});
              }}
              cancel={() => this.closeTextInputModal()}
            />
          )}
          {currentNumberInputModal != null && (
            <NumberPadModal
              value={Number(this.state[currentNumberInputModal])}
              visible={currentNumberInputModal != null}
              onChange={number =>
                this.setState({
                  [currentNumberInputModal]: number.toString(),
                })
              }
              cancel={() => this.closeNumberInputModal()}
              decimals={this.props.activeCoin.decimals}
            />
          )}
        </Portal>
        {addresses.map((address) => {
          const addressInfo =
            this.props.subWallet.address_info[this.state.infoIndexes[address]];
          const label = addressInfo == null ? "Address" : addressInfo.label

          return (
            <View style={Styles.wideBlock}>
              <View style={Styles.flexRow}>
                <TouchableOpacity
                  onPress={() => this.copyAddressToClipboard(address)}
                  style={{...Styles.flex,backgroundColor:this.props.darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey}}>
                  <TextInput
                   style={{ flex: 1,
                    backgroundColor:this.props.darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey
                  }}
                  theme={{
                    colors: {
                      text:this.props.darkMode
                        ? Colors.secondaryColor
                        : 'black',
                      placeholder:this.props.darkMode
                        ? Colors.verusDarkGray
                        : Colors.verusDarkGray,
                    },
                  }}
                    returnKeyType="done"
                    label={label}
                    value={address}
                    render={props => <NativeTextInput {...props} />}
                    editable={false}
                    multiline
                    pointerEvents="none"
                    
                    error={errors.memo}
                  />
                </TouchableOpacity>
                <Button
                  onPress={() => this.showAddressString()}
                  color={Colors.primaryColor}
                  style={{
                    alignSelf: 'center',
                    marginTop: 6,
                  }}
                  compact>
                  {'QR'}
                </Button>
                <Button
                  onPress={() => this.copyAddressToClipboard(address)}
                  color={Colors.primaryColor}
                  style={{
                    alignSelf: 'center',
                    marginTop: 6,
                  }}
                  compact>
                  {'Copy'}
                </Button>
              </View>
            </View>
          );
        })}
        <View style={Styles.wideBlock}>
          <View style={Styles.flexRow}>
            <TouchableOpacity
              onPress={() => this.openNumberInputModal('amount')}
              style={{...Styles.flex}}>
              <TextInput
                returnKeyType="done"
                label={`Amount${
                  fiatEnabled && _price != 0
                    ? ` (~${_price} ${
                        amountFiat ? selectedCoin.display_ticker : displayCurrency
                      })`
                    : ''
                }`}
                dense
                value={amount}
                editable={false}
                pointerEvents="none"
                style={{ flex: 1,
                  backgroundColor:this.props.darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey
                }}
                theme={{
                  colors: {
                    text:this.props.darkMode
                      ? Colors.secondaryColor
                      : 'black',
                    placeholder:this.props.darkMode
                      ? Colors.verusDarkGray
                      : Colors.verusDarkGray,
                  },
                }}
                error={errors.amount}
              />
            </TouchableOpacity>
            <Button
              onPress={() =>
                this.setState({
                  amountFiat: !amountFiat,
                })
              }
              color={Colors.primaryColor}
              disabled={!fiatEnabled}
              style={{
                alignSelf: 'center',
                marginTop: 6,
              }}
              compact>
              {amountFiat ? displayCurrency : selectedCoin.display_ticker}
            </Button>
          </View>
        </View>
        {
          this.state.amount != 0 && this.props.activeCoin.proto === 'vrsc' && this.props.subWallet.id !== "PRIVATE_WALLET" && (
            <React.Fragment>
              <View style={Styles.wideBlock}>
                <Checkbox.Item
                  color={Colors.primaryColor}
                  label={'Allow payment with conversion from a PBaaS currency'}
                  status={this.state.allowConversion ? 'checked' : 'unchecked'}
                  onPress={() => this.toggleAllowConversion()}
                  mode="android"
                  style={{
                    width: '100%',
                  }}
                />
              </View>
              {generalWalletSettings.allowSettingVerusPaySlippage && this.state.allowConversion &&
                <View style={{...Styles.wideBlock, paddingTop: 0}}>
                  <View style={Styles.flexRow}>
                    <TouchableOpacity
                      onPress={() => this.openNumberInputModal('maxSlippage')}
                      style={{...Styles.flex}}>
                      <TextInput
                        returnKeyType="done"
                        label={'Maximum slippage'}
                        dense
                        value={maxSlippage}
                        editable={false}
                        pointerEvents="none"
                        style={{
                          backgroundColor: Colors.secondaryColor,
                        }}
                        error={errors.maxSlippage}
                      />
                    </TouchableOpacity>
                    <Button
                      color={Colors.primaryColor}
                      disabled={true}
                      style={{
                        alignSelf: 'center',
                        marginTop: 6,
                      }}
                      compact>
                      {"%"}
                    </Button>
                  </View>
                </View>
              }
            </React.Fragment>
          )
        }
        <View style={Styles.fullWidthFlexCenterBlock}>
          <Button
            color={Colors.primaryColor}
            disabled={addresses.length === 0}
            onPress={
              addresses.length > 1
                ? () => {
                    this.setState({addressSelectModalOpen: true});
                  }
                : () => this.validateFormData(0)
            }>
            {'Generate Invoice'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};
