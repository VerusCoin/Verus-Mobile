import * as React from 'react';
import { Divider, FAB, Menu, Portal, Button, IconButton } from 'react-native-paper';
import { SafeAreaView, View } from 'react-native'
import Colors from '../../globals/colors';

const SignedOutDropdown = (props) => {
  const {
    handleRecoverSeed,
    handleRevokeRecover,
    hasAccount
  } = props;
  const [visible, setVisible] = React.useState(false);

  const openMenu = () => setVisible(true);

  const closeMenu = () => setVisible(false);

  const actions = !hasAccount
      ? []
      : [
          {
            label: 'Recover account seeds',
            onPress: handleRecoverSeed,
          },
          {
            label: 'Revoke/Recover VerusID',
            onPress: handleRevokeRecover,
          }
        ];

  return (
    <SafeAreaView
      style={{
        flexDirection: 'row',
        justifyContent: "flex-end",
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
    </SafeAreaView>
  );
};

export default SignedOutDropdown;