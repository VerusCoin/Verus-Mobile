/*
  This component's purpose is to display the user seeds in 
  plaintext upon authorization. It uses the users password 
  to decrypt it from their userData stored in AsyncStorage.
*/

import React, { Component } from "react";
import { 
  View, 
  ScrollView, 
} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Styles from '../../../../styles/index'
import Colors from "../../../../globals/colors";
import { CommonActions } from '@react-navigation/native';
import { DLIGHT_PRIVATE, ELECTRUM } from "../../../../utils/constants/intervalConstants";
import { Card, Paragraph, Title, Button } from 'react-native-paper'

class DisplaySeed extends Component {
  constructor() {
    super();
    this.state = {
      seeds: {},
      fromDeleteAccount: false,
      selectedSeedType: ELECTRUM,
      dualSameSeed: false,
    };

    this.SEED_NAMES = {
      [DLIGHT_PRIVATE]: "Secondary (Z-Address) Seed",
      [ELECTRUM]: "Primary Seed"
    }
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

    this.props.navigation.closeDrawer();
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
    const { seeds } = this.state;

    return (
      <View style={Styles.defaultRoot}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
          }}
        >
          <View style={Styles.fullWidthFlexCenterBlock}>
            {Object.keys(seeds).map((key) => {
              return seeds[key] == null ? null : (
                <View style={Styles.wideBlock}>
                  <Card elevation={2}>
                    <Card.Content>
                      <Title>{this.SEED_NAMES[key]}</Title>
                      <Paragraph>{seeds[key]}</Paragraph>
                      <View style={Styles.fullWidthFlexCenterBlock}>
                        <QRCode value={seeds[key]} size={250} />
                      </View>
                    </Card.Content>
                  </Card>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button color={Colors.warningButtonColor} onPress={this.back}>
              {"Back"}
            </Button>
            <Button
              color={Colors.linkButtonColor}
              onPress={this.resetToScreen}
            >
              {this.state.fromDeleteAccount ? "CONTINUE" : "HOME"}
            </Button>
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

export default connect(mapStateToProps)(DisplaySeed);