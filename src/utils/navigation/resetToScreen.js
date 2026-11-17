import {CommonActions} from '@react-navigation/native';

export const resetToScreen = (navigation, route, title, data, fullReset) => {
  const resetAction = CommonActions.reset(fullReset
    ? {index: 0, routes: [{name: route, params: {data}}]}
    : {index: 1, routes: [{name: 'Home'}, {name: route, params: {title, data}}]},
  );

  if (navigation.closeDrawer) navigation.closeDrawer();
  navigation.dispatch(resetAction);
};
