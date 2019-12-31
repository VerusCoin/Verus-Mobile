/*
  This component's purpose is to display the user seed in 
  plaintext upon authorization. It uses the users password 
  to decrypt it from their userData stored in AsyncStorage.
*/

import React, { Component } from "react";
import Button1 from "../../../../symbols/button1";
import { 
  View, 
  Text, 
  ScrollView, 
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormInput } from 'react-native-elements'
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import styles from './DisplaySeed.styles';

class ResetPwd extends Component {
  constructor() {
    super();
    this.state = {
      seed: null,
      fromDeleteAccount: false
    };
  }

  componentDidMount() {
    if (this.props.navigation.state.params.data && this.props.navigation.state.params.data.seed) {
      this.setState({seed: this.props.navigation.state.params.data.seed})
    }

    if (this.props.navigation.state.params.data && this.props.navigation.state.params.data.fromDeleteAccount) {
      this.setState({fromDeleteAccount: this.props.navigation.state.params.data.fromDeleteAccount})
    }
  }

  resetToScreen = () => {
    route = this.state.fromDeleteAccount ? "DeleteProfile" : "Home"

    const resetAction = NavigationActions.reset({
      index: 0, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: route }),
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  render() {
    return (
      <ScrollView style={styles.root} contentContainerStyle={{height: '100%' ,alignItems: "center", justifyContent: "center"}}>
        <Text style={styles.wifLabel}>
          Unencrypted Wallet Seed:
        </Text>
        <View style={styles.valueContainer}>
          <FormInput 
            value={this.state.seed}
            inputStyle={styles.wifInput}
            multiline={true}
            editable={false}
          />
        </View>
        { this.state.seed &&
          <View style={{padding: 10, backgroundColor: '#FFF', marginTop: 5}}>
            <QRCode
              value={this.state.seed}
              size={250}
            />
          </View>
        }
        <View style={styles.buttonContainer}>
          <Button1 
            style={styles.cancelButton} 
            buttonContent="BACK" 
            onPress={this.back}
          />
          <Button1 
            style={styles.addAccountButton} 
            buttonContent={this.state.fromDeleteAccount ? "CONTINUE" : "HOME" }
            onPress={this.resetToScreen}
          />
        </View>
      </ScrollView>    
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ResetPwd);