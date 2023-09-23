import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal";
import Styles from "../../../../styles";
import { unixToDate } from "../../../../utils/math";

export const AddressBlocklistRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.addBlockedAddressModal.open && (
            <TextInputModal
              visible={
                this.state.addBlockedAddressModal.open
              }
              onChange={() => {}}
              cancel={(text) =>
                this.finishEditBlockedAddress(
                  text,
                  this.state.addBlockedAddressModal.index
                )
              }
            />
          )}
          {this.state.editPropertyModal.open && (
            <ListSelectionModal
              title={this.state.editPropertyModal.label}
              flexHeight={0.5}
              visible={this.state.editPropertyModal.open}
              onSelect={(item) => this.selectEditPropertyButton(item.key)}
              data={this.EDIT_PROPERTY_BUTTONS}
              cancel={() => this.closeEditPropertyModal()}
            />
          )}
        </Portal>
        <List.Subheader>{"Blocked Addresses"}</List.Subheader>
        <Divider />
        {this.state.addressBlocklistSettings.addressBlocklist.map((blockedAddress, index) => {
            return (
              <React.Fragment key={index}>
                <List.Item
                  key={index}
                  title={blockedAddress.address}
                  description={`Last modified ${unixToDate(blockedAddress.lastModified)}`}
                  right={(props) => (
                    <List.Icon {...props} icon={"account-edit"} size={20} />
                  )}
                  onPress={() =>
                    this.openEditPropertyModal(
                      `Address ${index + 1}`,
                      index
                    )
                  }
                />
                <Divider />
              </React.Fragment>
            );
          }) 
        }
        <List.Item
          title={"Add blocked address"}
          right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
          onPress={() => this.openAddBlockedAddressModal()}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
