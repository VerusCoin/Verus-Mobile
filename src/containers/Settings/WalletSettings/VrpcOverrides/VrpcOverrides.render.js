import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal";
import Styles from "../../../../styles";
import AnimatedActivityIndicatorBox from "../../../../components/AnimatedActivityIndicatorBox";

export const VrpcOverridesRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.addVrpcOverrideModal.open && (
            <TextInputModal
              visible={
                this.state.addVrpcOverrideModal.open
              }
              onChange={() => {}}
              cancel={(text) =>
                this.finishAddVrpcOverrideModal(
                  text,
                  this.state.addVrpcOverrideModal.systemid
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
        {this.state.loading ? 
          <View style={{
            flex: 1, alignItems: "center",
            justifyContent: "center"
          }}>
            <AnimatedActivityIndicatorBox />
          </View>
            : 
          <>
            <Divider />
            <List.Subheader>{"RPC Servers for Systems"}</List.Subheader>
            <Divider />
            {Object.values(this.state.systems).map((system, index) => {
                return (
                  <React.Fragment key={index}>
                    <List.Item
                      key={index}
                      title={
                        this.state.vrpcOverridesSettings.vrpcOverrides && this.state.vrpcOverridesSettings.vrpcOverrides[system.system_id] ? 
                          this.state.vrpcOverridesSettings.vrpcOverrides[system.system_id][0] 
                          : 
                          system.vrpc_endpoints[0]
                      }
                      right={(props) => (
                        <List.Icon {...props} icon={"account-edit"} size={20} />
                      )}
                      description={system.display_name}
                      onPress={() =>
                        this.openEditPropertyModal(
                          `Edit RPC Server`,
                          system.system_id
                        )
                      }
                    />
                    <Divider />
                  </React.Fragment>
                );
              }) 
            }
            <List.Item
              title={"Add RPC Server"}
              right={(props) => (
                <List.Icon {...props} icon={"plus"} size={20} />
              )}
              onPress={() => this.openAddVrpcServerModal()}
            />
            <Divider />
            <List.Subheader numberOfLines={100}>
              {
                'Blockchain data for all currencies on the listed networks will be fetched from the listed server for that network. To change the server for a network, edit the appropriate server URL, and restart Verus Mobile.' + 
                '\n\nDO NOT EDIT THESE SETTINGS UNLESS YOU KNOW WHAT YOU ARE DOING. MAKE SURE YOU TRUST THE SERVERS YOU ARE CONNECTING TO.'
              }
            </List.Subheader>
            <Divider />
          </>
        }
      </ScrollView>
    </SafeAreaView>
  );
};
