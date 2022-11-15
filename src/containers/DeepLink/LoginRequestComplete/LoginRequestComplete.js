import React from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import Styles from '../../../styles/index';
import {
  primitives,
} from "verusid-ts-client";
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {Button, Text} from 'react-native-paper';
import {handleRedirect} from '../../../utils/deeplink/handleRedirect';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import { copyToClipboard } from '../../../utils/clipboard/clipboard';
import { CommonActions } from '@react-navigation/native';
import Colors from '../../../globals/colors';

const LoginRequestComplete = props => {
  const {signedResponse} = props.route.params;
  const res = new primitives.LoginConsentResponse(signedResponse);
  const redirects = res.decision.request.challenge.redirect_uris;
  const redirectinfo = redirects ? redirects[0] : null;

  const tryRedirect = async () => {
    try {
      return handleRedirect(signedResponse, redirectinfo);
    } catch (e) {
      createAlert('Error', e.message);
    }
  };

  const cancel = () => {
    props.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedInStack'}],
      }),
    );
  };

  const completeDeeplink = async () => {
    if (redirectinfo && redirectinfo.uri) {
      await tryRedirect()
      cancel()
    } else {
      cancel()
    }
  }

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
      }}>
      <View style={Styles.focalCenter}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {'Success!'}
        </Text>
        <View style={{paddingVertical: 16}}>
          <AnimatedSuccessCheckmark
            style={{
              width: 128,
            }}
          />
        </View>
        {redirectinfo != null && (
          <TouchableOpacity
            onPress={() =>
              copyToClipboard(redirectinfo.uri, {
                title: 'URL copied',
                message: `${redirectinfo.uri} copied to clipboard.`,
              })
            }
            style={{
              width: '75%',
            }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 20,
                color: Colors.verusDarkGray,
              }}>
              {`Press done to complete login and return to\n`}
              <Text
                style={{color: Colors.basicButtonColor, textAlign: 'center'}}>
                {redirectinfo.uri}
              </Text>
            </Text>
          </TouchableOpacity>
        )}
        <View
          style={{
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={Colors.verusGreenColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => completeDeeplink()}>
            Done
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default LoginRequestComplete;
