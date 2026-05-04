import * as React from 'react';
import {Menu, IconButton} from 'react-native-paper';
import {Platform, StatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Colors from '../../globals/colors';

const SignedOutDropdown = (props) => {
  const {
    handleRecoverSeed,
    handleRevokeRecover,
    handleProvisioningRequests,
    handleReadDeeplinkFromNfc,
    hasAccount
  } = props;
  const [visible, setVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  );

  const openMenu = () => setVisible(true);

  const closeMenu = () => setVisible(false);

  const actions = [
    ...(handleReadDeeplinkFromNfc
      ? [
          {
            label: 'Read deeplink from NFC',
            onPress: handleReadDeeplinkFromNfc,
          },
        ]
      : []),
    ...(hasAccount
      ? [
          {
            label: 'Recover account seeds',
            onPress: handleRecoverSeed,
          },
          {
            label: 'Revoke/Recover VerusID',
            onPress: handleRevokeRecover,
          },
          {
            label: 'Provisioning requests',
            onPress: handleProvisioningRequests,
          },
        ]
      : []),
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: "flex-end",
        paddingTop: topInset,
        paddingRight: 4,
        zIndex: 20,
        elevation: 20,
      }}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <IconButton
            icon="dots-vertical"
            size={28}
            onPress={openMenu}
            iconColor={Colors.quaternaryColor}
          />
        }>
          {
            actions.map((action, index) => {
              return (
                <Menu.Item key={index} onPress={(props) => {
                  closeMenu();
                  action.onPress(props);
                }} title={action.label} />
              );
            })
          }
      </Menu>
    </View>
  );
};

export default SignedOutDropdown;
