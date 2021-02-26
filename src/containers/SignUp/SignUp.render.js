import React from "react"
import { 
  View, 
  Text, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  TextInput as NativeTextInput,
  SafeAreaView
} from "react-native"
import { TextInput, Button, Checkbox, Portal } from 'react-native-paper'
import SetupSeedModal from '../../components/SetupSeedModal/SetupSeedModal'
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { DLIGHT_PRIVATE, ELECTRUM } from "../../utils/constants/intervalConstants"
import { ENABLE_DLIGHT } from '../../../env/main.json'
import { canEnableBiometry } from "../../actions/actions/channels/dlight/dispatchers/AlertManager"

export const SignUpRender = function() {
  return (
    <Portal.Host>
      <SafeAreaView style={[Styles.flex, Styles.backgroundColorWhite]}>
        <View style={Styles.headerContainerSafeArea}>
          <Text style={Styles.centralHeader}>Create New Profile</Text>
        </View>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={Styles.flexBackground}>
            <ScrollView
              contentContainerStyle={{
                ...Styles.centerContainer,
                ...Styles.innerHeaderFooterContainer,
              }}
            >
              <Portal>
                <SetupSeedModal
                  animationType="slide"
                  transparent={false}
                  visible={this.state.publicSeedModalOpen}
                  cancel={() => {
                    this.setState({ publicSeedModalOpen: false });
                  }}
                  setSeed={(seed, channel) => {
                    this.setState({
                      seeds: { ...this.state.seeds, [channel]: seed },
                    });
                  }}
                  channel={ELECTRUM}
                />
                <SetupSeedModal
                  animationType="slide"
                  transparent={false}
                  visible={this.state.privateSeedModalOpen}
                  cancel={() => {
                    this.setState({ privateSeedModalOpen: false });
                  }}
                  setSeed={(seed, channel) => {
                    this.setState({
                      seeds: { ...this.state.seeds, [channel]: seed },
                    });
                  }}
                  channel={DLIGHT_PRIVATE}
                />
              </Portal>
              <View style={Styles.wideBlock}>
                <TextInput
                  value={this.state.userName}
                  dense
                  onChangeText={(text) => this.setState({ userName: text })}
                  label="Profile Name"
                  underlineColor={Colors.primaryColor}
                  selectionColor={Colors.primaryColor}
                  render={(props) => (
                    <NativeTextInput
                      autoCapitalize={"none"}
                      autoCorrect={false}
                      {...props}
                    />
                  )}
                  error={this.state.errors.userName}
                />
              </View>
              <View style={Styles.wideBlock}>
                <Checkbox.Item
                  color={Colors.primaryColor}
                  label={
                    ENABLE_DLIGHT
                      ? "Setup Primary (T Address) Seed"
                      : "Setup Wallet Seed"
                  }
                  status={
                    this.state.seeds[ELECTRUM] != null ? "checked" : "unchecked"
                  }
                  onPress={() => this.setupSeed(ELECTRUM)}
                  mode="android"
                />
              </View>
              {ENABLE_DLIGHT && (
                <View style={Styles.wideBlock}>
                  <Checkbox.Item
                    color={Colors.primaryColor}
                    label={"Setup Secondary (Z Address) Seed"}
                    status={
                      this.state.seeds[DLIGHT_PRIVATE] != null
                        ? "checked"
                        : "unchecked"
                    }
                    onPress={() => this.setupSeed(DLIGHT_PRIVATE)}
                    mode="android"
                  />
                </View>
              )}
              <View style={Styles.fullWidthFlexCenterBlock}>
                <View style={Styles.wideBlock}>
                  <TextInput
                    value={this.state.pin}
                    dense
                    onChangeText={(text) => this.setState({ pin: text })}
                    label="Profile Password"
                    underlineColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    render={(props) => (
                      <NativeTextInput
                        autoCapitalize={"none"}
                        autoCorrect={false}
                        secureTextEntry={true}
                        {...props}
                      />
                    )}
                    error={this.state.errors.pin}
                  />
                </View>
                <View style={Styles.wideBlock}>
                  <TextInput
                    value={this.state.confirmPin}
                    dense
                    onChangeText={(text) => this.setState({ confirmPin: text })}
                    label="Confirm Profile Password"
                    underlineColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    render={(props) => (
                      <NativeTextInput
                        autoCapitalize={"none"}
                        autoCorrect={false}
                        secureTextEntry={true}
                        {...props}
                      />
                    )}
                    error={this.state.errors.confirmPin}
                  />
                </View>
              </View>
              {this.state.biometricAuth.biometry && (
                <View style={Styles.wideBlock}>
                  <Checkbox.Item
                    color={Colors.primaryColor}
                    label={"Enable biometric authentication"}
                    status={
                      this.state.enableBiometry
                        ? "checked"
                        : "unchecked"
                    }
                    onPress={async () => {
                      if (
                        !this.state.enableBiometry &&
                        (await canEnableBiometry())
                      ) {
                        this.setState({
                          enableBiometry: true,
                        });
                      } else this.setState({ enableBiometry: false });
                    }}
                    mode="android"
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
        <View style={Styles.footerContainerSafeArea}>
          <View
            style={
              this.hasAccount()
                ? Styles.standardWidthSpaceBetweenBlock
                : Styles.fullWidthFlexCenterBlock
            }
          >
            {this.hasAccount() && (
              <Button onPress={this.cancel} color={Colors.warningButtonColor}>
                {"Cancel"}
              </Button>
            )}
            <Button
              onPress={this._handleSubmit}
              color={Colors.successButtonColor}
            >
              {"Add Account"}
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Portal.Host>
  );
};
