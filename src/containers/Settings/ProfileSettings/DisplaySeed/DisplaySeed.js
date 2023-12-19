/*
  This component's purpose is to display the user seeds in 
  plaintext upon authorization. It uses the users password 
  to decrypt it from their userData stored in AsyncStorage.
*/

import React, {Component} from 'react';
import {View, ScrollView} from 'react-native';
import {NavigationActions} from '@react-navigation/compat';
import {connect} from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Styles from '../../../../styles/index';
import Colors from '../../../../globals/colors';
import {CommonActions} from '@react-navigation/native';
import {
  DLIGHT_PRIVATE,
  ELECTRUM,
  ETH,
  WYRE_SERVICE,
} from '../../../../utils/constants/intervalConstants';
import {Card, Paragraph, Title, Button} from 'react-native-paper';
import {
  deriveKeyPair,
  dlightSeedToBytes,
  isSeedPhrase,
} from '../../../../utils/keys';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {coinsList} from '../../../../utils/CoinData/CoinsList';

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
    };

    this.SEED_NAMES = {
      [DLIGHT_PRIVATE]: 'Secondary (Z-Address)',
      [ELECTRUM]: 'Primary',
      [ETH]: 'Ethereum/ERC20',
      [WYRE_SERVICE]: 'Wyre Account',
    };
  }

  componentDidMount() {
    const {data} = this.props.route.params;
    if (data && data.seeds) {
      const seedsArray = Object.values(data.seeds);

      this.setState({
        seeds: {...data.seeds, [ETH]: data.seeds[ELECTRUM]},
        dualSameSeed: seedsArray.every(
          s => seedsArray.length > 1 && s === seedsArray[0],
        ),
      });
    }

    if (data && data.fromDeleteAccount) {
      this.setState({
        fromDeleteAccount: data.fromDeleteAccount,
      });
    }
  }

  resetToScreen = () => {
    route = this.state.fromDeleteAccount ? 'DeleteProfile' : 'Home';

    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [{name: route}],
    });

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    this.setState({errors: _errors});
  };

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  toggleDerived = async key => {
    if (!this.state.derivedKeys[key]) {
      try {
        this.setState({
          fetchingDerivedKey: {...this.state.fetchingDerivedKey, [key]: true},
        });
        const derivedKey = await this.deriveKeyFromSeed(
          this.state.seeds[key],
          key,
        );
        this.setState({
          derivedKeys: {...this.state.derivedKeys, [key]: derivedKey},
          fetchingDerivedKey: {...this.state.fetchingDerivedKey, [key]: false},
          toggleDerivedKey: {...this.state.toggleDerivedKey, [key]: true},
        });
      } catch (e) {
        createAlert('Failed to fetch derived key', e.message);
        this.setState({
          fetchingDerivedKey: {...this.state.fetchingDerivedKey, [key]: false},
        });
      }
    } else {
      this.setState(prevState => ({
        toggleDerivedKey: {
          ...prevState.toggleDerivedKey,
          [key]: !prevState.toggleDerivedKey[key],
        },
      }));
    }
  };

  // Method to derive the key from seed. Replace this with your actual implementation
  deriveKeyFromSeed = async (seed, key) => {
    switch (key) {
      case DLIGHT_PRIVATE:
        return Buffer.from(await dlightSeedToBytes(seed)).toString('hex');
      case ETH:
        return (
          await deriveKeyPair(
            seed,
            coinsList.ETH,
            key,
            this.props.activeAccount.keyDerivationVersion,
          )
        ).privKey;
      default:
        return seed;
    }
  };

  render() {
    const {seeds, toggleDerivedKey, fetchingDerivedKey, derivedKeys} =
      this.state;

    return (
      <View
        style={[
          Styles.defaultRoot,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          },
        ]}>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={{
            ...Styles.innerHeaderFooterContainerCentered,
          }}>
          <View
            style={[
              Styles.fullWidthFlexCenterBlock,
              {
                backgroundColor: this.props.darkMode
                  ? Colors.darkModeColor
                  : Colors.secondaryColor,
              },
            ]}>
            {Object.keys(seeds).map((key, index) => {
              const isToggleOn = toggleDerivedKey[key];
              const displayedValue = isToggleOn ? derivedKeys[key] : seeds[key];

              return seeds[key] == null ? null : (
                <View
                  style={[
                    Styles.wideBlock,
                    {
                      backgroundColor: this.props.darkMode
                        ? Colors.darkModeColor
                        : Colors.secondaryColor,
                    },
                  ]}
                  key={index}>
                  <Card
                    style={{
                      backgroundColor: this.props.darkMode
                        ? Colors.darkModeColor
                        : Colors.secondaryColor,
                    }}
                    elevation={2}>
                    <Card.Content>
                      <Title
                        style={{
                          color: this.props.darkMode
                            ? Colors.secondaryColor
                            : Colors.quinaryColor,
                        }}>
                        {this.SEED_NAMES[key]}
                      </Title>
                      <Paragraph
                        style={{
                          color: this.props.darkMode
                            ? Colors.secondaryColor
                            : Colors.quinaryColor,
                        }}>
                        {displayedValue}
                      </Paragraph>
                      <View style={Styles.fullWidthFlexCenterBlock}>
                        <QRCode value={displayedValue} size={250} />
                      </View>

                      {((key === DLIGHT_PRIVATE && isSeedPhrase(seeds[key])) ||
                        key === ETH) && (
                        <Button onPress={() => this.toggleDerived(key)}>
                          {fetchingDerivedKey[key]
                            ? 'Fetching...'
                            : isToggleOn
                            ? 'Show Seed'
                            : 'Show Derived Key'}
                        </Button>
                      )}
                    </Card.Content>
                  </Card>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View
          style={[
            Styles.highFooterContainer,
            {
              backgroundColor: this.props.darkMode
                ? Colors.darkModeColor
                : Colors.secondaryColor,
            },
          ]}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <Button color={Colors.warningButtonColor} onPress={this.back}>
              {'Back'}
            </Button>
            <Button color={Colors.linkButtonColor} onPress={this.resetToScreen}>
              {this.state.fromDeleteAccount ? 'CONTINUE' : 'HOME'}
            </Button>
          </View>
        </View>
      </View>
    );
  }
}

const mapStateToProps = state => {
  return {
    activeAccount: state.authentication.activeAccount,
    darkMode: state.settings.darkModeState,
  };
};

export default connect(mapStateToProps)(DisplaySeed);
