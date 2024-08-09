import * as React from 'react';
import { Platform } from 'react-native';
import { FAB, Portal } from 'react-native-paper';
import Colors from '../../../globals/colors';

const HomeFAB = (props) => {
  const {
    handleAddCoin,
    handleVerusPay,
    handleEditCards,
    showConfigureHomeCards,
    handleAddPbaasCurrency,
    handleAddErc20Token,
  } = props;

  const [state, setState] = React.useState({ open: false });

  const onStateChange = ({ open }) => setState({ open });

  const { open } = state;

  const actions = !showConfigureHomeCards
      ? [
          {
            icon: 'format-list-bulleted',
            label: 'Manage Coins',
            onPress: handleAddCoin,
          },
          {
            icon: 'rocket-launch',
            label: 'Add ERC20 Token',
            onPress: handleAddErc20Token,
          },
          {
            icon: 'rocket-launch',
            label: 'Add PBaaS Currency',
            onPress: handleAddPbaasCurrency,
          }
        ]
      : [
          {
            icon: 'swap-horizontal-variant',
            label: 'Configure Home Cards',
            onPress: handleEditCards,
          },
          {
            icon: 'format-list-bulleted',
            label: 'Manage Coins',
            onPress: handleAddCoin,
          },
          {
            icon: 'ethereum',
            label: 'Add ERC20 Token',
            onPress: handleAddErc20Token,
          },
          {
            icon: 'rocket-launch',
            label: 'Add PBaaS Currency',
            onPress: handleAddPbaasCurrency,
          },
        ];

  return (
    <Portal>
      <FAB.Group
        fabStyle={{
          backgroundColor: Colors.primaryColor,
        }}
        open={open}
        icon={open ? "minus" : "plus"}
        actions={actions}
        onStateChange={onStateChange}
      />
    </Portal>
  );
};

export default HomeFAB; 