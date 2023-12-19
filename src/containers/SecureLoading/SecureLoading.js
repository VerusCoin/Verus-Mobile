/*
  The secure loading screen is a simple screen with a spinner and a message
  that exists as display to show while something that cannot be interrupted
  is loading. This usually means interactions with sensitive data in memory
  like removing accounts. It is passed a promise that it completes and then
  exits the screen, dispatching the result of the promise to the store (if 
  dispatch is specified).

  It will only navigate to a screen if the screen is provided, if it is not
  provided, it will simply do nothing on completion. 

  This screen should always be reset to, not just navigated to, so that the 
  user cannot go back.
*/

import React, {Component} from 'react';
import {View, Text, Alert} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import {connect} from 'react-redux';
import {
  clearSecureLoadingData,
  setSecureLoadingData,
  signOut,
} from '../../actions/actionCreators';
import {Icon} from 'react-native-elements';
import styles from './SecureLoading.styles';
import AnimatedActivityIndicator from '../../components/AnimatedActivityIndicator';
import Colors from '../../globals/colors';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MESSAGE = 'Loading...';

class SecureLoading extends Component {
  constructor() {
    super();
    this.state = {
      message: DEFAULT_MESSAGE,
      task: null,
      timeout: DEFAULT_TIMEOUT,
      route: null,
      action: null,
      input: null,
      dispatchResult: false,
      onError: null,
      successMsg: null,
      errorMsg: null,
      status: 'loading',
    };
  }

  componentDidMount() {
    const {route} = this.props;
    const data = route.params ? route.params.data : null;

    this.timeoutTimer = setTimeout(() => {
      this.setState({status: 'timeout'});
    }, DEFAULT_TIMEOUT);

    if (data) {
      this.setState(
        {
          task: data.task ? data.task : null,
          message: data.message ? data.message : DEFAULT_MESSAGE,
          timeout: data.timeout ? data.timeout : DEFAULT_TIMEOUT,
          route: data.route ? data.route : null,
          input: data.input ? data.input : [],
          dispatchResult: data.dispatchResult ? true : false,
          onError: data.onError ? data.onError : null,
          successMsg: data.successMsg ? data.successMsg : null,
          errorMsg: data.errorMsg ? data.errorMsg : null,
          screen: data.screen ? data.screen : null,
          successData: data.successData ? data.successData : {},
          errorData: data.errorData ? data.errorData : {},
        },
        () => {
          if (typeof this.state.task === 'function') {
            this.state
              .task(...this.state.input)
              .then(res => {
                clearTimeout(this.timeoutTimer);
                if (this.state.status !== 'timeout') {
                  this.setState({status: 'success'}, () => {
                    if (this.state.dispatchResult) this.props.dispatch(res);

                    if (this.state.route) {
                      this.props.dispatch(clearSecureLoadingData());
                      this.props.dispatch(
                        setSecureLoadingData(this.state.successData, true),
                      );

                      this.resetToScreen(this.state.route, this.state.screen);
                    } else {
                      this.props.dispatch(signOut());
                    }
                  });
                }
              })
              .catch(e => {
                clearTimeout(this.timeoutTimer);
                if (this.state.status !== 'timeout') {
                  this.setState({status: 'error'}, () => {
                    if (this.state.dispatchResult) this.props.dispatch(res);

                    if (this.state.route) {
                      this.props.dispatch(clearSecureLoadingData());
                      this.props.dispatch(
                        setSecureLoadingData(this.state.errorData, false),
                      );
                      this.resetToScreen(
                        this.state.route,
                        this.state.screen,
                        this.state.errorData,
                      );
                    } else {
                      this.props.dispatch(signOut());
                    }
                  });
                }
              });
          } else {
            if (this.state.onError) this.state.onError();
            clearTimeout(this.timeoutTimer);
            this.setState({status: 'error'});

            throw new Error(
              'Error, task given to loading screen is ' +
                typeof this.state.task +
                ', expected function',
            );
          }
        },
      );
    } else {
      throw new Error(
        'Error, no task given to loading screen, expected Promise',
      );
    }
  }

  resetToScreen = (route, screen) => {
    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [
        screen != null
          ? {
              name: route,
              params: {
                screen,
                initial: false,
              },
            }
          : {name: route},
      ],
    });

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  fatalErrorHandler = () => {
    clearTimeout(this.timeoutTimer);
    Alert.alert(
      'Error',
      'Verus Mobile timed out while trying to complete a secure task, please close and ' +
        'restart the app.',
    );
  };

  render() {
    return (
      <View
        style={[
          styles.loadingRoot,
          {
            backgroundColor: this.props.darkMode
              ? Colors.darkModeColor
              : Colors.secondaryColor,
          },
        ]}>
        {(this.state.status === 'loading' ||
          (this.state.status === 'success' && !this.state.successMsg) ||
          (this.state.status !== 'error' && !this.state.errorMsg)) && (
          <AnimatedActivityIndicator style={{width: 128}} />
        )}
        {this.state.status === 'success' && this.state.successMsg && (
          <Icon name="check" color="#50C3A5" size={45} />
        )}
        {this.state.status === 'error' && this.state.errorMsg && (
          <Icon name="close" color="rgba(206,68,70,1)" size={45} />
        )}
        <Text
          style={[
            styles.loadingLabel,
            {
              color: this.props.darkMode
                ? Colors.secondaryColor
                : Colors.quaternaryColor,
            },
          ]}>
          {this.state.status === 'success' && this.state.successMsg
            ? this.state.successMsg
            : this.state.status === 'error' && this.state.errorMsg
            ? this.state.errorMsg
            : this.state.message}
        </Text>
      </View>
    );
  }
}

const mapStateToProps = state => {
  return {
    darkMode: state.settings.darkModeState,
  };
};

export default connect(mapStateToProps)(SecureLoading);
