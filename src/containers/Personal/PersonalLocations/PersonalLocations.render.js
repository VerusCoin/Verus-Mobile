import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES } from "../../../utils/constants/iso3166";
import { renderPersonalTaxId } from "../../../utils/personal/displayUtils";
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_HOMEADDRESS_STREET1, IDENTITYDATA_HOMEADDRESS_STREET2, IDENTITYDATA_HOMEADDRESS_CITY, IDENTITYDATA_HOMEADDRESS_REGION, IDENTITYDATA_HOMEADDRESS_POSTCODE, IDENTITYDATA_HOMEADDRESS_COUNTRY } = primitives;

export const PersonalLocationsRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
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
        <List.Subheader>{"Tax countries & IDs"}</List.Subheader>
        <Divider />
        {this.state.locations.tax_countries == null
          ? null
          : this.state.locations.tax_countries.map((taxCountry, index) => {
              const nationality = ISO_3166_COUNTRIES[taxCountry.country];

              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={nationality == null ? "Unknown Country" : `${nationality.emoji} ${nationality.name}`}
                    description={
                      taxCountry.tin.length > 2
                        ? `Tax ID: ${renderPersonalTaxId(taxCountry).title}`
                        : null
                    }
                    right={(props) => (
                      <List.Icon {...props} icon={"account-edit"} size={20} />
                    )}
                    onPress={() => this.openEditTaxCountry(index)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          title={"Add tax country & Tax ID"}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditTaxCountry()}
        />
        <Divider />
        <List.Subheader>{"Addresses"}</List.Subheader>
        <Divider />
        {this.state.locations.physical_addresses == null
          ? null
          : this.state.locations.physical_addresses.map((address, index) => {
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
                    right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
                    onPress={() => this.openEditAddress(index)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          title={"Add physical address"}
          right={(props) => (
            <List.Icon {...props} icon={"chevron-right"} size={20} />
          )}
          onPress={() => this.openEditAddress()}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
