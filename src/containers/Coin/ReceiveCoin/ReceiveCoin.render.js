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
import { Portal, Button, TextInput } from "react-native-paper"
import TextInputModal from "../../../components/TextInputModal/TextInputModal"
import NumberPadModal from "../../../components/NumberPadModal/NumberPadModal"

export const RenderReceiveCoin = function() {
  const _price = this.getPrice();
  const {
    state,
    props,
  } = this;
  const { rates, displayCurrency } = props;
  const {
    loading,
    showModal,
    verusQRString,
    selectedCoin,
    address,
    errors,
    amountFiat,
    currentTextInputModal,
    currentNumberInputModal,
    amount,
    memo
  } = state;
  const fiatEnabled =
    rates[selectedCoin.id] && rates[selectedCoin.id][displayCurrency] != null;

  return (
    <View style={Styles.defaultRoot}>
      <ScrollView
        style={Styles.fullWidth}
        contentContainerStyle={Styles.horizontalCenterContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => this.forceUpdate()} />
        }
      >
        <Portal>
          {showModal && (
            <QRModal
              animationType="slide"
              transparent={false}
              visible={showModal && verusQRString && verusQRString.length > 0}
              qrString={verusQRString}
              cancel={() => {
                this.setState({
                  showModal: false,
                });
              }}
            />
          )}
          {currentTextInputModal != null && (
            <TextInputModal
              value={this.state[currentTextInputModal]}
              visible={currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({ [currentTextInputModal]: text });
              }}
              cancel={() => this.closeTextInputModal()}
            />
          )}
          {currentNumberInputModal != null && (
            <NumberPadModal
              value={Number(this.state[currentNumberInputModal])}
              visible={currentNumberInputModal != null}
              onChange={(number) =>
                this.setState({
                  [currentNumberInputModal]: number.toString(),
                })
              }
              cancel={() => this.closeNumberInputModal()}
              decimals={this.props.activeCoin.decimals}
            />
          )}
        </Portal>
        <View style={Styles.wideBlock}>
          <View style={Styles.flexRow}>
            <TouchableOpacity
              onPress={() => this.copyAddressToClipboard()}
              style={{ ...Styles.flex }}
            >
              <TextInput
                label={"Address"}
                value={address}
                render={(props) => (
                  <NativeTextInput
                    {...props}
                  />
                )}
                editable={false}
                multiline
                pointerEvents="none"
                style={{
                  backgroundColor: Colors.secondaryColor,
                }}
                error={errors.memo}
              />
            </TouchableOpacity>
            <Button
              onPress={() => this.copyAddressToClipboard()}
              color={Colors.primaryColor}
              style={{
                alignSelf: "center",
                marginTop: 6,
              }}
              compact
            >
              {"Copy"}
            </Button>
          </View>
        </View>
        <View style={Styles.wideBlock}>
          <View style={Styles.flexRow}>
            <TouchableOpacity
              onPress={() => this.openNumberInputModal("amount")}
              style={{ ...Styles.flex }}
            >
              <TextInput
                label={`Amount${
                  fiatEnabled && _price != 0
                    ? ` (~${_price} ${
                        amountFiat ? selectedCoin.id : displayCurrency
                      })`
                    : ""
                }`}
                dense
                value={amount}
                editable={false}
                pointerEvents="none"
                style={{
                  backgroundColor: Colors.secondaryColor,
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
                alignSelf: "center",
                marginTop: 6,
              }}
              compact
            >
              {amountFiat ? displayCurrency : selectedCoin.id}
            </Button>
          </View>
        </View>
        <View style={Styles.wideBlock}>
          <View style={Styles.flexRow}>
            <TouchableOpacity
              onPress={() => this.openTextInputModal("memo")}
              style={{ ...Styles.flex }}
            >
              <TextInput
                label={"Note for receiver (optional)"}
                dense
                value={memo}
                editable={false}
                pointerEvents="none"
                style={{
                  backgroundColor: Colors.secondaryColor,
                }}
                error={errors.memo}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={Styles.fullWidthFlexCenterBlock}>
          <Button color={Colors.primaryColor} onPress={() => this.validateFormData()}>
            {"Generate Invoice"}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};
