import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List } from "react-native-paper";
import Styles from "../../../../styles";
import Colors from "../../../../globals/colors";
import { ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_HOMEADDRESS_STREET1, IDENTITYDATA_HOMEADDRESS_STREET2, IDENTITYDATA_HOMEADDRESS_CITY, IDENTITYDATA_HOMEADDRESS_REGION, IDENTITYDATA_HOMEADDRESS_POSTCODE, IDENTITYDATA_HOMEADDRESS_COUNTRY } = primitives;

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
                      address[IDENTITYDATA_HOMEADDRESS_STREET1.vdxfid]?.length > 0
                        ? `${address[IDENTITYDATA_HOMEADDRESS_STREET1.vdxfid]}${
                            address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid] != null && address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid].length > 0
                              ? `, ${address[IDENTITYDATA_HOMEADDRESS_STREET2.vdxfid]}`
                              : ""
                          }`
                        : "Empty address"
                    }
                    description={`${
                      address[IDENTITYDATA_HOMEADDRESS_POSTCODE.vdxfid]?.length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_POSTCODE.vdxfid]} ` : ""
                    }${
                      address[IDENTITYDATA_HOMEADDRESS_REGION.vdxfid]?.length > 0
                        ? `${address[IDENTITYDATA_HOMEADDRESS_REGION.vdxfid]}, `
                        : ""
                    }${address[IDENTITYDATA_HOMEADDRESS_CITY.vdxfid]?.length > 0 ? `${address[IDENTITYDATA_HOMEADDRESS_CITY.vdxfid]}, ` : "Unknown City, "}${
                      ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]] != null
                        ? `${ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]].emoji} ${
                            ISO_3166_COUNTRIES[address[IDENTITYDATA_HOMEADDRESS_COUNTRY.vdxfid]].name
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
