import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import { ISO_3166_COUNTRIES, ISO_3166_ALPHA_2_CODES } from "../../../../utils/constants/iso3166";
import Colors from "../../../../globals/colors";

export const PersonalLocationsEditAddressRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.currentTextInputModal != null && (
            <TextInputModal
              value={this.state.address[this.state.currentTextInputModal]}
              visible={this.state.currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({
                    address: {
                      ...this.state.address,
                      [this.state.currentTextInputModal]: text,
                    },
                  });
              }}
              cancel={() => this.closeTextInputModal()}
            />
          )}
          {this.state.countryModalOpen && (
            <ListSelectionModal
              title="Select a Country"
              flexHeight={3}
              visible={this.state.countryModalOpen}
              onSelect={(item) => this.selectCountry(item.key)}
              data={ISO_3166_ALPHA_2_CODES.map((code) => {
                const item = ISO_3166_COUNTRIES[code];

                return {
                  key: code,
                  title: `${item.emoji} ${item.name}`,
                };
              })}
              cancel={() => this.setState({ countryModalOpen: false })}
            />
          )}
        </Portal>
        {Object.keys(this.addressTextInputLabels).map((key, index) => {
          const input = this.addressTextInputLabels[key];

          return (
            <React.Fragment key={index}>
              <List.Subheader>{input.title}</List.Subheader>
              <Divider />
              <List.Item
                title={
                  this.state.address[key].length > 0
                    ? this.state.address[key]
                    : input.placeholder
                }
                titleStyle={{
                  color:
                    this.state.address[key].length > 0
                      ? Colors.quaternaryColor
                      : Colors.verusDarkGray,
                }}
                right={(props) => (
                  <List.Icon {...props} icon={"account-edit"} size={20} />
                )}
                onPress={
                  this.state.loading
                    ? () => {}
                    : () => this.setState({ currentTextInputModal: key })
                }
                description={input.description}
              />
              <Divider />
            </React.Fragment>
          );
        })}
        <List.Subheader>{"Country"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            ISO_3166_COUNTRIES[this.state.address.country] == null
              ? "Select a country"
              : `${ISO_3166_COUNTRIES[this.state.address.country].emoji} ${
                  ISO_3166_COUNTRIES[this.state.address.country].name
                }`
          }
          titleStyle={{
            color:
              ISO_3166_COUNTRIES[this.state.address.country] == null
                ? Colors.verusDarkGray
                : Colors.quaternaryColor,
          }}
          right={(props) => (
            <List.Icon {...props} icon={"account-edit"} size={20} />
          )}
          onPress={
            this.state.loading
              ? () => {}
              : () => this.setState({ countryModalOpen: true })
          }
        />
        <Divider />
        <List.Subheader>{"Address Options"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Delete address"}
          titleStyle={{
            color: Colors.warningButtonColor,
          }}
          right={(props) => (
            <List.Icon {...props} icon={"close"} size={20} />
          )}
          onPress={
            this.state.loading
              ? () => {}
              : () => this.tryDeleteAddress()
          }
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
