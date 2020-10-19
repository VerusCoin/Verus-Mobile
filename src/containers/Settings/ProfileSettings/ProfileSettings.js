/*
  This component is meant to be the overview screen for 
  the user profile settings menu. It provides the user
  with all configurable settings they have access to for 
  their user account. This includes changing passwords, 
  deleting accounts etc.
*/

import React, { Component } from "react";
import { ListItem } from "react-native-elements";
import { 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView, Alert
} from "react-native";
import { connect } from 'react-redux';
import Styles from '../../../styles/index'
import { getSupportedBiometryType, removeBiometricPassword, storeBiometricPassword } from "../../../utils/biometry/biometry";
import { setBiometry } from "../../../actions/actionCreators";
import PasswordCheck from "../../../components/PasswordCheck";
import AlertAsync from "react-native-alert-async";
import { BIOMETRY_WARNING } from "../../../utils/constants/constants";

const RESET_PWD = "ResetPwd"
const RECOVER_SEED = "RecoverSeed"
const PROFILE_INFO = "ProfileInfo"
const REMOVE_PROFILE = "DeleteProfile"

class ProfileSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      totalFiatBalance: 0,
      coinRates: {},
      loading: false,
      passwordDialogOpen: false,
      passwordDialogTitle: "",
      supportedBiometryType: {
        display_name: null,
        biometry: false,
      },
    };
  }

  _openSettings = (screen) => {
    let navigation = this.props.navigation;

    navigation.navigate(screen);
  };

  canEnableBiometry = () => {
    return AlertAsync(
      "Enable biometric authentication?",
      BIOMETRY_WARNING,
      [
        {
          text: "No",
          onPress: () => Promise.resolve(false),
          style: "cancel",
        },
        { text: "Yes", onPress: () => Promise.resolve(true) },
      ],
      {
        cancelable: false,
      }
    )
  }

  async componentDidMount() {
    this.setState({ supportedBiometryType: await getSupportedBiometryType() });
  }

  closePasswordDialog = (cb) => {
    this.setState({
      passwordDialogOpen: false,
    }, cb)
  }

  toggleBiometry = async (passwordCheck) => {
    if (passwordCheck.valid) {
      const { activeAccount } = this.props
      const { supportedBiometryType } = this.state
      const { biometry, accountHash, id } = activeAccount

      this.closePasswordDialog(async () => {
        try {
          if (accountHash == null) throw new Error("No account hash for profile: " + id)

          if (biometry) {
            await removeBiometricPassword(accountHash)
            this.props.dispatch(await setBiometry(id, false))
            Alert.alert("Success", `${supportedBiometryType.display_name} authentication disabled for profile "${id}"`)
          } else {
            await storeBiometricPassword(accountHash, passwordCheck.password)
            this.props.dispatch(await setBiometry(id, true))
            Alert.alert("Success", `${supportedBiometryType.display_name} authentication enabled for profile "${id}"`)
          }
        } catch(e) {
          console.warn(e)
          Alert.alert(
            "Error",
            `Failed to ${
              biometry ? "disable" : "enable"
            } biometric authentication (${
              supportedBiometryType.display_name
            }).`
          );
        }
        
      })
    } else {
      Alert.alert("Authentication Error", "Incorrect password")
    }
  }

  openPasswordCheck = () =>
    this.setState({
      passwordDialogOpen: true,
      passwordDialogTitle: `Enter password for "${this.props.activeAccount.id}"`,
    });

  renderSettingsList = () => {
    return (
      <ScrollView style={Styles.wide}>
        {/* TODO: Add back in when more interesting profile data and/or settings are implemented
          <TouchableOpacity onPress={() => this._openSettings(PROFILE_INFO)}>
            <ListItem                       
              title={<Text style={styles.coinItemLabel}>Profile Info</Text>}
              leftIcon={{name: 'info'}}
              containerStyle={{ borderBottomWidth: 0 }} 
            />
          </TouchableOpacity>*/}
        <TouchableOpacity onPress={() => this._openSettings(RECOVER_SEED)}>
          <ListItem
            title="Recover Seed"
            titleStyle={Styles.listItemLeftTitleDefault}
            leftIcon={{ name: "lock-open" }}
            containerStyle={Styles.bottomlessListItemContainer}
            chevron
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this._openSettings(RESET_PWD)}>
          <ListItem
            title="Reset Password"
            titleStyle={Styles.listItemLeftTitleDefault}
            leftIcon={{ name: "autorenew" }}
            containerStyle={Styles.bottomlessListItemContainer}
            chevron
          />
        </TouchableOpacity>
        {this.state.supportedBiometryType.biometry && (
          <TouchableOpacity onPress={async () => {
            if (this.props.activeAccount.biometry) {
              this.openPasswordCheck()
            } else if (await this.canEnableBiometry()) this.openPasswordCheck()
          }}>
            <ListItem
              title={`${
                this.props.activeAccount.biometry ? "Disable" : "Setup"
              } biometric login (${
                this.state.supportedBiometryType.display_name
              })`}
              titleStyle={Styles.listItemLeftTitleDefault}
              leftIcon={{ name: "lock" }}
              containerStyle={Styles.bottomlessListItemContainer}
            />
          </TouchableOpacity>
        )}
        <PasswordCheck 
          cancel={() => this.closePasswordDialog()}
          submit={this.toggleBiometry}
          visible={this.state.passwordDialogOpen}
          title={this.state.passwordDialogTitle}
          userName={this.props.activeAccount.id}
        />
        <TouchableOpacity onPress={() => this._openSettings(REMOVE_PROFILE)}>
          <ListItem
            title="Delete Profile"
            titleStyle={Styles.listItemLeftTitleDefault}
            leftIcon={{ name: "delete-forever" }}
            containerStyle={Styles.bottomlessListItemContainer}
            chevron
          />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <Text style={Styles.largeCentralPaddedHeader}>
          {this.props.activeAccount.id.length < 15
            ? this.props.activeAccount.id
            : "My Account"}
        </Text>
        <Text style={Styles.greyStripeHeader}>Profile Settings</Text>
        {this.renderSettingsList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ProfileSettings);
