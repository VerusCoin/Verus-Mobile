/*
  This component represents the drawer menu that pulls out from the
  side of the screen to display components.
*/

import React, { Component } from "react";
import { View, Text, FlatList, SectionList } from "react-native";
import { Icon, ListItem } from "react-native-elements";
import PropTypes from 'prop-types';
import DrawerHeader from '../../components/DrawerHeader';
import { connect } from 'react-redux';
import { 
  setActiveCoin, 
  setActiveApp, 
  setActiveSection, 
  signOut,
  setConfigSection,
  removeExistingCoin,
  setUserCoins,
  setActiveSectionCustomCoins,
  setActiveSectionBuySellCrypto,
 } from '../../actions/actionCreators'
import { getKeyByValue } from '../../utils/objectManip'
import { CommonActions } from '@react-navigation/native';
import AlertAsync from "react-native-alert-async";
import Styles from '../../styles/index'
import { clearAllCoinIntervals } from "../../actions/actionDispatchers";

const APP_INFO = 'App Info'
const PROFILE = 'Profile'
const WALLET = 'Wallet'
const CANCEL = 0
const REMOVE = 1
const REMOVE_DELETE = 2

class SideMenu extends Component {
  constructor(props) {
    super(props)
    this.state = {          
      error: null,   
      mainDrawer: true, 
      currentCoinIndex: null,
    };
  }

  navigateToScreen = (route) => {
    let navigation = this.props.navigation

    navigation.navigate(route);
  }

  _openWallet = (coinID) => {  
    let navigation = this.props.navigation  
    navigation.navigate("Wallet", { 
      coin: coinID
    });
  };

  _openApp = (coinObj, screen, section) => {
    if (section.title === "Identity App") {
      let navigation = this.props.navigation;
      navigation.navigate("Identity", { selectedScreen: screen } );
    } else {
      this._openCoin(coinObj, screen, section)
    }
  }

