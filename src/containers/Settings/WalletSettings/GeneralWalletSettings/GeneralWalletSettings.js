/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { FormLabel, Input, FormValidationMessage } from 'react-native-elements'
import { saveGeneralSettings } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors'

class WalletSettings extends Component {
  constructor(props) {
    super(props);

    if (this.props.generalWalletSettings.hasOwnProperty("maxTxCount")) {
      this.state = {
        ...this.props.generalWalletSettings,
        errors: { maxTxCount: false },
        loading: false
      }
    } else {
      this.state = {
        maxTxCount: "10",
        errors: { maxTxCount: false },
        loading: false
      };
    }
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  saveSettings = () => {
    this.setState({ loading: true }, () => {
      const stateToSave = {
        maxTxCount: Number(this.state.maxTxCount),
      }
      saveGeneralSettings(stateToSave)
      .then(res => {
        this.props.dispatch(res)
        this.setState({...this.props.generalWalletSettings, loading: false})
        Alert.alert("Success", "Settings saved")
      })
      .catch(err => {
        Alert.alert("Error", err.message)
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
      errors: {maxTxCount: null}
    }, () => {
      let _errors = false
      const _maxTxCount = this.state.maxTxCount

      if (!_maxTxCount || _maxTxCount.length === 0 || isNaN(_maxTxCount) || Number(_maxTxCount) < 10 || Number(_maxTxCount) > 100) {
        this.handleError("Please enter a valid number from 10 to 100", "maxTxCount")
        _errors = true
      }

      if (!_errors) {
        this.saveSettings()
      } 
    });
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={{...Styles.innerHeaderFooterContainerCentered, ...Styles.fullHeight}}>
            <Input 
              label="Maximum Displayed Transaction Count:"
              labelStyle={Styles.formCenterLabel}
              containerStyle={Styles.wideCenterBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.setState({maxTxCount: text})}
              value={this.state.maxTxCount.toString()}
              shake={this.state.errors.maxTxCount}
              keyboardType={'number-pad'}
              errorMessage={
                this.state.errors.maxTxCount ? 
                  this.state.errors.maxTxCount
                  :
                  null
              }
            />
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          {this.state.loading ? 
            <ActivityIndicator animating={this.state.loading} size="large"/>
          :
          <View style={Styles.standardWidthSpaceBetweenBlock}>
              <StandardButton 
                color={Colors.warningButtonColor}
                title="BACK" 
                onPress={this.back}
              />
              <StandardButton 
                color={Colors.linkButtonColor}
                title="CONFIRM" 
                onPress={this._handleSubmit}
              />
            </View>
          }
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    generalWalletSettings: state.settings.generalWalletSettings,
  }
};

export default connect(mapStateToProps)(WalletSettings);