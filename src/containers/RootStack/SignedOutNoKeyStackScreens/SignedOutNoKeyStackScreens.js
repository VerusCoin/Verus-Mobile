import React, {useEffect} from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import SignUp from '../../SignUp/SignUp';
import LandingScreen from '../../Onboard/Welcome/LandingScreen';
import WelcomeSlider from '../../Onboard/Welcome/WelcomeSlider';
import CreateProfile from '../../Onboard/CreateProfile/CreateProfile';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {setDeeplinkUrl} from '../../../actions/actionCreators';
import useSignedOutNetwork from '../../../hooks/useSignedOutNetwork';

const SignedOutNoKeyStack = createStackNavigator();

const SignedOutNoKeyStackScreens = props => {
  const deeplinkId = useSelector(state => state.deeplink.id);
  const deeplinkUrl = useSelector(state => state.deeplink.url);
  const parsingUrl = useSelector(state => state.deeplink.parsingUrl);
  const requestId = useSelector(state => state.deeplink.requestId);
  const store = useStore();
  const dispatch = useDispatch();
  const [testProfile, setTestProfile] = useSignedOutNetwork();

  useEffect(() => {
    // A newer URL or close can arrive between this render and its effect.
    const current = store.getState().deeplink;
    if (deeplinkId != null && deeplinkUrl != null && !parsingUrl &&
        current.requestId === requestId && current.url === deeplinkUrl && !current.parsingUrl) {
      dispatch(setDeeplinkUrl(null));
      props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
    }
  }, [deeplinkId, deeplinkUrl, parsingUrl, requestId, store]);

  return (
    <SignedOutNoKeyStack.Navigator>
      <SignedOutNoKeyStack.Screen
        name="LandingScreen"
        options={{
          headerShown: false,
        }}>
        {screenProps => (
          <LandingScreen
            {...screenProps}
            testProfile={testProfile}
            setTestProfile={setTestProfile}
          />
        )}
      </SignedOutNoKeyStack.Screen>
      <SignedOutNoKeyStack.Screen
        name="WelcomeSlider"
        component={WelcomeSlider}
        options={{
          headerShown: false,
        }}
      />
      <SignedOutNoKeyStack.Screen
        name="CreateProfile"
        options={{
          animationEnabled: false,
          headerShown: false,
        }}>
        {screenProps => (
          <CreateProfile
            {...screenProps}
            testProfile={testProfile}
          />
        )}
      </SignedOutNoKeyStack.Screen>
      <SignedOutNoKeyStack.Screen
        name="SignIn"
        component={SignUp}
        options={{
          headerShown: false,
        }}
      />
    </SignedOutNoKeyStack.Navigator>
  );
};

export default SignedOutNoKeyStackScreens
