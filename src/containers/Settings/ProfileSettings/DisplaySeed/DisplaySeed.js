/*
  This component's purpose is to display the user seeds in 
  plaintext upon authorization. It uses the users password 
  to decrypt it from their userData stored in AsyncStorage.
*/

import React, { Component } from "react";
import StandardButton from "../../../../components/StandardButton";
import { 
  View, 
  ScrollView, 
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { Input } from 'react-native-elements'
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Styles from '../../../../styles/index'
import Colors from "../../../../globals/colors";
import { ELECTRUM } from "../../../../utils/constants/intervalConstants";
import { Dropdown } from "react-native-material-dropdown";

class ResetPwd extends Component {
  constructor() {
    super();
    this.state = {
      seeds: {},
      fromDeleteAccount: false,
      selectedSeedType: ELECTRUM,
      dualSameSeed: false,
    };
  }

  componentDidMount() {
    const { data } = this.props.route.params
    if (
      data &&
      data.seeds
    ) {
      const seedsArray = Object.values(data.seeds)

      this.setState({ 
        seeds: data.seeds,
        dualSameSeed: seedsArray.every(s => seedsArray.length > 1 && s === seedsArray[0])
      });
    }

    if (
      data &&
      data.fromDeleteAccount
    ) {
      this.setState({
        fromDeleteAccount: data
          .fromDeleteAccount,
      });
    }
  }

  resetToScreen = () => {
    route = this.state.fromDeleteAccount ? "DeleteProfile" : "Home";

    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [{ name: route }],
    });

    this.props.navigation.dispatch(resetAction);
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    this.setState({ errors: _errors });
  };

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  render() {
    const { seeds, selectedSeedType, dualSameSeed } = this.state;

    return (
      <View style={Styles.defaultRoot}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
            ...Styles.fullHeight,
          }}
        >
          <View style={Styles.wideBlock}>
            <Dropdown
              valueExtractor={(item) =>
                Object.keys(seeds).find((seedType) => seeds[seedType] == item)
              }
              data={Object.values(seeds)}
              onChangeText={(value) =>
                this.setState({ selectedSeedType: value })
              }
              disabled={dualSameSeed}
              renderBase={() => (
                <Input
                  label={`${
                    dualSameSeed
                      ? "Primary & Secondary"
                      : selectedSeedType === ELECTRUM
                      ? "Primary"
                      : "Secondary"
                  } seed:`}
                  labelStyle={Styles.formCenterLabel}
                  value={seeds[selectedSeedType]}
                  inputStyle={Styles.seedText}
                  multiline={true}
                />
              )}
              renderAccessory={dualSameSeed ? () => null : undefined}
            />
          </View>
          {seeds && seeds[selectedSeedType] && (
            <View
              style={Styles.fullWidthAlignCenterRowBlock}
            >
              <QRCode value={seeds[selectedSeedType]} size={250} />
            </View>
          )}
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <StandardButton
              color={Colors.warningButtonColor}
              title="BACK"
              onPress={this.back}
            />
            <StandardButton
              color={Colors.linkButtonColor}
              title={this.state.fromDeleteAccount ? "CONTINUE" : "HOME"}
              onPress={this.resetToScreen}
            />
          </View>
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ResetPwd);