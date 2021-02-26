/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, { Component } from "react";
import { 
  View, 
  ScrollView, 
  Keyboard,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { saveGeneralSettings } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors'
import { CURRENCY_NAMES, SUPPORTED_CURRENCIES, USD } from '../../../../utils/constants/currencies'
import { Dropdown } from "react-native-material-dropdown";
import NumberPadModal from "../../../../components/NumberPadModal/NumberPadModal";
import { Divider, List, Portal, Text, Button } from "react-native-paper";
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";

const NO_DEFAULT = "None"

class WalletSettings extends Component {
  constructor(props) {
    super(props);
    const { generalWalletSettings } = props

    this.state = {
      ...generalWalletSettings,
      maxTxCount:
        generalWalletSettings.maxTxCount != null
          ? generalWalletSettings.maxTxCount
          : "10",
      displayCurrency:
        generalWalletSettings.displayCurrency != null
          ? generalWalletSettings.displayCurrency
          : USD,
      defaultAccount: generalWalletSettings.defaultAccount,
      errors: { maxTxCount: false, displayCurrency: false },
      loading: false,
      currentNumberInputModal: null,
      displayCurrencyModalOpen: false,
      defaultProfileModalOpen: false
    };
  }

  openNumberInputModal(inputKey) {
    this.setState({
      currentNumberInputModal: inputKey
    })
  }

  closeNumberInputModal() {
    this.setState({
      currentNumberInputModal: null
    })
  }

  openDisplayCurrencyModal() {
    this.setState({
      displayCurrencyModalOpen: true
    })
  }

  closeDisplayCurrencyModal() {
    this.setState({
      displayCurrencyModalOpen: false
    })
  }

  openDefaultProfileModal() {
    this.setState({
      defaultProfileModalOpen: true
    })
  }

  closeDefaultProfileModal() {
    this.setState({
      defaultProfileModalOpen: false
    })
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  saveSettings = () => {
    this.setState({ loading: true }, () => {
      const stateToSave = {
        maxTxCount: Number(this.state.maxTxCount),
        displayCurrency: this.state.displayCurrency,
        defaultAccount:
          this.state.defaultAccount === NO_DEFAULT
            ? null
            : this.state.defaultAccount,
      };

      saveGeneralSettings(stateToSave)
      .then(res => {
        this.props.dispatch(res)
        this.setState({...this.props.generalWalletSettings, loading: false})
        createAlert("Success", "Settings saved")
      })
      .catch(err => {
        createAlert("Error", err.message)
        console.warn(err.message)
        this.setState({ loading: false })
      })
    })
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  validateFormData = () => {
    this.setState({
      errors: { maxTxCount: null, displayCurrency: null }
    }, () => {
      let _errors = false
      const _maxTxCount = this.state.maxTxCount

      if (
        !_maxTxCount ||
        _maxTxCount.length === 0 ||
        isNaN(_maxTxCount) ||
        Number(_maxTxCount) < 10 ||
        Number(_maxTxCount) > 100
      ) {
        this.handleError(
          "Please enter a valid number from 10 to 100",
          "maxTxCount"
        );
        _errors = true;
      }

      if (!_errors) {
        this.saveSettings()
      } 
    });
  }

  render() {
    const { currentNumberInputModal, displayCurrencyModalOpen, defaultProfileModalOpen } = this.state
    const defaultAccount = this.state.defaultAccount == null ? null : this.props.accounts.find(
      (item) => item.accountHash === this.state.defaultAccount
    )
    const defaultAccountName = defaultAccount == null ? null : defaultAccount.id

    return (
      <View style={Styles.defaultRoot}>
        <Portal>
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
              decimals={0}
            />
          )}
          {displayCurrencyModalOpen && (
            <ListSelectionModal
              title="Currencies"
              selectedKey={this.state.displayCurrency}
              visible={displayCurrencyModalOpen}
              onSelect={(item) =>
                this.setState({
                  displayCurrency: item.key,
                })
              }
              data={SUPPORTED_CURRENCIES.map((key) => {
                return {
                  key,
                  title: key,
                  description: CURRENCY_NAMES[key],
                };
              })}
              cancel={() => this.closeDisplayCurrencyModal()}
            />
          )}
          {defaultProfileModalOpen && (
            <ListSelectionModal
              title="Profiles"
              selectedKey={this.state.defaultAccount}
              visible={defaultProfileModalOpen}
              onSelect={(item) =>
                this.setState({
                  defaultAccount: item.key,
                })
              }
              data={[
                {
                  key: NO_DEFAULT,
                  title: "None",
                  description: "Manually select profile on app start",
                },
                ...this.props.accounts.map((item) => {
                  return {
                    key: item.accountHash,
                    title: item.id,
                    description:
                      item.id === this.props.activeAccount.id
                        ? "Currently logged in"
                        : null,
                  };
                }),
              ]}
              cancel={() => this.closeDefaultProfileModal()}
            />
          )}
        </Portal>
        <ScrollView style={Styles.fullWidthBlock}>
          <List.Subheader>{"Display Settings"}</List.Subheader>
          <TouchableOpacity
            onPress={() => this.openNumberInputModal("maxTxCount")}
            style={{ ...Styles.flex }}
          >
            <Divider />
            <List.Item
              title={"Max. Display TXs"}
              description="Max. displayed Electrum transactions"
              right={() => (
                <Text style={Styles.listItemTableCell}>
                  {this.state.maxTxCount}
                </Text>
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => this.openDisplayCurrencyModal()}
            style={{ ...Styles.flex }}
          >
            <Divider />
            <List.Item
              title={"Universal Display Currency"}
              description="The currency used to display value"
              right={() => (
                <Text style={Styles.listItemTableCell}>
                  {this.state.displayCurrency}
                </Text>
              )}
            />
            <Divider />
          </TouchableOpacity>
          <List.Subheader>{"Start Settings"}</List.Subheader>
          <TouchableOpacity
            onPress={() => this.openDefaultProfileModal()}
            style={{ ...Styles.flex }}
          >
            <Divider />
            <List.Item
              title={"Default Profile"}
              description="Automatically selected profile on app start"
              right={() => (
                <Text style={Styles.listItemTableCell}>
                  {defaultAccountName == null
                    ? NO_DEFAULT
                    : defaultAccountName}
                </Text>
              )}
            />
            <Divider />
          </TouchableOpacity>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          {this.state.loading ? (
            <ActivityIndicator
              animating={this.state.loading}
              style={{
                paddingTop: 32
              }}
              size="large"
            />
          ) : (
            <View style={Styles.standardWidthSpaceBetweenBlock}>
              <Button color={Colors.warningButtonColor} onPress={this.back}>
                {"Back"}
              </Button>
              <Button
                color={Colors.primaryColor}
                onPress={this._handleSubmit}
              >
                {"Confirm"}
              </Button>
            </View>
          )}
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    generalWalletSettings: state.settings.generalWalletSettings,
    accounts: state.authentication.accounts,
    activeAccount: state.authentication.activeAccount
  }
};

export default connect(mapStateToProps)(WalletSettings);