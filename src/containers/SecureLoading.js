/*
  The secure loading screen is a simple screen with a spinner and a message
  that exists as display to show while something that cannot be interrupted
  is loading. This usually means interactions with sensitive data in memory
  like removing accounts. It is passed a promise that it completes and then
  exits the screen, dispatching the result of the promise to the store.

  It will only navigate to a screen if the screen is provided, if it is not
  provided, it will simply do nothing on completion. 

  This screen should always be reset to, not just navigated to, so that the 
  user cannot go back.
*/

import React, { Component } from "react";
import { 
  View, 
  StyleSheet, 
  Text, 
  ActivityIndicator,
  Alert
} from "react-native";
import { NavigationActions, StackActions } from 'react-navigation';
import { connect } from 'react-redux';
import { signOut } from '../actions/actionCreators'

const DEFAULT_TIMEOUT = 30000
const DEFAULT_MESSAGE = "Loading..."

class SecureLoading extends Component {
  constructor() {
    super();
    this.state = {
      message: DEFAULT_MESSAGE,
      task: null,
      timeout: DEFAULT_TIMEOUT,
      route: null,
      timedOut: false,
      action: null
    };
  }

  componentWillMount() {
    const navigation = this.props.navigation
    const data = navigation.state.params ? navigation.state.params.data : null

    this.timeoutTimer = setTimeout(() => {
      this.setState({timedOut: true})
    }, DEFAULT_TIMEOUT)

    if (data) {
      this.setState({
        task: data.task ? data.task : null, 
        message: data.message ? data.message: DEFAULT_MESSAGE, 
        timeout: data.timeout ? data.timeout : DEFAULT_TIMEOUT,
        route: data.route ? data.route : null,
        input: data.input ? data.input : null},
        () => {
          if (typeof this.state.task === "function") {
            this.state.task(...this.state.input)
            .then((res) => {
              clearTimeout(this.timeoutTimer);
              if (!this.state.timedOut) {
                this.props.dispatch(res)
                if (this.state.route) {
                  this.resetToScreen(this.state.route)
                } else {
                  this.props.dispatch(signOut())
                }
              }
            })
          } else {
            throw new Error("Error, task given to loading screen is " + (typeof this.state.task) + ", expected function")
          }
        })
    } else {
      throw new Error("Error, no task given to loading screen, expected Promise")
    }
  }

  resetToScreen = (route) => {
    const resetAction = NavigationActions.reset({
      index: 0, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: route }),
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  fatalErrorHandler = () => {
    clearTimeout(this.timeoutTimer);
    Alert.alert(
      "Error", 
      "Verus Mobile timed out while trying to complete a secure task, please close and " + 
      "restart the app.");
  }

  render() {
    return(
      <View style={styles.loadingRoot}>
        <ActivityIndicator animating={!this.state.timedOut} size="large"/>
        <Text style={styles.loadingLabel}>{this.state.message}</Text>
      </View>
    )
  }
}

export default connect()(SecureLoading);

const styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    marginTop: 15,
    fontSize: 15,
    textAlign: "center",
    color: "#E9F1F7",
    width: "70%"
  },
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  infoBox: {
    flex: 1,
    flexDirection: 'column',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    width: "85%",
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10
  },
  infoText: {
    fontSize: 16,
    color: "#E9F1F7"
  },
  linkBox: {
    width: "65%",
  },
  linkText: {
    fontSize: 16,
    color: "#2E86AB",
    textAlign: "right"
  },
  verifiedLabel: {
    marginTop: 10,
    marginBottom: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
});