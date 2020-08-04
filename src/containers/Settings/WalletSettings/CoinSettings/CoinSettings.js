/*
  This component allows you to modify coin-specific wallet settings
  for each coin. This includes things like level of UTXO verification,
  which would be locked to max for coins with custom electrum servers.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Text
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { ButtonGroup } from 'react-native-elements'
import { saveCoinSettings } from '../../../../actions/actionCreators';
import { connect } from 'react-redux';
import { 
  NO_VERIFICATION,
  MID_VERIFICATION,
  MAX_VERIFICATION,
  NO_VERIFICATION_DESC,
  MID_VERIFICATION_DESC,
  MAX_VERIFICATION_DESC,
  VERIFICATION_LOCKED
} from '../../../../utils/constants/constants'
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors';

class CoinSettings extends Component {
  constructor(props) {
    super(props);
    this.coinID = this.props.route.params.data
    this.verificationLock = this.props.coinSettings[this.coinID].verificationLock

    if (this.props.coinSettings.hasOwnProperty(this.coinID)) {
      this.state = {
        ...this.props.coinSettings[this.coinID],
        errors: { verificationLvl: false },
        loading: false
      }
    } else {
      this.state = {
        verificationLvl: MAX_VERIFICATION,
        errors: { verificationLvl: false },
        loading: false
      };
    }
    
    this.updateIndex = this.updateIndex.bind(this)
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  static navigationOptions = ({ navigation }) => {
    return {
      title: typeof(route.params)==='undefined' || 
      typeof(route.params.title) === 'undefined' ? 
      'undefined': `${route.params.title} Settings`,
    };
  };

  updateIndex(verificationLvl) {
    this.setState({verificationLvl: verificationLvl})
  }

  saveSettings = () => {
    this.setState({ loading: true }, () => {
      const stateToSave = {
        verificationLvl: this.state.verificationLvl,
      }
      saveCoinSettings(stateToSave, this.coinID)
      .then(res => {
        this.props.dispatch(res)
        this.setState({ ...this.props.coinSettings[this.coinID], loading: false })
        Alert.alert("Success", `${this.coinID} settings saved`)
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

  //TODO: Add more to this when more options are added
  validateFormData = () => {
    this.setState({
      errors: {verificationLvl: null}
    }, () => {
      let _errors = false

      if (!_errors) {
        this.saveSettings()
      } 
    });
  }

  render() {
    const utxoVerificationBtns = ['Low', 'Mid', 'High']

    return (
        <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={{...Styles.innerHeaderFooterContainerCentered, ...Styles.fullHeight}}>
            <View style={Styles.wideCenterBlock}>
              <Text style={Styles.centralHeader}>
                {"Transaction Verification:"}
              </Text>
              <ButtonGroup
                onPress={this.verificationLock ? null : this.updateIndex}
                selectedIndex={this.state.verificationLvl}
                buttons={utxoVerificationBtns}
                selectedButtonStyle={{backgroundColor: "#7c858f"}}
                selectedTextStyle={{color: "#f5f5f5"}}
                containerStyle={{backgroundColor: Colors.tertiaryColor}}
                textStyle={{fontFamily: 'Avenir-Book'}}
              />
              <View style={Styles.fullWidthBlock}> 
                <Text style={Styles.smallerDescriptiveText}>
                  { this.verificationLock ? 
                      VERIFICATION_LOCKED
                      :
                      this.state.verificationLvl === NO_VERIFICATION ? 
                        NO_VERIFICATION_DESC
                        :
                        this.state.verificationLvl === MID_VERIFICATION ? 
                          MID_VERIFICATION_DESC
                          :
                          MAX_VERIFICATION_DESC}
                </Text>
              </View>
            </View>
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
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(CoinSettings);

