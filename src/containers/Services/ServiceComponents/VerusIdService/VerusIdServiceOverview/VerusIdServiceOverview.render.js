import React from "react";
import { ScrollView, View } from 'react-native'
import styles from "../../../../../styles";
import { List, Divider, Portal } from "react-native-paper";
import Button from "../../../../../components/Button";
import VerusIdDetailsModal from "../../../../../components/VerusIdDetailsModal/VerusIdDetailsModal";
import Colors from "../../../../../globals/colors";
import IdentityActionsModal from './IdentityActionsModal';
import {identityLabel} from '../IdentityRegistration/presentation';

export const VerusIdServiceOverviewRender = function () {
  const {linkedIds} = this.props;
  const {identityActions} = this.state;
  const sortedIdKeysPerChain = {};

  for (const chainId of Object.keys(this.props.linkedIds)) {
    sortedIdKeysPerChain[chainId] = Object.keys(
      this.props.linkedIds[chainId],
    ).sort(function (x, y) {
      if (linkedIds[chainId][x] < linkedIds[chainId][y]) {
        return -1;
      }
      if (linkedIds[chainId][x] > linkedIds[chainId][y]) {
        return 1;
      }
      return 0;
    });
  }

  return (
    <ScrollView style={{...styles.fullWidth, ...styles.backgroundColorWhite}}>
      <List.Item
        title="Identity registrations"
        description="Create a VerusID or continue a registration."
        descriptionNumberOfLines={3}
        left={props => <List.Icon {...props} icon="account-plus-outline" />}
        right={props => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => this.props.navigation.navigate('IdentityRegistration', {screen: 'IdentityRegistrationStart'})}
      />
      <Divider />
      <Portal>
        {identityActions != null && (
          <IdentityActionsModal
            selection={identityActions}
            visible={this.state.identityActionsVisible}
            onClose={() => this.closeIdentityActionsModal(identityActions)}
            onDismiss={() => this.finishIdentityAction(identityActions)}
            onSelect={action => this.closeIdentityActionsModal(identityActions, action)}
          />
        )}
        {this.state.verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal
            {...this.state.verusIdDetailsModalProps}
            StickyFooterComponent={
              <View
                style={{
                  ...styles.fullWidthBlock,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  display: 'flex',
                }}>
                <Button
                  buttonColor={Colors.warningButtonColor}
                  textColor={Colors.secondaryColor}
                  style={{width: 148}}
                  onPress={() =>
                    this.tryUnlinkIdentity(
                      this.state.verusIdDetailsModalProps.iAddress,
                      this.state.verusIdDetailsModalProps.chain,
                      this.state.verusIdDetailsModalProps.requestContext,
                    )
                  }>
                  Unlink
                </Button>
              </View>
            }
          />
        )}
      </Portal>
      {Object.keys(sortedIdKeysPerChain).map(chainId => {
        return (
          <React.Fragment key={chainId}>
            {sortedIdKeysPerChain[chainId].length > 0 && (
              <List.Subheader>{`Linked ${chainId} VerusIDs`}</List.Subheader>
            )}
            {sortedIdKeysPerChain[chainId].map(iAddr => {
              return (
                <React.Fragment key={iAddr}>
                  <Divider />
                  <List.Item
                    title={identityLabel(iAddr, linkedIds[chainId])}
                    titleNumberOfLines={3}
                    left={props => <List.Icon {...props} icon={'account'} />}
                    right={props => <List.Icon {...props} icon="chevron-right" />}
                    accessibilityLabel={`Actions for ${identityLabel(iAddr, linkedIds[chainId])}`}
                    accessibilityHint="Transfer, modify, view details or unlink this identity"
                    onPress={() => this.openIdentityActionsModal(chainId, iAddr, linkedIds[chainId][iAddr])}
                  />
                </React.Fragment>
              );
            })}
            <Divider />
            <List.Subheader>{`Options`}</List.Subheader>
            <Divider />
            <List.Item
              title={'Link VerusID'}
              right={props => <List.Icon {...props} icon={'plus'} size={20} />}
              onPress={() => this.openLinkIdentityModalFromChain(chainId)}
            />
            <Divider />
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
};
