import React from "react";
import { ScrollView, View } from 'react-native'
import styles from "../../../../../styles";
import { List, Divider, Portal, Button } from "react-native-paper";
import VerusIdDetailsModal from "../../../../../components/VerusIdDetailsModal/VerusIdDetailsModal";
import Colors from "../../../../../globals/colors";

export const VerusIdServiceOverviewRender = function () {
  const {linkedIds} = this.props;
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
      <Portal>
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
                    title={linkedIds[chainId][iAddr]}
                    description={iAddr}
                    left={props => <List.Icon {...props} icon={'account'} />}
                    onPress={() => this.openVerusIdDetailsModal(chainId, iAddr)}
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
