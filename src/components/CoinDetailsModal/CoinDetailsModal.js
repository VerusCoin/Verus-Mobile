/*
  This component displays the details of ta transaction selected
  from the Overview component.
*/

import React, { Component } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  Linking, 
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { CoinLogos } from '../../utils/CoinData/CoinData';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { Button } from "react-native-paper"
import SemiModal from "../SemiModal";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import { addCoin, addKeypairs, removeExistingCoin, setUserCoins } from "../../actions/actionCreators";
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import { connect } from 'react-redux';
import { clearAllCoinIntervals } from "../../actions/actionDispatchers";
import { CommonActions } from '@react-navigation/native';

class CoinDetailsModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false
    }
  }

  openWebsite = () => {
    let url = this.props.data.website

    if (url != null) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          console.log("Don't know how to open URI: " + url);
        }
      });
    }
  };

  resetToScreen = (route, title, data) => {
    const resetAction = CommonActions.reset({
      index: 1, // <-- currect active route from actions array
      routes: [
        { name: "Home" },
        { name: route, params: { title: title, data: data } },
      ],
    })

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  _handleRemoveCoin = () => {
    this.setState({ 
      loading: true
    }, async () => {
      const removePromise = () => new Promise((resolve, reject) => {
        removeExistingCoin(
          this.props.data.id,
          this.props.activeAccount.id,
          this.props.dispatch,
          false
        )
          .then((res) => {
            clearAllCoinIntervals(this.props.data.id);
            this.props.dispatch(
              setUserCoins(
                this.props.activeCoinList,
                this.props.activeAccount.id
              )
            );
            this.resetToScreen("AddCoin", "Add Coin")
            resolve();
          })
          .catch((err) => {
            console.warn(err);
            reject(err);
          });
      })

      try {
        await removePromise()

        this.setState({loading: false})
        this.props.cancel()
      } catch(e) {
        createAlert("Error Removing Coin", `There was a problem removing ${this.props.data.display_ticker}.`);
        console.error(e)
        this.setState({ loading: false });
        this.props.cancel()
      }
    })
  }

  _handleAddCoin = async () => {
    this.setState({ loading: true });

    try {
      this.props.dispatch(
        await addKeypairs(
          this.props.data,
          this.props.activeAccount.keys,
          this.props.activeAccount.keyDerivationVersion == null
            ? 0
            : this.props.activeAccount.keyDerivationVersion
        )
      );

      const addCoinAction = await addCoin(
        this.props.data,
        this.props.activeCoinList,
        this.props.activeAccount.id,
        this.props.data.compatible_channels
      )

      if (addCoinAction) {
        this.props.dispatch(addCoinAction);
        this.props.dispatch(
          setUserCoins(
            this.props.activeCoinList,
            this.props.activeAccount.id
          )
        );

        activateChainLifecycle(this.props.data);

        this.setState({ loading: false });
        this.props.cancel()
      } else {
        throw new Error("Error adding coin");
      }
    } catch(e) {
      createAlert("Error Adding Coin", `There was a problem adding ${this.props.data.display_ticker}.`);
      console.error(e)
      this.setState({ loading: false });
      this.props.cancel()
    }
  }

  render() {
    const {
      data,
      animationType,
      visible,
      cancel,
      added
    } = this.props;
    const {
      theme_color,
      display_name,
      id,
      website
    } = data
    const tickerLc = id == null ? 'vrsc' : id.toLowerCase()
    const Logo = CoinLogos[tickerLc] ? CoinLogos[tickerLc].light : null
    
    return (
      <SemiModal
        animationType={animationType}
        transparent={true}
        visible={visible}
        onRequestClose={() => {
          if (!this.state.loading) cancel();
        }}
        flexHeight={1}
      >
        <View style={Styles.centerContainer}>
          <View style={{ ...Styles.headerContainer, minHeight: 48 }}>
            <View style={Styles.semiModalHeaderContainer}>
              <Button
                onPress={cancel}
                disabled={this.state.loading}
                color={Colors.primaryColor}
              >
                {"Close"}
              </Button>
              <Text
                style={{
                  ...Styles.centralHeader,
                  ...Styles.smallMediumFont,
                }}
              >
                {display_name || "None"}
              </Text>
              <Button
                onPress={() => this.openWebsite()}
                color={Colors.primaryColor}
                disabled={
                  !website || website.length === 0 || this.state.loading
                }
              >
                {"Website"}
              </Button>
            </View>
          </View>
          <ScrollView
            style={{
              ...Styles.flexBackground,
              ...Styles.fullWidth,
              backgroundColor: theme_color || "black",
            }}
            contentContainerStyle={Styles.centerContainer}
          >
            {this.state.loading ? (
              <ActivityIndicator
                animating={this.state.loading}
                size="large"
                color={Colors.secondaryColor}
              />
            ) : (
              <TouchableOpacity
                style={Styles.centerContainer}
                onPress={
                  added
                    ? () => this._handleRemoveCoin()
                    : () => this._handleAddCoin()
                }
              >
                <Logo width={75} height={75} />
                <Button
                  disabled={this.state.loading}
                  color={Colors.secondaryColor}
                  style={{
                    marginTop: 32,
                  }}
                >
                  {added ? "Remove Currency" : "Add Currency"}
                </Button>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </SemiModal>
    );
  }
}

export default connect()(CoinDetailsModal);
