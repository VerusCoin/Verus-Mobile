import React from 'react';
import {View, FlatList, SectionList, Switch, Text} from 'react-native';
import DrawerHeader from '../../components/DrawerHeader';
import {setActiveSectionBuySellCrypto} from '../../actions/actionCreators';
import Styles from '../../styles/index';
import {CoinLogos, getCoinLogo} from '../../utils/CoinData/CoinData';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import {Button, List} from 'react-native-paper';
import Colors from '../../globals/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';

export const renderSideMenu = function () {
  if (this.state.mainDrawer) {
    return (
      <View
        style={[
          Styles.flex,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : 'white',
          },
        ]}>
        <DrawerHeader navigateToScreen={this.navigateToScreen} />
        {renderMainDrawerComponents.call(this)}
      </View>
    );
  }

  return (
    <View
      style={[
        Styles.flex,
        {backgroundColor: this.props.darkMode ? Colors.darkModeColor : 'white'},
      ]}>
      <DrawerHeader navigateToScreen={this.navigateToScreen} />
      <List.Item
        titleStyle={{
          color: this.props.darkMode ? Colors.secondaryColor : 'black',
        }}
        title={'Back'}
        left={props => (
          <List.Icon
            color={this.props.darkMode ? Colors.secondaryColor : 'black'}
            icon="keyboard-backspace"
          />
        )}
        onPress={this.toggleMainDrawer}
      />
      {this.state.currentCoinIndex === -1
        ? renderAddCoinComponents.call(this)
        : this.state.currentCoinIndex === -2
        ? renderSettingsComponents.call(this)
        : renderChildDrawerComponents.call(this)}
    </View>
  );
};

export const renderChildDrawerComponents = function () {
  return (
    <SectionList
      style={Styles.fullWidth}
      renderItem={({item, index, section}) => (
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          title={item.name}
          left={() => (
            <List.Icon
              color={this.props.darkMode ? Colors.secondaryColor : 'black'}
              icon={item.icon}
            />
          )}
          onPress={() => {
            this._openApp(
              this.props.activeCoinsForUser[this.state.currentCoinIndex],
              item.name,
              section,
            );
          }}
        />
      )}
      renderSectionHeader={({section: {title}}) => (
        <List.Subheader
          style={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}>
          {title}
        </List.Subheader>
      )}
      ListFooterComponent={
        <React.Fragment>
          <List.Item
            titleStyle={{
              color: this.props.darkMode ? Colors.secondaryColor : 'black',
            }}
            title={'Remove Coin'}
            left={() => (
              <List.Icon
                color={this.props.darkMode ? Colors.secondaryColor : 'black'}
                icon="close"
              />
            )}
            onPress={() => {
              this._removeCoin(
                this.props.activeCoinsForUser[this.state.currentCoinIndex],
              );
            }}
          />
        </React.Fragment>
      }
      sections={this.sectionExtractor(this.state.currentCoinIndex)}
      keyExtractor={(item, index) => item + index}
    />
  );
};

export const renderSettingsComponents = function () {
  return (
    <SectionList
      style={Styles.fullWidth}
      renderItem={({item}) => (
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          left={() => (
            <List.Icon
              color={this.props.darkMode ? Colors.secondaryColor : 'black'}
              icon={item.icon}
            />
          )}
          title={item.title}
          onPress={() => this._openSettings(item)}
        />
      )}
      renderSectionHeader={({section: {title}}) => (
        <List.Subheader
          style={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}>
          {title}
        </List.Subheader>
      )}
      sections={[
        {
          title: 'Settings',
          data: [
            {title: this.PROFILE, icon: 'account-settings'},
            {title: this.WALLET, icon: 'credit-card-settings'},
            {title: this.APP_INFO, icon: 'information'},
          ],
        },
      ]}
      keyExtractor={(item, index) => item + index}
    />
  );
};

export const renderAddCoinComponents = function () {
  return (
    <SectionList
      style={Styles.fullWidth}
      renderItem={({item}) => (
        <List.Item
          title={item}
          onPress={() => this.navigateToScreen('AddCoin')}
        />
      )}
      renderSectionHeader={({section: {title}}) => (
        <List.Subheader>{title}</List.Subheader>
      )}
      sections={[
        {
          title: 'Manage Coins',
          data: ['Manage coins from list' /*, 'Add custom coin'*/],
        },
      ]}
      keyExtractor={(item, index) => item + index}
    />
  );
};

export const renderMainDrawerComponents = function () {
  console.log('active:', this.props.activeCoinsForUser)
  return (
    <View
      style={{
        flex: 1,
      }}>
      <FlatList
        data={this.props.activeCoinsForUser}
        style={[Styles.underflow, {}]}
        renderItem={({item, index}) => {
          const Logo = getCoinLogo(item.id, item.proto, 'dark');

          return (
            <List.Item
              titleStyle={{
                color: this.props.darkMode ? Colors.secondaryColor : 'black',
              }}
              title={item.display_ticker}
              left={() =>
                Logo ? (
                  <View style={{paddingLeft: 8, paddingRight: 8}}>
                    {RenderSquareCoinLogo(item.id)}
                  </View>
                ) : null
              }
              right={props => (
                <List.Icon
                  {...props}
                  color={this.props.darkMode ? Colors.secondaryColor : 'black'}
                  icon="chevron-right"
                />
              )}
              onPress={() =>
                this.setState({
                  mainDrawer: false,
                  currentCoinIndex: index,
                })
              }
            />
          );
        }}
        ListFooterComponent={
          <React.Fragment>
            <View>
              <List.Item
                titleStyle={{
                  color: this.props.darkMode ? Colors.secondaryColor : 'black',
                }}
                title="Manage Coins"
                left={() => (
                  <List.Icon
                    color={
                      this.props.darkMode ? Colors.secondaryColor : 'black'
                    }
                    icon="format-list-bulleted"
                  />
                )}
                onPress={() => this.navigateToScreen('AddCoin')}
              />
              <List.Item
                titleStyle={{
                  color: this.props.darkMode ? Colors.secondaryColor : 'black',
                }}
                title={'Settings'}
                left={() => (
                  <List.Icon
                    color={
                      this.props.darkMode ? Colors.secondaryColor : 'black'
                    }
                    icon="cog"
                  />
                )}
                onPress={() =>
                  this.setState({mainDrawer: false, currentCoinIndex: -2})
                }
              />
              <List.Item
                titleStyle={{
                  color: this.props.darkMode ? Colors.secondaryColor : 'black',
                }}
                title={'Log Out'}
                left={() => (
                  <List.Icon
                    color={
                      this.props.darkMode ? Colors.secondaryColor : 'black'
                    }
                    icon="exit-to-app"
                  />
                )}
                onPress={this.handleLogout}
              />
            </View>
          </React.Fragment>
        }
        keyExtractor={item => item.id}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingBottom: 10,
        }}>
        {this.props.darkMode ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Button
              onPress={this._handleDarkModeToggle}
              // style={{:'white'}}
            >
              <Icon2 name="white-balance-sunny" size={24} color="white" />
            </Button>

            <Text
              style={{
                color: this.props.darkMode ? Colors.secondaryColor : 'black',
                fontSize: 15,
              }}>
              Light Mode
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Button onPress={this._handleDarkModeToggle}>
              <Icon name="moon-o" size={24} color="black" />
            </Button>

            <Text
              style={{
                color: this.props.darkMode ? Colors.secondaryColor : 'black',
                fontSize: 15,
              }}>
              Dark Mode
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
