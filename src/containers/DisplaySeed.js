/*
  This component's purpose is to display the user seed in 
  plaintext upon authorization. It uses the users password 
  to decrypt it from their userData stored in AsyncStorage.
*/

import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormInput } from 'react-native-elements'
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';

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
      <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
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
            buttonContent="Back" 
            onPress={this.back}
          />
          <Button1 
            style={styles.addAccountButton} 
            buttonContent={this.state.fromDeleteAccount ? "Continue" : "Home" }
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

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    color: "#009B72",
    textAlign: "center"
  },
  buttonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addAccountButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 15,
    marginBottom: 40
  },
  cancelButton: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
  },
});