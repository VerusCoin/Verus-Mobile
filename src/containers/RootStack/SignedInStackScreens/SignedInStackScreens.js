import React, { useEffect, useState } from 'react';
import MainStackScreens from '../MainStackScreens/MainStackScreens';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setDeeplinkUrl } from '../../../actions/actionCreators';

const SignedInStackScreens = props => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkUrl = useSelector((state) => state.deeplink.url)
  const parsingUrl = useSelector(state => state.deeplink.parsingUrl);
  const requestId = useSelector(state => state.deeplink.requestId);
  const store = useStore();
  const dispatch = useDispatch()

  useEffect(() => {
    // A newer URL or close can arrive between this render and its effect.
    const current = store.getState().deeplink;
    if (deeplinkId != null && deeplinkUrl != null && !parsingUrl &&
        current.requestId === requestId && current.url === deeplinkUrl && !current.parsingUrl) {
      dispatch(setDeeplinkUrl(null))  
      props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
    }
  }, [deeplinkId, deeplinkUrl, parsingUrl, requestId, store]);

  return (
    <MainStackScreens />
  );
};

export default SignedInStackScreens;
