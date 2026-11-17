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

  It looks like the request loading screen (GenericRequestLoading): the 7-bar
  loader, the task as a short title, and "Keep the app open." A slow task
  adds a longer line after 15 seconds (owner chose variation A, 2026-10-22).
  The card claim passes its own illustration in place of the loader, with
  animated styles for its hand-off (ClaimingFundsView).
*/

import React, { Component, useMemo } from "react";
import { 
  View, 
  Text, 
  Alert,
  StatusBar,
  StyleSheet,
} from "react-native";
import LottieView from 'lottie-react-native';
import Animated from 'react-native-reanimated';
import { CommonActions } from '@react-navigation/native';
import { connect } from 'react-redux';
import { clearSecureLoadingData, setSecureLoadingData, signOut } from '../../actions/actionCreators';
import { useOnboardingTheme } from '../../theme/onboarding';
import { fontStyle } from '../../globals/fonts';

const DEFAULT_TIMEOUT = 30000
const SLOW_TASK_DELAY = 15000
const DEFAULT_MESSAGE = "Loading"
const KEEP_OPEN_MESSAGE = "Keep the app open."
const SLOW_MESSAGE = "This is taking longer than usual. Keep the app open."

// Also used by the card claim while its transactions are broadcast. An
// `illustration` replaces the loader; `contentStyle` and `statusStyle` let it
// fade the screen and the line.
export const SecureLoadingView = ({
  contentStyle,
  errorMsg,
  illustration,
  message,
  slow,
  status,
  statusStyle,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const failed = status === "error" && Boolean(errorMsg);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[styles.content, contentStyle]}>
        {failed ? null : illustration ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.illustration}>
            {illustration}
          </View>
        ) : (
          <LottieView
            source={require('../../animations/loading_7bars.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        )}
        <Text accessibilityRole="header" style={styles.title}>
          {failed ? errorMsg : message}
        </Text>
        {failed ? null : (
          <Animated.Text
            style={[
              styles.status,
              illustration && styles.statusReserved,
              statusStyle,
            ]}>
            {slow || status === "timeout" ? SLOW_MESSAGE : KEEP_OPEN_MESSAGE}
          </Animated.Text>
        )}
      </Animated.View>
    </View>
  );
};

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
      slow: false,
    };
  }

  componentDidMount() {
    const { route } = this.props
    const data = route.params ? route.params.data : null
    const sessionScope = {
      sessionScoped: true,
      accountHash: this.props.activeAccount?.accountHash || null,
      sessionEpoch: this.props.sessionEpoch,
    };

    this.timeoutTimer = setTimeout(() => {
      this.setState({status: 'timeout'})
    }, DEFAULT_TIMEOUT)
    this.slowTimer = setTimeout(() => {
      this.setState({slow: true})
    }, SLOW_TASK_DELAY)

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
          if (typeof this.state.task === "function") {
            this.state
              .task(...this.state.input)
              .then((res) => {
                clearTimeout(this.timeoutTimer);
                if (this.state.status !== "timeout") {
                  this.setState({ status: "success" }, () => {
                    if (this.state.dispatchResult) this.props.dispatch(res);

                    if (this.state.route) {
                      this.props.dispatch(clearSecureLoadingData())
                      this.props.dispatch(setSecureLoadingData(this.state.successData, true))
                      
                      this.resetToScreen(
                        this.state.route,
                        this.state.screen
                      );
                    } else {
                      this.props.dispatch(signOut(sessionScope));
                    }
                  });
                }
              })
              .catch((e) => {
                clearTimeout(this.timeoutTimer);
                if (this.state.status !== "timeout") {
                  this.setState({ status: "error" }, () => {
                    if (this.state.route) {
                      this.props.dispatch(clearSecureLoadingData())
                      this.props.dispatch(setSecureLoadingData(this.state.errorData, false))
                      this.resetToScreen(this.state.route, this.state.screen, this.state.errorData);
                    } else {
                      this.props.dispatch(signOut(sessionScope));
                    }
                  });
                }
              });
          } else {
            if (this.state.onError) this.state.onError();
            clearTimeout(this.timeoutTimer);
            this.setState({ status: "error" });

            throw new Error(
              "Error, task given to loading screen is " +
                typeof this.state.task +
                ", expected function"
            );
          }
        }
      );
    } else {
      throw new Error("Error, no task given to loading screen, expected Promise")
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
          : { name: route },
      ],
    });

    if (this.props.navigation.closeDrawer) this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  fatalErrorHandler = () => {
    clearTimeout(this.timeoutTimer);
    Alert.alert(
      "Error", 
      "Verus Mobile timed out while trying to complete a secure task, please close and " + 
      "restart the app.");
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutTimer);
    clearTimeout(this.slowTimer);
  }

  render() {
    return (
      <SecureLoadingView
        errorMsg={this.state.errorMsg}
        message={this.state.message}
        slow={this.state.slow}
        status={this.state.status}
      />
    );
  }
}

const createStyles = theme =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 60,
    },
    // The request loading screen's loader, title and status sizes.
    animation: {
      width: 132,
      height: 96,
      marginBottom: 26,
    },
    // The same gap under an illustration, so the title stays in place.
    illustration: {
      marginBottom: 26,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      lineHeight: 31,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    status: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    // Room for the two-line slow message, so a moving illustration does not
    // jump when it appears.
    statusReserved: {
      minHeight: 44,
    },
  });

const mapStateToProps = state => ({
  activeAccount: state.authentication.activeAccount,
  sessionEpoch: state.authentication.sessionEpoch,
});

export default connect(mapStateToProps)(SecureLoading);
