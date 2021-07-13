import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List } from "react-native-paper";
import Styles from "../../../../styles";
import Colors from "../../../../globals/colors";
import { ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";

export const PersonalPaymentMethodsEditBankAccountAddressRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        {this.state.locations.physical_addresses == null ||
        this.state.locations.physical_addresses.length == 0 ? null : (
          <React.Fragment>
            <List.Subheader>{"Select address"}</List.Subheader>
            <Divider />
            {this.state.locations.physical_addresses.map((address, index) => {
              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={
                      address.street1.length > 0
                        ? `${address.street1}${
                            address.street2.length > 0
                              ? `, ${address.street2}`
                              : ""
                          }`
                        : "Empty address"
                    }
                    description={`${
                      address.postal_code.length > 0
                        ? `${address.postal_code} `
                        : ""
                    }${
                      address.state_province_region.length > 0
                        ? `${address.state_province_region}, `
                        : ""
                    }${
                      address.city.length > 0
                        ? `${address.city}, `
                        : "Unknown City, "
                    }${
                      ISO_3166_COUNTRIES[address.country] != null
                        ? `${ISO_3166_COUNTRIES[address.country].emoji} ${
                            ISO_3166_COUNTRIES[address.country].name
                          }`
                        : "Unknown Country"
                    }`}
                    onPress={() => this.selectAddress(address)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        )}
        <Divider />
        <List.Subheader>{"Address options"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Add address"}
          right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
          onPress={this.state.loading ? () => {} : () => this.openAddAddress()}
        />
        <Divider />
        <List.Item
          title={"Configure addresses"}
          right={(props) => (
            <List.Icon {...props} icon={"chevron-right"} size={20} />
          )}
          onPress={
            this.state.loading ? () => {} : () => this.openConfigureAddresses()
          }
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
