/*
  This component is meant to be the overview screen for 
  the user profile settings menu. It provides the user
  with all configurable settings they have access to for 
  their user account. This includes changing passwords, 
  deleting accounts etc.
*/

import React, { Component } from "react";
import { ListItem } from "react-native-elements";
import { Divider, List } from "react-native-paper"
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
import { canEnableBiometry, canShowSeed } from "../../../actions/actions/channels/dlight/dispatchers/AlertManager";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";
import { checkPinForUser } from "../../../utils/asyncStore/asyncStore";

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
      onPasswordCorrect: () => {},
    };
  }

  _openSettings = (screen) => {
    let navigation = this.props.navigation;

    navigation.navigate(screen);
  };

  async componentDidMount() {
    this.setState({ supportedBiometryType: await getSupportedBiometryType() });
  }

  closePasswordDialog = (cb) => {
    this.setState(
      {
        passwordDialogOpen: false,
        onPasswordCorrect: () => {},
      },
      cb
    );
  };

  toggleBiometry = async (passwordCheck) => {
    if (passwordCheck.valid) {
      const { activeAccount } = this.props;
      const { supportedBiometryType } = this.state;
      const { biometry, accountHash, id } = activeAccount;

      this.closePasswordDialog(async () => {
        try {
          if (accountHash == null)
            throw new Error("No account hash for profile: " + id);

          if (biometry) {
            await removeBiometricPassword(accountHash);
            this.props.dispatch(await setBiometry(id, false));
            createAlert(
              "Success",
              `${
                supportedBiometryType.display_name
              } authentication disabled for profile "${id}"`
            );
          } else {
            await storeBiometricPassword(accountHash, passwordCheck.password);
            this.props.dispatch(await setBiometry(id, true));
            createAlert(
              "Success",
              `${
                supportedBiometryType.display_name
              } authentication enabled for profile "${id}"`
            );
          }
        } catch (e) {
          console.warn(e);
          createAlert(
            "Error",
            `Failed to ${
              biometry ? "disable" : "enable"
            } biometric authentication (${supportedBiometryType.display_name}).`
          );
        }
      });
    } else {
      createAlert("Authentication Error", "Incorrect password");
    }
  };

  showSeed = async (passwordCheck) => {
    if (passwordCheck.valid) {
      const { activeAccount } = this.props;
      const { id } = activeAccount;

      this.closePasswordDialog(async () => {
        checkPinForUser(passwordCheck.password, id)
          .then((seeds) => {
            this.setState({ password: null }, () => {
              this.props.navigation.navigate("DisplaySeed", {
                data: { seeds },
              });
            });
          })
          .catch((e) => {
            console.warn(e);
          });
      });
    } else {
      createAlert("Authentication Error", "Incorrect password");
    }
  };

  openPasswordCheck = (onPasswordCorrect) =>
    this.setState({
      passwordDialogOpen: true,
      passwordDialogTitle: `Enter password for "${
        this.props.activeAccount.id
      }"`,
      onPasswordCorrect,
    });

  renderSettingsList = () => {
    return (
      <ScrollView style={Styles.fullWidthBlock}>
        {/* TODO: Add back in when more interesting profile data and/or settings are implemented
          <TouchableOpacity onPress={() => this._openSettings(PROFILE_INFO)}>
            <ListItem                       
              title={<Text style={styles.coinItemLabel}>Profile Info</Text>}
              leftIcon={{name: 'info'}}
              containerStyle={{ borderBottomWidth: 0 }} 
            />
          </TouchableOpacity>*/}
        <List.Subheader>{"Security Settings"}</List.Subheader>
        <TouchableOpacity
          onPress={async () => {
            if (await canShowSeed()) this.openPasswordCheck(this.showSeed);
          }}
        >
          <Divider />
          <List.Item
            title={"Recover Seed"}
            left={(props) => <List.Icon {...props} icon={"lock-open"} />}
            right={(props) => (
              <List.Icon {...props} icon={"chevron-right"} size={20} />
            )}
          />
          <Divider />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this._openSettings(RESET_PWD)}>
          <List.Item
            title={"Change Password"}
            left={(props) => <List.Icon {...props} icon={"lock-reset"} />}
            right={(props) => (
              <List.Icon {...props} icon={"chevron-right"} size={20} />
            )}
          />
          <Divider />
        </TouchableOpacity>
        {(this.props.activeAccount.biometry ||
          this.state.supportedBiometryType.biometry) && (
          <TouchableOpacity
            onPress={async () => {
              if (this.props.activeAccount.biometry) {
                this.openPasswordCheck(this.toggleBiometry);
              } else if (await canEnableBiometry())
                this.openPasswordCheck(this.toggleBiometry);
            }}
          >
            <List.Item
              title={`${
                this.props.activeAccount.biometry ? "Disable" : "Setup"
              } biometric login`}
              left={(props) => <List.Icon {...props} icon={"lock"} />}
              right={(props) => <List.Icon {...props} icon={"chevron-right"} />}
            />
            <Divider />
          </TouchableOpacity>
        )}
        <PasswordCheck
          cancel={() => this.closePasswordDialog()}
          submit={(result) => this.state.onPasswordCorrect(result)}
          visible={this.state.passwordDialogOpen}
          title={this.state.passwordDialogTitle}
          userName={this.props.activeAccount.id}
        />
        <List.Subheader>{"Profile Actions"}</List.Subheader>
        <TouchableOpacity onPress={() => this._openSettings(REMOVE_PROFILE)}>
          <Divider />
          <List.Item
            title={"Delete Profile"}
            left={(props) => <List.Icon {...props} icon={"trash-can"} />}
            right={(props) => <List.Icon {...props} icon={"chevron-right"} />}
          />
          <Divider />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  render() {
    return <View style={Styles.defaultRoot}>{this.renderSettingsList()}</View>;
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ProfileSettings);
