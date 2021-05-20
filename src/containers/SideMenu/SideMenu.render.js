import React from "react";
import { View, FlatList, SectionList } from "react-native";
import DrawerHeader from '../../components/DrawerHeader';
import { 
  setActiveSectionBuySellCrypto,
 } from '../../actions/actionCreators'
import Styles from '../../styles/index'
import { ENABLE_FIAT_GATEWAY } from '../../../env/main.json'
import { CoinLogos } from "../../utils/CoinData/CoinData";
import { RenderSquareCoinLogo } from "../../utils/CoinData/Graphics";
import { List } from "react-native-paper";

export const renderSideMenu = function() {
  if (this.state.mainDrawer) {
    return (
      <View style={Styles.flex}>
        <DrawerHeader navigateToScreen={this.navigateToScreen} />
        {renderMainDrawerComponents.call(this)}
      </View>
    );
  } 

  return (
    <View style={Styles.flex}>
      <DrawerHeader navigateToScreen={this.navigateToScreen} />
      <List.Item                        
      title={"Back"}                             
      left={(props) => <List.Icon icon="keyboard-backspace"/>}
      onPress={this.toggleMainDrawer}
      /> 
      {this.state.currentCoinIndex === -1 ? 
        renderAddCoinComponents.call(this)
        : 
        this.state.currentCoinIndex === -2 ? 
          renderSettingsComponents.call(this)
          :
          renderChildDrawerComponents.call(this)}
    </View>
  );
}

export const renderChildDrawerComponents = function() {
  return (
    <SectionList
      style={Styles.fullWidth}
      renderItem={({ item, index, section }) => (
        <List.Item
          title={item.name}
          left={() => <List.Icon icon={item.icon}/>}
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
        <List.Subheader>{title}</List.Subheader>
      )}
      ListFooterComponent={
        <React.Fragment>
          {ENABLE_FIAT_GATEWAY && (
            <List.Item
              title={"BUY/SELL COIN"}
              titleStyle={Styles.infoText}
              left={() => <List.Icon icon="account-balance"/>}
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
          <List.Item
            title={"Remove Coin"}
            left={() => <List.Icon icon="close"/>}
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

export const renderSettingsComponents = function() {
  return (
    <SectionList
      style={Styles.fullWidth}
      renderItem={({ item }) => (
        <List.Item
          left={() => <List.Icon icon={item.icon}/>}
          title={item.title}
          onPress={() => this._openSettings(item)}
        />
      )}
      renderSectionHeader={({ section: { title } }) => (
        <List.Subheader>{title}</List.Subheader>
      )}
      sections={[
        {
          title: "Settings",
          data: [
            { title: this.PROFILE, icon: "account-settings" },
            { title: this.WALLET, icon: "credit-card-settings" },
            { title: this.APP_INFO, icon: "information" },
          ],
        },
      ]}
      keyExtractor={(item, index) => item + index}
    />
  );
};

export const renderAddCoinComponents = function() {
  return (
    <SectionList
      style={Styles.fullWidth}
      renderItem={({ item }) => (
        <List.Item
          title={item}
          onPress={
            item === "Add coin from list"
              ? () => this.navigateToScreen("AddCoin")
              : () => this._openCustomCoinMenus()
          }
        />
      )}
      renderSectionHeader={({ section: { title } }) => (
        <List.Subheader>{title}</List.Subheader>
      )}
      sections={[
        {
          title: "Manage Coins",
          data: ["Manage coins from list" /*, 'Add custom coin'*/],
        },
      ]}
      keyExtractor={(item, index) => item + index}
    />
  );
}

export const renderMainDrawerComponents = function() {
  return (
    <FlatList
      data={this.props.activeCoinsForUser}
      style={Styles.underflow}
      renderItem={({ item, index }) => {
        const Logo = CoinLogos[item.id.toLowerCase()].dark

        return (
          <List.Item
            title={item.id}
            left={() => Logo ? <View style={{ paddingLeft: 8, paddingRight: 8 }}>{RenderSquareCoinLogo(item.id)}</View> : null}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
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
          <List.Item
            title="Manage Coins"
            left={() => <List.Icon icon="format-list-bulleted"/>}
            onPress={() => this.navigateToScreen("AddCoin")}
          />
          <List.Item
            title={"Settings"}
            left={() => <List.Icon icon="cog"/>}
            onPress={() =>
              this.setState({ mainDrawer: false, currentCoinIndex: -2 })
            }
          />
          <List.Item
            title={"Log Out"}
            left={() => <List.Icon icon="exit-to-app"/>}
            onPress={this.handleLogout}
          />
        </React.Fragment>
      }
      keyExtractor={(item) => item.id}
    />
  );
}