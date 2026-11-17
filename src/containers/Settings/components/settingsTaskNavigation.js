import {CommonActions} from '@react-navigation/native';

export const resetToSecureLoading = (navigation, data) => {
  const resetAction = CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'SecureLoading',
        params: {data},
      },
    ],
  });

  if (navigation.closeDrawer) navigation.closeDrawer();
  navigation.dispatch(resetAction);
};
