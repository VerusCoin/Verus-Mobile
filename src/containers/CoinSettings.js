/*
  This component allows you to modify coin-specific wallet settings
  for each coin. This includes things like level of UTXO verification,
  which would be locked to max for coins with custom electrum servers.
*/

import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, ButtonGroup } from 'react-native-elements'
import { saveCoinSettings } from '../actions/actionCreators';
import { connect } from 'react-redux';
import { 
  NO_VERIFICATION,
  MID_VERIFICATION,
  MAX_VERIFICATION,
  NO_VERIFICATION_DESC,
  MID_VERIFICATION_DESC,
  MAX_VERIFICATION_DESC,
  VERIFICATION_LOCKED
} from '../utils/constants'

class CoinSettings extends Component {
  constructor(props) {
    super(props);
    this.coinID = this.props.navigation.state.params.data
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
      title: typeof(navigation.state.params)==='undefined' || 
      typeof(navigation.state.params.title) === 'undefined' ? 
      'undefined': `${navigation.state.params.title} Settings`,
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <ScrollView contentContainerStyle={{paddingTop: "30%", alignItems: "center", justifyContent: "flex-start"}}>
            <View style={{...styles.valueContainer, marginTop: 15}}>
              <FormLabel labelStyle={styles.formLabel}>
                {"Level of UTXO verification:"}
              </FormLabel>
              <ButtonGroup
                onPress={this.verificationLock ? null : this.updateIndex}
                selectedIndex={this.state.verificationLvl}
                buttons={utxoVerificationBtns}
                selectedButtonStyle={{backgroundColor: "#7c858f"}}
                selectedTextStyle={{color: "#f5f5f5"}}
                //disabled={true}
                //^ This doesnt work and it's supposed to (bugged)
              />
              <FormLabel labelStyle={{...styles.utxoVerificationDesc, color: this.verificationLock ? "#EDAE49" : "#2E86AB"}}>
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
              </FormLabel>
            </View>
          </ScrollView>
          <View style={styles.bottom}>
            {this.state.loading ? 
              <ActivityIndicator animating={this.state.loading} size="large"/>
            :
              <View style={styles.buttonContainer}>
                <Button1 
                  style={styles.backButton} 
                  buttonContent="Back" 
                  onPress={this.back}
                />
                <Button1 
                  style={styles.saveChangesButton} 
                  buttonContent="Confirm" 
                  onPress={this._handleSubmit}
                />
              </View>
            }
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(CoinSettings);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  keyGenLabel: {
    textAlign:"left",
    marginRight: "auto",
    color: "#2E86AB"
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
  },
  mainHeader: {
    backgroundColor: "transparent",
    marginTop: 30,
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    color: "#009B72"
  },
  buttonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveChangesButton: {
    height: 46,
    backgroundColor: "#009B72",
    marginTop: 15,
  },
  clearCacheButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 25,
    marginBottom: 25
  },
  backButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
  },
  utxoVerificationDesc: {
    textAlign:"left",
    marginRight: "auto"
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 36
  }
});