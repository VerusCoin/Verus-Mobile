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
import Styles from '../../styles/index'
import Colors from "../../globals/colors";
import { CommonActions } from '@react-navigation/native';
import { DLIGHT_PRIVATE, ELECTRUM, ETH, WYRE_SERVICE } from "../../utils/constants/intervalConstants";
import { Card, Paragraph, Title, Button } from 'react-native-paper'
import { deriveKeyPair, dlightSeedToBytes, isSeedPhrase } from "../../utils/keys";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import { coinsList } from "../../utils/CoinData/CoinsList";

class DisplaySeed extends Component {
  constructor() {
    super();
    this.state = {
      seeds: {},
      fromDeleteAccount: false,
      selectedSeedType: ELECTRUM,
      dualSameSeed: false,
      derivedKeys: {},
      toggleDerivedKey: {},
      fetchingDerivedKey: {},
      completeOnBack: false,
    };

    this.SEED_NAMES = {
      [DLIGHT_PRIVATE]: "Secondary (Z-Address)",
      [ELECTRUM]: "Primary",
      [ETH]: "Ethereum/ERC20",
      [WYRE_SERVICE]: "Wyre Account"
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
        seeds: {...data.seeds, [ETH]: data.seeds[ELECTRUM]},
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

    if (
      data &&
      data.completeOnBack
    ) {
      this.setState({
        completeOnBack: data.completeOnBack,
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

  toggleDerived = async (key, coinObj) => {
    if (!this.state.toggleDerivedKey[key]) {
      try {
        this.setState({ fetchingDerivedKey: { ...this.state.fetchingDerivedKey, [key]: true } });
        const derivedKey = await this.deriveKeyFromSeed(this.state.seeds[key], key, coinObj);
        this.setState({ 
          derivedKeys: { ...this.state.derivedKeys, [key]: derivedKey }, 
          fetchingDerivedKey: { ...this.state.fetchingDerivedKey, [key]: false },
          toggleDerivedKey: { ...this.state.toggleDerivedKey, [key]: true } 
        });
      } catch(e) {
        createAlert("Failed to fetch derived key", e.message);
        this.setState({ fetchingDerivedKey: { ...this.state.fetchingDerivedKey, [key]: false } });
      }
    } else {
      this.setState(prevState => ({
        toggleDerivedKey: {
          ...prevState.toggleDerivedKey,
          [key]: !prevState.toggleDerivedKey[key]
        }
      }));
    }
  }

  deriveKeyFromSeed = async (seed, key, coinObj) => {
    const { data } = this.props.route.params;

    switch (key) {
      case DLIGHT_PRIVATE:
        return Buffer.from(await dlightSeedToBytes(seed)).toString('hex');
      case ETH:
        return (await deriveKeyPair(
          seed,
          coinsList.ETH,
          key,
          data.keyDerivationVersion,
        )).privKey;
      case ELECTRUM:
        return (await deriveKeyPair(
          seed,
          coinObj,
          key,
          data.keyDerivationVersion,
        )).privKey;
      default:
        return seed
    }
  }

  render() {
    const { seeds, toggleDerivedKey, fetchingDerivedKey, derivedKeys, completeOnBack } = this.state;
    const { data } = this.props.route.params;

    return (
      <View style={Styles.defaultRoot}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
          }}
        >
          <View style={Styles.fullWidthFlexCenterBlock}>
          {Object.keys(seeds).map((key, index) => {
            const isToggleOn = toggleDerivedKey[key];
            const displayedValue = isToggleOn ? derivedKeys[key] : seeds[key];

            return seeds[key] == null ? null : (
              <View style={Styles.wideBlock} key={index}>
                <Card elevation={2}>
                  <Card.Content>
                    <Title>{this.SEED_NAMES[key]}</Title>
                    <Paragraph>{displayedValue}</Paragraph>
                    <View style={Styles.fullWidthFlexCenterBlock}>
                      <QRCode value={displayedValue} size={250} />
                    </View>
                    {data.showDerivedKeys && <>
                      {
                        ((key === DLIGHT_PRIVATE && isSeedPhrase(seeds[key])) ||
                          key === ETH ||
                          key === ELECTRUM) && (
                          <Button onPress={() => this.toggleDerived(key, coinsList.VRSC)}>
                            {fetchingDerivedKey[key]
                              ? 'Fetching...'
                              : isToggleOn
                                ? 'Show Seed'
                                : key === ELECTRUM
                                  ? 'Show Derived Key (VRSC)'
                                  : 'Show Derived Key'}
                          </Button>
                        )
                      }
                      {
                        !isToggleOn && !fetchingDerivedKey[key] && key === ELECTRUM && (
                          <Button onPress={() => this.toggleDerived(key, coinsList.BTC)}>
                            {'Show Derived Key (BTC)'}
                          </Button>
                        )
                      }
                    </>}
                  </Card.Content>
                </Card>
              </View>
            );
          })}
          </View>
        </ScrollView>
        <View style={Styles.highFooterContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button style={completeOnBack ? {
              flex: 1
            } : {}} textColor={completeOnBack ? Colors.primaryColor : Colors.warningButtonColor} onPress={this.back}>
              {completeOnBack ? "Done" : "Back"}
            </Button>
            {!completeOnBack && (
              <Button textColor={Colors.linkButtonColor} onPress={this.resetToScreen}>
                {this.state.fromDeleteAccount ? "CONTINUE" : "HOME"}
              </Button>
            )}
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