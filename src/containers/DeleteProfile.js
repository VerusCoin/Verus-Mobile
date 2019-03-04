import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  Alert,
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  Switch
} from "react-native";
import { NavigationActions } from 'react-navigation';
import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements'
import { deleteUserByID } from '../actions/actionCreators';
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { checkPinForUser } from '../utils/asyncStore'

class DeleteProfile extends Component {
  constructor() {
    super();
    this.state = {
      pwd: null,
      confirmSwitch: false,
      errors: {pwd: null, confirmSwitch: null},
      loading: false,
    };
    this.updateIndex = this.updateIndex.bind(this)
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  updateIndex (selectedButtonIndex) {
    this.setState({selectedButtonIndex: selectedButtonIndex})
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  onSuccess = () => {
    Alert.alert("Success!", "Password for " + this.props.activeAccount.id + " reset successfully.");
    this.props.navigation.dispatch(NavigationActions.back())
  }

  canDelete = () => {
    return AlertAsync(
      'Confirm Deletion',
      "Are you sure you would like to delete this profile?",
      [
        {
          text: 'No, take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  validateFormData = () => {
    const userID = (this.props.navigation.state.params && this.props.navigation.state.params.data) ? 
      this.props.navigation.state.params.data.coinObj
      :
      this.props.activeAccount.id
    
    if (userID) {
      this.setState({
        errors: {pwd: null, confirmSwitch: null}
      }, () => {
        const _pwd = this.state.pwd
        const _confirmSwitch = this.state.confirmSwitch
        let _errors = false;
  
        if ((!_pwd || _pwd.length < 1) && (this.state.selectedButtonIndex === 0)) {
          this.handleError("Required field", "pwd")
          _errors = true
        } 
  
        if (!this.state.confirmSwitch) {
          this.handleError("Please confirm", "confirmSwitch")
          _errors = true
        }
  
        if (!_errors) {
          checkPinForUser(_pwd, userID)
          .then((res) => {
            if (res) {
              return this.canDelete()
            } else {
              return false
            }
          })
          .then((res) => {
            if (res) {
              let data = {
                task: deleteUserByID,
                message: "Deleting profile, please do not close Verus Mobile",
                input: userID
              }
              this.resetToScreen("SecureLoading", data)
            } 
          })
          .catch((error) => {
            console.warn(error)
          })
        } 
      });
    } else {
      Alert.alert("Error", "No account ID");
    }
    
  }

  authenticatePwd = () => {
    return (
      <View style={styles.valueContainer}>
        <FormLabel labelStyle={styles.formLabel}>
        Enter your password:
        </FormLabel>
        <FormInput 
          onChangeText={(text) => this.setState({pwd: text})}
          autoCapitalize={"none"}
          autoCorrect={false}
          secureTextEntry={true}
          shake={this.state.errors.pwd}
          inputStyle={styles.formInput}
        />
        <FormValidationMessage>
        {
          this.state.errors.pwd ? 
            this.state.errors.pwd
            :
            null
        }
        </FormValidationMessage>
      </View>
    )
  }

  resetToScreen = (route, data) => {
    const resetAction = NavigationActions.reset({
      index: 0, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: route, params: {data: data} }),
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.wifLabel}>
            {"Delete Profile"}
          </Text>
          {this.authenticatePwd()}
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
              I confirm that I would like to delete my profile, and acknowledge that 
              this action cannot be reversed.
            </FormLabel>
            <View style={styles.switchContainer}>
              <Switch 
                value={this.state.confirmSwitch}
                onValueChange={(value) => this.setState({confirmSwitch: value})}
              />
            </View>
            <FormValidationMessage>
            {
              this.state.errors.confirmSwitch ? 
                this.state.errors.confirmSwitch
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.buttonContainer}>
            <Button1 
              style={styles.cancelButton} 
              buttonContent="Cancel" 
              onPress={this.cancel}
            />
            <Button1 
              style={styles.addAccountButton} 
              buttonContent="Delete" 
              onPress={this._handleSubmit}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
      
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(DeleteProfile);

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
  /*labelContainer: {
    //borderWidth:1,
    //borderColor:"blue",
  },*/
  valueContainer: {
    width: "85%",
    //borderWidth:1,
    //borderColor:"blue",
  },
  switchContainer: {
    //borderWidth:1,
    //borderColor:"blue",
    alignItems: "flex-start",
    marginLeft: 18
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 50,
    marginBottom: 8,
    paddingBottom: 0,
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