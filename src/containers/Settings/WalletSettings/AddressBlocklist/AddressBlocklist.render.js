import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal";
import Styles from "../../../../styles";
import { unixToDate } from "../../../../utils/math";
import { ADDRESS_BLOCKLIST_MANUAL, DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER } from "../../../../utils/constants/constants";

export const AddressBlocklistRender = function () {
  const blocklistType = this.state.addressBlocklistSettings.addressBlocklistDefinition.type;
  const { title: blocklistTypeTitle, description: blocklistTypeDescription } = this.ADDRESS_BLOCKLIST_TYPE_DESCRIPTORS[blocklistType];
  
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
          {this.state.editBlockDefinitionDataModal.open && (
            <TextInputModal
              visible={
                this.state.editBlockDefinitionDataModal.open
              }
              onChange={() => {}}
              cancel={(text) =>
                this.finishEditBlockDefinitionData(
                  text
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
          {this.state.selectBlockTypeModal.open && (
            <ListSelectionModal
              title={this.state.selectBlockTypeModal.label}
              flexHeight={0.5}
              visible={this.state.selectBlockTypeModal.open}
              onSelect={(item) => this.selectBlockTypeButton(item.key)}
              data={this.BLOCKLIST_TYPE_BUTTONS}
              cancel={() => this.closeSelectBlockTypeModal()}
            />
          )}
        </Portal>
        <Divider />
        <List.Subheader>{"Address Blocklist Details"}</List.Subheader>
        <Divider />
        <List.Item
          title={blocklistTypeTitle}
          description={blocklistTypeDescription}
          onPress={() =>
            this.openSelectBlockTypeModal(
              `Blocklist Type`
            )
          }
        />
        <Divider />
        {
          blocklistType !== ADDRESS_BLOCKLIST_MANUAL && (
            <React.Fragment>
              <List.Item
                title={
                  this.state.addressBlocklistSettings.addressBlocklistDefinition.data
                    ? this.state.addressBlocklistSettings.addressBlocklistDefinition
                        .data
                    : DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER
                }
                description={'Address blocklist source'}
                onPress={() => this.openEditBlockDefinitionDataModal()}
              />
              <Divider />
            </React.Fragment>
          )
        }
        <List.Subheader>{"Blocked Addresses"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Add blocked address"}
          right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
          onPress={() => this.openAddBlockedAddressModal()}
        />
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
      </ScrollView>
    </SafeAreaView>
  );
};
