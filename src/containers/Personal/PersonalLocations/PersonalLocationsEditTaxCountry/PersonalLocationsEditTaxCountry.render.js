import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import { ISO_3166_COUNTRIES, ISO_3166_ALPHA_2_CODES } from "../../../../utils/constants/iso3166";
import Colors from "../../../../globals/colors";

export const PersonalLocationsEditTaxCountryRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.currentTextInputModal != null && (
            <TextInputModal
              value={this.state.taxCountry[this.state.currentTextInputModal]}
              visible={this.state.currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({
                    taxCountry: {
                      ...this.state.taxCountry,
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
        <List.Subheader>{"Country"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            ISO_3166_COUNTRIES[this.state.taxCountry.country] == null
              ? "Select a country"
              : `${ISO_3166_COUNTRIES[this.state.taxCountry.country].emoji} ${
                  ISO_3166_COUNTRIES[this.state.taxCountry.country].name
                }`
          }
          titleStyle={{
            color:
              ISO_3166_COUNTRIES[this.state.taxCountry.country] == null
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
        {Object.keys(this.textInputLabels).map((key, index) => {
          const input = this.textInputLabels[key];

          return (
            <React.Fragment key={index}>
              <List.Subheader>{input.title}</List.Subheader>
              <Divider />
              <List.Item
                title={
                  this.state.taxCountry[key].length > 0
                    ? this.state.taxCountry[key]
                    : input.placeholder
                }
                titleStyle={{
                  color:
                    this.state.taxCountry[key].length > 0
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
        <List.Subheader>{"Tax Country Options"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Delete tax country"}
          titleStyle={{
            color: Colors.warningButtonColor,
          }}
          right={(props) => (
            <List.Icon {...props} icon={"close"} size={20} />
          )}
          onPress={
            this.state.loading
              ? () => {}
              : () => this.tryDeleteTaxCountry()
          }
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
