/*
  This component is meant to be the overview screen for 
  the user profile settings menu. It provides the user
  with all configurable settings they have access to for 
  their user account. This includes changing passwords, 
  deleting accounts etc.
*/

import React, { Component } from "react";
import { ListItem } from "react-native-elements";
import { Divider, List, Portal } from "react-native-paper"
import { 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView, Alert
} from "react-native";
import { connect } from 'react-redux';
import Styles from '../../../styles/index'
import { getSupportedBiometryType, removeBiometricPassword, storeBiometricPassword } from "../../../utils/biometry/biometry";
import { addEncryptedKey, setBiometry } from "../../../actions/actionCreators";
import PasswordCheck from "../../../components/PasswordCheck";
import {
  canEnableBiometry,
  canShowSeed,
} from "../../../actions/actions/channels/dlight/dispatchers/AlertManager";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";
import { checkPinForUser } from "../../../utils/asyncStore/asyncStore";
import { ENABLE_DLIGHT } from '../../../../env/main.json'
import { dlightEnabled } from "../../../utils/enabledChannels";
import SetupSeedModal from "../../../components/SetupSeedModal/SetupSeedModal";
import { DLIGHT_PRIVATE } from "../../../utils/constants/intervalConstants";

const RESET_PWD = "ResetPwd"
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
      privateSeedModalOpen: false,
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

  addZSeed = (seed, channel) => {
    this.openPasswordCheck(async (result) => {
      if (result.valid) {
        try {
          await addEncryptedKey(
            this.props.activeAccount.accountHash,
            channel,
            seed,
            result.password
          );

          createAlert(
            "Success",
            `Z Seed set for ${
              this.props.activeAccount.id
            }. Restart Verus Mobile and login to start using Z cards!`
          );
        } catch(e) {
          createAlert("Error", e.message);
        }
      } else {
        createAlert("Authentication Error", "Incorrect password");
      }
    })
  }

  openPasswordCheck = (onPasswordCorrect) =>
    this.setState({
      passwordDialogOpen: true,
      passwordDialogTitle: `Enter password for "${
        this.props.activeAccount.id
      }"`,
      onPasswordCorrect,
    });

  renderSettingsList = () => {
    const zSetupComplete = dlightEnabled()

    return (
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          <SetupSeedModal
            animationType="slide"
            transparent={false}
            visible={this.state.privateSeedModalOpen}
            cancel={() => {
              this.setState({ privateSeedModalOpen: false });
            }}
            setSeed={(seed, channel) => this.addZSeed(seed, channel)}
            channel={DLIGHT_PRIVATE}
          />
        </Portal>
        {/* TODO: Add back in when more interesting profile data and/or settings are implemented
          <TouchableOpacity onPress={() => this._openSettings(PROFILE_INFO)}>
            <ListItem                       
              title={<Text style={styles.coinItemLabel}>Profile Info</Text>}
              leftIcon={{name: 'info'}}
              containerStyle={{ borderBottomWidth: 0 }} 
            />
          </TouchableOpacity>*/}
        <List.Subheader>{"Current Profile"}</List.Subheader>
        <Divider />
        <List.Item
          title={this.props.activeAccount.id}
          description={"Logged In"}
          left={(props) => <List.Icon {...props} icon={"account"} />}
        />
        <Divider />
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
              right={(props) => (
                <List.Icon {...props} icon={"chevron-right"} />
              )}
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
        {ENABLE_DLIGHT && (
          <TouchableOpacity
            onPress={() => {
              this.setState({ privateSeedModalOpen: true });
            }}
            disabled={zSetupComplete}
          >
            <Divider />
            <List.Item
              title={
                zSetupComplete
                  ? "Z Seed Setup Complete"
                  : "Setup Z (Shielded Address) Seed"
              }
              description={
                zSetupComplete
                  ? ""
                  : "Setting up a Z Seed will allow you to use private transactions on compatible coins (after a restart)"
              }
              left={(props) => <List.Icon {...props} icon={"shield-key"} />}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => this._openSettings(REMOVE_PROFILE)}
        >
          <Divider />
          <List.Item
            title={"Delete Profile"}
            left={(props) => <List.Icon {...props} icon={"trash-can"} />}
            right={(props) => (
              <List.Icon {...props} icon={"chevron-right"} />
            )}
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
