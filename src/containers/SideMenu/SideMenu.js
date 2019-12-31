/*
  This component represents the drawer menu that pulls out from the
  side of the screen to display components.
*/

import React, { Component } from "react";
import { View, Text, ScrollView, FlatList, SectionList } from "react-native";
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
import { NavigationActions } from 'react-navigation';
import AlertAsync from "react-native-alert-async";
import styles from './SideMenu.styles';
import { ENABLE_WYRE } from '../../utils/constants';

const APP_INFO = 'App Info'
const PROFILE = 'Profile'
const WALLET = 'Wallet'

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

    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(sectionName))
    this.props.dispatch(setActiveSection(coinObj.apps[sectionName].data[index]))
    this.resetToScreen("CoinMenus", screen)
  }

  _removeCoin = (coinID) => {
    let data = {
      task: this._removeUserFromCoin,
      message: "Removing " + coinID + " from user " + this.props.activeAccount.id + ", please do not close Verus Mobile.",
      input: [coinID],
      route: "Home",
      dispatchResult: true
    }
    
    this.canRemoveCoin(coinID)
    .then(answer => {
      if (answer) {
        this.setState({ mainDrawer: true }, () => {
          this.resetToScreen("SecureLoading", null, data, true)
        })
      }
    })
  }

  _removeUserFromCoin = (coinID) => {
    return new Promise((resolve, reject) => {
      removeExistingCoin(coinID, this.props.activeCoinList, this.props.activeAccount.id)
      .then((res) => {
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
      resetAction = NavigationActions.reset({
        index: 0, // <-- currect active route from actions array
        actions: [
          NavigationActions.navigate({ routeName: route, params: {data: data} }),
        ],
      })
    } else {
      resetAction = NavigationActions.reset({
        index: 1, // <-- currect active route from actions array
        actions: [
          NavigationActions.navigate({ routeName: "Home" }),
          NavigationActions.navigate({ routeName: route, params: {title: title, data: data} }),
        ],
      })
    }
    
    this.props.navigation.dispatch(resetAction)
  }

  renderMainDrawerComponents = () => {
    return (
      <FlatList 
      style={styles.coinList}         
      data={this.props.activeCoinsForUser}    
      scrollEnabled={false}
      renderItem={({ item, index }) => ( 
        <ListItem              
          roundAvatar          
          title={item.id}                           
          avatar={item.logo}  
          containerStyle={{ borderBottomWidth: 0 }} 
          onPress={() => this.setState({ mainDrawer: false, currentCoinIndex: index })}
          titleStyle={{fontFamily: 'Avenir-Black', marginLeft: '15%'}}
        />          
      )}          
      keyExtractor={item => item.id}                            
      /> 
    )
  }

  renderChildDrawerComponents = () => {
    return (
      <ScrollView>
        <SectionList
        style={styles.coinList}
        renderItem={({item, index, section}) => (
          <ListItem                        
          title={item.name}    
          titleStyle={{fontFamily: 'Avenir-Black', textTransform: 'uppercase'}}     
          leftIcon={{name: item.icon, size: 30}}                        
          containerStyle={{ borderBottomWidth: 0 }} 
          onPress={() => {this._openCoin(this.props.activeCoinsForUser[this.state.currentCoinIndex], item.name, section)}}
        /> 
        )}
        renderSectionHeader={({section: {title}}) => (
          <ListItem                        
            title={<Text style={{fontFamily: 'Avenir-Black'}}>{title}</Text>}                             
            containerStyle={{ backgroundColor: "#E9F1F7", borderBottomWidth: 0 }} 
            hideChevron
            onPress={() => {return 0}}
          /> 
          )}
          sections={this.sectionExtractor(this.state.currentCoinIndex)}
          keyExtractor={(item, index) => item + index}
        />
        { ENABLE_WYRE &&
          <ListItem                        
            title={"BUY/SELL COIN"} 
            titleStyle={{fontFamily: 'Avenir-Black'}}     
            leftIcon={{name: "account-balance"}}   
            hideChevron                     
            containerStyle={{ borderBottomWidth: 0 }} 
            onPress={() => {
              let navigation = this.props.navigation  
              this.props.dispatch(setActiveSectionBuySellCrypto('buy-crypto'))
              navigation.navigate("BuySellCryptoMenus", {title: "Buy Crypto"});
            }}
          />
        }
        <ListItem                        
          title={"REMOVE COIN"}  
          titleStyle={{fontFamily: 'Avenir-Black'}}   
          leftIcon={{name: "close"}}   
          hideChevron                     
          containerStyle={{ borderBottomWidth: 0 }} 
          onPress={() => {this._removeCoin(this.props.activeCoinsForUser[this.state.currentCoinIndex].id)}}
        />
      </ScrollView>
    )
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
    return AlertAsync(
      'Confirm',
      "Are you sure you would like to remove " + coinID + "?",
      [
        {
          text: 'No',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
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
      style={styles.coinList}
      renderItem={({item, index, section}) => (
        <ListItem                        
        title={item}
        titleStyle={{fontFamily: 'Avenir-Black', fontSize: 15, textTransform: 'uppercase'}}  
        containerStyle={{ borderBottomWidth: 0 }} 
        onPress={
          item === 'Add coin from list' ? 
            () => this.navigateToScreen('AddCoin') 
          : 
            () => this._openCustomCoinMenus()}
        textInputStyle={{fontFamily: 'Avenir-Black'}}
        /> 
      )}
      renderSectionHeader={({section: {title}}) => (
        <ListItem                        
        title={<Text style={{fontFamily: 'Avenir-Black'}}>{title}</Text>}                             
        containerStyle={{ backgroundColor: "#E9F1F7", borderBottomWidth: 0 }} 
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
      style={styles.coinList}
      renderItem={({item, index, section}) => (
        <ListItem    
        leftIcon={{name: item.icon, size: 30}}  
        title={item.title}  
        titleStyle={{fontFamily: 'Avenir-Black', textTransform: 'uppercase'}}                  
        containerStyle={{ borderBottomWidth: 0 }} 
        onPress={() => this._openSettings(item)}
        /> 
      )}
      renderSectionHeader={({section: {title}}) => (
        <ListItem                        
        title={<Text style={{fontFamily: 'Avenir-Black'}}>{title}</Text>}                             
        containerStyle={{ backgroundColor: "#E9F1F7", borderBottomWidth: 0 }} 
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
        <ScrollView>
					<DrawerHeader navigateToScreen={this.navigateToScreen} />
          {this.renderMainDrawerComponents()}
          <ListItem    
          roundAvatar                    
          title={"ADD COIN"}   
          titleStyle={{fontFamily: 'Avenir-Black'}}                        
          avatar={require('../../images/customIcons/coinAdd.png')}
          containerStyle={{ borderBottomWidth: 0 }} 
          onPress={() => this.setState({ mainDrawer: false, currentCoinIndex: -1 })}
          titleStyle={{fontFamily: 'Avenir-Black', marginLeft: '15%'}}
          /> 
          <ListItem    
          roundAvatar                    
          title={"SETTINGS"}                           
          leftIcon={{name: 'settings', size: 34}}
          containerStyle={{ borderBottomWidth: 0 }} 
          onPress={() => this.setState({ mainDrawer: false, currentCoinIndex: -2 })}
          titleStyle={{fontFamily: 'Avenir-Black', marginLeft: '10%'}}
          />
          <ListItem    
          roundAvatar                    
          title={"LOG OUT"}
          leftIcon={{name: 'exit-to-app', size: 34}}
          containerStyle={{ borderBottomWidth: 0 }} 
          onPress={this.handleLogout}
          titleStyle={{fontFamily: 'Avenir-Black', marginLeft: '10%'}} 
          /> 
				</ScrollView>
      );
    } 

    return (
      <ScrollView>
        <View>
          <DrawerHeader navigateToScreen={this.navigateToScreen} />
            <ListItem                        
            title={<Text style={{fontFamily: 'Avenir-Black', paddingLeft: '5%', fontSize: 18}}>{"BACK"}</Text>}                             
            containerStyle={{ borderBottomWidth: 0 }} 
            hideChevron
            leftIcon={
              <Icon
							name="arrow-back"
							size={30}
							color="#666666"
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
      </ScrollView>
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
    balances: state.ledger.balances,
  }
};

export default connect(mapStateToProps)(SideMenu);
