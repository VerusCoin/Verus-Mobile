/*
  This component is simply to display the app version data and 
  mobile platform to the user. It is more for debugging or support purposes,
  and any general, non-sensitive, useful information that would help a dev
  help a user should go here.
*/

import React, {Component} from 'react';
import {
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
  SafeAreaView,
} from 'react-native';
import {List, DataTable, Divider, Text} from 'react-native-paper';
import Styles from '../../../styles/index';
import {APP_VERSION} from '../../../../env/index';
import {CoinLogos} from '../../../utils/CoinData/CoinData';
import {openUrl} from '../../../utils/linking';
import {connect} from 'react-redux';
import Colors from '../../../globals/colors';

const DISCORD_URL = 'https://discord.gg/VRKMP2S';
const REDDIT_URL = 'https://www.reddit.com/r/VerusCoin/';
const TWITTER_URL = 'https://twitter.com/VerusCoin';
const PRIVACY_URL =
  'https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt';
const LICENCE_URL =
  'https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE';

class AppInfo extends Component {
  render() {
    return (
      <SafeAreaView
        style={[
          Styles.defaultRoot,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          },
        ]}>
        <ScrollView style={Styles.fullWidth}>
          <List.Subheader
            style={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.verusDarkGray,
            }}>
            {'Information'}
          </List.Subheader>
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <List.Item
            titleStyle={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.quaternaryColor,
            }}
            title={'App Version'}
            right={() => (
              <Text
                style={[
                  Styles.listItemTableCell,
                  {
                    color: this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.quaternaryColor,
                  },
                ]}>
                {APP_VERSION}
              </Text>
            )}
          />
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <List.Item
            titleStyle={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.quaternaryColor,
            }}
            title={'Platform'}
            right={() => (
              <Text
                style={[
                  Styles.listItemTableCell,
                  {
                    color: this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.quaternaryColor,
                  },
                ]}>
                {Platform.OS}
              </Text>
            )}
          />
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <List.Item
            titleStyle={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.quaternaryColor,
            }}
            title={'Platform Version'}
            right={() => (
              <Text
                style={[
                  Styles.listItemTableCell,
                  {
                    color: this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.quaternaryColor,
                  },
                ]}>
                {Platform.Version}
              </Text>
            )}
          />
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <List.Subheader
            style={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.verusDarkGray,
            }}>
            {'Documentation'}
          </List.Subheader>
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <TouchableOpacity onPress={() => openUrl(PRIVACY_URL)}>
            <List.Item
              titleStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.quaternaryColor,
              }}
              descriptionStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.verusDarkGray,
              }}
              title={'Privacy'}
              description={'How Verus Mobile handles privacy'}
              right={props => (
                <List.Icon
                  {...props}
                  color={
                    this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.verusDarkGray
                  }
                  icon={'open-in-new'}
                  size={20}
                />
              )}
            />
            <Divider
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(LICENCE_URL)}>
            <List.Item
              titleStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.quaternaryColor,
              }}
              descriptionStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.verusDarkGray,
              }}
              title={'Licence'}
              description={'How Verus Mobile is licensed'}
              right={props => (
                <List.Icon
                  {...props}
                  color={
                    this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.verusDarkGray
                  }
                  icon={'open-in-new'}
                  size={20}
                />
              )}
            />
            <Divider
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
              }}
            />
          </TouchableOpacity>
          <List.Subheader
            style={{
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.verusDarkGray,
            }}>
            {'Community & News'}
          </List.Subheader>
          <Divider
            style={{
              backgroundColor: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.ultraLightGrey,
            }}
          />
          <TouchableOpacity onPress={() => openUrl(DISCORD_URL)}>
            <List.Item
              titleStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.quaternaryColor,
              }}
              descriptionStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.verusDarkGray,
              }}
              title={'Discord'}
              description={'The Verus community Discord'}
              right={props => (
                <List.Icon
                  {...props}
                  color={
                    this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.verusDarkGray
                  }
                  icon={'open-in-new'}
                  size={20}
                />
              )}
            />
            <Divider />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(REDDIT_URL)}>
            <List.Item
              title={'Reddit'}
              titleStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.quaternaryColor,
              }}
              descriptionStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.verusDarkGray,
              }}
              description={'The Verus subreddit'}
              right={props => (
                <List.Icon
                  {...props}
                  color={
                    this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.verusDarkGray
                  }
                  icon={'open-in-new'}
                  size={20}
                />
              )}
            />
            <Divider
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(TWITTER_URL)}>
            <List.Item
              titleStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.quaternaryColor,
              }}
              descriptionStyle={{
                color: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.verusDarkGray,
              }}
              title={'Twitter'}
              description={'The Verus Coin Foundation Twitter account'}
              right={props => (
                <List.Icon
                  {...props}
                  color={
                    this.props.darkMode
                      ? Colors.secondaryColor
                      : Colors.verusDarkGray
                  }
                  icon={'open-in-new'}
                  size={20}
                />
              )}
            />
            <Divider
              style={{
                backgroundColor: this.props.darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
              }}
            />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const mapStateToProps = state => {
  return {
    darkMode: state.settings.darkModeState,
  };
};

export default connect(mapStateToProps)(AppInfo);