  _openCoin = (coinObj, screen, section) => {
    let sectionName = getKeyByValue(section, coinObj.apps)
    let index = 0;
    
    while (
      index < coinObj.apps[sectionName].data.length && 
      coinObj.apps[sectionName].data[index].name !== screen) {
       index++;     
    }

    if (index >= coinObj.apps[sectionName].data.length) {
      throw new Error("Array out of bounds error at _openCoin in SideMenu.js")
    }

    this.props.navigation.closeDrawer();
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(sectionName))
    this.props.dispatch(setActiveSection(coinObj.apps[sectionName].data[index]))
    this.resetToScreen("CoinMenus", screen)
  }

  _removeCoin = (coinID) => {
    this.canRemoveCoin(coinID)
    .then(answer => {
      let data = {
        task: this._removeUserFromCoin,
        message: "Removing " + coinID + " from user " + this.props.activeAccount.id + ", please do not close Verus Mobile.",
        input: [coinID, answer === REMOVE_DELETE],
        route: "Home",
        dispatchResult: true
      }

      if (answer === REMOVE_DELETE || answer === REMOVE) {
        this.setState({ mainDrawer: true }, () => {
          this.resetToScreen("SecureLoading", null, data, true)
        })
      }
    })
  }

  _removeUserFromCoin = (coinID, deleteWallet) => {
    return new Promise((resolve, reject) => {
      removeExistingCoin(coinID, this.props.activeCoinList, this.props.activeAccount.id, this.props.dlightSockets[coinID], deleteWallet)
      .then((res) => {
        clearAllCoinIntervals(coinID)
        this.props.dispatch(res)
        resolve(setUserCoins(this.props.activeCoinList, this.props.activeAccount.id))
      })
      .catch(err => {
        console.warn(err)
        reject(err)
      })
    })
  }

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [
          { name: route, params: { data: data } },
        ],
      })
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          { name: "Home" },
          { name: route, params: { title: title, data: data } },
        ],
      })
    }
    
    this.props.navigation.dispatch(resetAction)
  }

  renderMainDrawerComponents = () => {
    return (
      <FlatList
        data={this.props.activeCoinsForUser}
        style={Styles.underflow}
        renderItem={({ item, index }) => (
          <ListItem
            title={item.id}
            leftAvatar={{
              source: item.logo,
            }}
            containerStyle={Styles.bottomlessListItemContainer}
            onPress={() =>
              this.setState({ mainDrawer: false, currentCoinIndex: index })
            }
            titleStyle={Styles.listItemLeftTitleUppercase}
          />
        )}
        ListFooterComponent={
          <React.Fragment>
            <ListItem
              title="ADD COIN"
              leftAvatar={{
                source: require("../../images/customIcons/coinAdd.png"),
              }}
              containerStyle={Styles.bottomlessListItemContainer}
              onPress={() =>
                this.setState({ mainDrawer: false, currentCoinIndex: -1 })
              }
              titleStyle={Styles.listItemLeftTitleUppercase}
            />
            <ListItem
              title={"SETTINGS"}
              leftIcon={{ name: "settings", size: 34 }}
              containerStyle={Styles.bottomlessListItemContainer}
              onPress={() =>
                this.setState({ mainDrawer: false, currentCoinIndex: -2 })
              }
              titleStyle={Styles.listItemLeftTitlePaddedUppercase}
            />
            <ListItem
              title={"LOG OUT"}
              leftIcon={{ name: "exit-to-app", size: 34 }}
              containerStyle={Styles.bottomlessListItemContainer}
              onPress={this.handleLogout}
              titleStyle={Styles.listItemLeftTitlePaddedUppercase}
            />
          </React.Fragment>
        }
        keyExtractor={(item) => item.id}
      />
    );
  }

  renderChildDrawerComponents = () => {
    return (
      <SectionList
        style={Styles.fullWidth}
        renderItem={({ item, index, section }) => (
          <ListItem
            title={item.name}
            titleStyle={Styles.listItemLeftTitleUppercase}
            leftIcon={{ name: item.icon, size: 30 }}
            containerStyle={Styles.bottomlessListItemContainer}
            onPress={() => {
              this._openApp(
                this.props.activeCoinsForUser[this.state.currentCoinIndex],
                item.name,
                section,
              );
            }}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <ListItem
            title={
              <Text style={Styles.infoText}>{title}</Text>
            }
            containerStyle={Styles.greyStripeContainer}
            hideChevron
            onPress={() => {
              return 0;
            }}
          />
        )}
        ListFooterComponent={
          <React.Fragment>
            {global.ENABLE_FIAT_GATEWAY && (
              <ListItem
                title={"BUY/SELL COIN"}
                titleStyle={Styles.infoText}
                leftIcon={{ name: "account-balance" }}
                hideChevron
                containerStyle={Styles.bottomlessListItemContainer}
                onPress={() => {
                  let navigation = this.props.navigation;
                  this.props.dispatch(
                    setActiveSectionBuySellCrypto("buy-crypto")
                  );
                  navigation.navigate("BuySellCryptoMenus", {
                    title: "Buy Crypto",
                  });
                }}
              />
            )}
            <ListItem
              title={"REMOVE COIN"}
              titleStyle={Styles.listItemLeftTitlePaddedUppercase}
              leftIcon={{ name: "close" }}
              hideChevron
              containerStyle={Styles.bottomlessListItemContainer}
              onPress={() => {
                this._removeCoin(
                  this.props.activeCoinsForUser[this.state.currentCoinIndex]
                    .id
                );
              }}
            />
          </React.Fragment>
        }
        sections={this.sectionExtractor(this.state.currentCoinIndex)}
        keyExtractor={(item, index) => item + index}
      />
    );
  }

  sectionExtractor = (currentCoinIndex) => {
    let sections = []
    let coinApps = this.props.activeCoinsForUser[currentCoinIndex].apps
    for (let key in coinApps) {
      sections.push(coinApps[key])
    }

    return sections
  }

  canRemoveCoin = (coinID) => {
    if (this.props.dlightSockets[coinID]) {
      return AlertAsync(
        'Confirm',
        "Would you like to remove " + coinID + " and delete all its blockchain data?",
        [
          {
            text: 'Cancel',
            onPress: () => Promise.resolve(CANCEL),
            style: 'cancel',
          },
          {text: 'Remove', onPress: () => Promise.resolve(REMOVE)},
          {text: 'Remove & Delete', onPress: () => Promise.resolve(REMOVE_DELETE)},
        ],
        {
          cancelable: false,
        },
      )
    } else {
      return AlertAsync(
        'Confirm',
        "Are you sure you would like to remove " + coinID + "?",
        [
          {
            text: 'No',
            onPress: () => Promise.resolve(CANCEL),
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => Promise.resolve(REMOVE)},
        ],
        {
          cancelable: false,
        },
      )
    }
    
  }

  handleLogout = () => {
    this.props.dispatch(signOut())
  }

  _openSettings = (drawerItem) => {
    let navigation = this.props.navigation
    if (drawerItem.title === APP_INFO) {
      this.props.dispatch(setConfigSection('settings-info'))
    } else if (drawerItem.title === PROFILE){
      this.props.dispatch(setConfigSection('settings-profile'))
    } else if (drawerItem.title === WALLET){
      this.props.dispatch(setConfigSection('settings-wallet'))
    } else {
      throw new Error("Option " + drawerItem.title + " not found in possible settings values")
    }

    navigation.navigate("SettingsMenus", { title: drawerItem.title })
  }

  _openCustomCoinMenus = () => {
    let navigation = this.props.navigation
    this.props.dispatch(setActiveSectionCustomCoins('custom-coin-qr'))

    //TODO: Change this when coin adding is refactored
    navigation.navigate("CustomChainMenus", { title: "Scan QR" })
  }

  renderAddCoinComponents = () => {
    return (
      <SectionList
      style={Styles.fullWidth}
      renderItem={({item}) => (
        <ListItem                        
        title={item}
        titleStyle={Styles.listItemLeftTitleUppercase}  
        containerStyle={Styles.bottomlessListItemContainer} 
        onPress={
          item === 'Add coin from list' ? 
            () => this.navigateToScreen('AddCoin') 
          : 
            () => this._openCustomCoinMenus()}
        /> 
      )}
      renderSectionHeader={({section: {title}}) => (
        <ListItem                        
        title={<Text style={Styles.infoText}>{title}</Text>}                             
        containerStyle={Styles.greyStripeContainer} 
        hideChevron
        /> 
      )}
      sections={[
        {title: 'Add Coin', data: ['Add coin from list', 'Add custom coin']},
      ]}
      keyExtractor={(item, index) => item + index}
      />
    )
  }

  renderSettingsComponents = () => {
    return (
      <SectionList
      style={Styles.fullWidth}
      renderItem={({item}) => (
        <ListItem    
        leftIcon={{name: item.icon, size: 30}}  
        title={item.title}  
        titleStyle={Styles.listItemLeftTitleUppercase}                  
        containerStyle={Styles.bottomlessListItemContainer} 
        onPress={() => this._openSettings(item)}
        /> 
      )}
      renderSectionHeader={({section: {title}}) => (
        <ListItem                        
        title={<Text style={Styles.infoText}>{title}</Text>}                             
        containerStyle={Styles.greyStripeContainer} 
        hideChevron
        /> 
      )}
      sections={[
        {title: 'Settings', 
        data: [
          {title: PROFILE, icon: "account-circle"},
          {title: WALLET, icon: "account-balance-wallet"},
          {title: APP_INFO, icon: "info"}
        ]},
      ]}
      keyExtractor={(item, index) => item + index}
      />
    )
  }

  toggleMainDrawer = () =>
		this.setState(prevState => ({ mainDrawer: !prevState.mainDrawer }));

  render() {
    if (this.state.mainDrawer) {
      return (
        <View style={Styles.flex}>
					<DrawerHeader navigateToScreen={this.navigateToScreen} />
          {this.renderMainDrawerComponents()}
				</View>
      );
    } 

    return (
      <View style={Styles.flex}>
        <DrawerHeader navigateToScreen={this.navigateToScreen} />
        <ListItem                        
        title={<Text style={Styles.listItemLeftTitleUppercase}>{"BACK"}</Text>}                             
        containerStyle={Styles.bottomlessListItemContainer} 
        hideChevron
        leftIcon={
          <Icon
          name="arrow-back"
          size={30}
          />
        }
        onPress={this.toggleMainDrawer}
        /> 
        {this.state.currentCoinIndex === -1 ? 
          this.renderAddCoinComponents() 
          : 
          this.state.currentCoinIndex === -2 ? 
            this.renderSettingsComponents()
            :
            this.renderChildDrawerComponents()}
      </View>
    );
  }
}

SideMenu.propTypes = {
  navigation: PropTypes.object
};

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    dlightSockets: state.coins.dlightSockets
  }
};

export default connect(mapStateToProps)(SideMenu);
