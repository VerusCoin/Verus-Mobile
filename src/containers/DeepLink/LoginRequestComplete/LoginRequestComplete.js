import React, {useState} from 'react';
import {ScrollView, View, TouchableOpacity} from 'react-native';
import Styles from '../../../styles/index';
import {primitives} from 'verusid-ts-client';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {Button, Text} from 'react-native-paper';
import {handleRedirect} from '../../../utils/deeplink/handleRedirect';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import {copyToClipboard} from '../../../utils/clipboard/clipboard';
import {CommonActions} from '@react-navigation/native';
import Colors from '../../../globals/colors';
import {URL} from 'react-native-url-polyfill';
import AnimatedActivityIndicator from '../../../components/AnimatedActivityIndicator';
import { VALU_SERVICE_ID } from "../../../utils/constants/services";
import { useSelector } from 'react-redux';

const LoginRequestComplete = props => {
  const {signedResponse} = props.route.params;
  const reDirect = useSelector((state) => state.deeplink.redirect)
  const res = new primitives.LoginConsentResponse(signedResponse);
  const redirects = res.decision.request.challenge.redirect_uris
    ? res.decision.request.challenge.redirect_uris
    : [];
  let url;
  let urlDisplayString = '';
  let extraInfo = '';
  let redirectinfo = null;
  const [loading, setLoading] = useState(false);

  const cancel = () => {
    props.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedInStack'}],
      }),
    );
  };

  let redirectsObj = {};
  
  redirects.forEach(a => {redirectsObj[a.vdxfkey] = a;});

  if (redirectsObj[primitives.LOGIN_CONSENT_REDIRECT_VDXF_KEY.vdxfid]) {
    try {
      redirectinfo = redirectsObj[primitives.LOGIN_CONSENT_REDIRECT_VDXF_KEY.vdxfid];
      url = new URL(redirectsObj[primitives.LOGIN_CONSENT_REDIRECT_VDXF_KEY.vdxfid].uri);
      extraInfo =  ' and return to\n'
      urlDisplayString = `${url.protocol}//${url.host}`;
    } catch(e) {
      createAlert('Error', e.message);
      cancel();
    }
  } else {
    redirectinfo = redirectsObj[primitives.LOGIN_CONSENT_WEBHOOK_VDXF_KEY.vdxfid];
  }


  const tryRedirect = async () => {
    try {
      setLoading(true);
      return await handleRedirect(signedResponse, redirectinfo);
    } catch (e) {
      setLoading(false);
      createAlert('Error', e.message);
    }
  };

  const completeDeeplink = async () => {
    if (redirectinfo && redirectinfo.uri) {
      const returnedData = await tryRedirect();
      if (reDirect) {
        props.navigation.navigate(reDirect, { data: returnedData?.data });
      } else {
        cancel();
      }
    } else {
      cancel();
    }
  };

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
          {loading ? "Loading..." : 'Success!'}
        </Text>
        <View style={{paddingVertical: 16}}>
          {loading ? (
            <AnimatedActivityIndicator
              style={{
                width: 128,
              }}
            />
          ) : (
            <AnimatedSuccessCheckmark
              style={{
                width: 128,
              }}
            />
          )}
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
              {`Press done to complete login${extraInfo}`}
              <Text
                style={{color: Colors.basicButtonColor, textAlign: 'center'}}>
                {urlDisplayString}
              </Text>
            </Text>
          </TouchableOpacity>
        )}
        <View
          style={{
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            paddingTop: 16,
          }}>
          <Button
            color={Colors.warningButtonColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            disabled={loading}
            onPress={() => cancel()}>
            Cancel
          </Button>
          <Button
            color={Colors.verusGreenColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            disabled={loading}
            onPress={() => completeDeeplink()}>
            Done
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default LoginRequestComplete;
