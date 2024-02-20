import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES } from "../../../utils/constants/iso3166";
import { renderPersonalTaxId } from "../../../utils/personal/displayUtils";
import Colors from "../../../globals/colors";

export const PersonalLocationsRender = function () {
  return (
    <SafeAreaView style={[Styles.defaultRoot,
      {backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor}
    ]}>
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
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
        }}
        >{"Tax countries & IDs"}</List.Subheader>
        <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.ultraLightGrey
            }}
            />
        {this.state.locations.tax_countries == null
          ? null
          : this.state.locations.tax_countries.map((taxCountry, index) => {
              const nationality = ISO_3166_COUNTRIES[taxCountry.country];

              return (
                <React.Fragment key={index}>
                  <List.Item
                  titleStyle={{
                    color:this.props.darkMode?Colors.secondaryColor:'black'  
                  }}
                    key={index}
                    title={nationality == null ? "Unknown Country" : `${nationality.emoji} ${nationality.name}`}
                    descriptionStyle={{
                      color:this.props.darkMode?Colors.ultraLightGrey:Colors.defaultGrayColor  
                    }}
                    description={
                      taxCountry.tin.length > 2
                        ? `Tax ID: ${renderPersonalTaxId(taxCountry).title}`
                        : null
                    }
                    right={(props) => (
                      <List.Icon {...props} 
                      color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
                      icon={"account-edit"} size={20} />
                    )}
                    onPress={() => this.openEditTaxCountry(index)}
                  />
                  <Divider 
                  style={{
                    backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
                  }}
                  />
                </React.Fragment>
              );
            })}
        <List.Item
        titleStyle={{
          color:this.props.darkMode?Colors.secondaryColor:'black'  
        }}
          title={"Add tax country & Tax ID"}
          right={(props) => <List.Icon {...props} 
          color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
          icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditTaxCountry()}
        />
        <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.ultraLightGrey
            }}
            />
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
        }}
        >{"Addresses"}</List.Subheader>
        <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.ultraLightGrey
            }}
            />
        {this.state.locations.physical_addresses == null
          ? null
          : this.state.locations.physical_addresses.map((address, index) => {
              return (
                <React.Fragment key={index}>
                  <List.Item
                    titleStyle={{
                      color:this.props.darkMode?Colors.secondaryColor:'black'  
                    }}
                    key={index}
                    title={
                      address.street1.length > 0
                        ? `${address.street1}${
                            address.street2 != null && address.street2.length > 0
                              ? `, ${address.street2}`
                              : ""
                          }`
                        : "Empty address"
                    }
                    description={`${
                      address.postal_code.length > 0 ? `${address.postal_code} ` : ""
                    }${
                      address.state_province_region.length > 0
                        ? `${address.state_province_region}, `
                        : ""
                    }${address.city.length > 0 ? `${address.city}, ` : "Unknown City, "}${
                      ISO_3166_COUNTRIES[address.country] != null
                        ? `${ISO_3166_COUNTRIES[address.country].emoji} ${
                            ISO_3166_COUNTRIES[address.country].name
                          }`
                        : "Unknown Country"
                    }`}
                    descriptionStyle={{
                      color:this.props.darkMode?Colors.ultraLightGrey:Colors.defaultGrayColor  
                    }}
                    right={(props) => <List.Icon 
                      {...props} 
                      color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
                      icon={"chevron-right"} size={20} />}
                    onPress={() => this.openEditAddress(index)}
                  />
                  <Divider 
                  style={{
                    backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
                  }}
                  />
                </React.Fragment>
              );
            })}
        <List.Item
        titleStyle={{
          color:this.props.darkMode?Colors.secondaryColor:'black'  
        }}
          title={"Add physical address"}
          right={(props) => (
            <List.Icon {...props} 
            color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
            icon={"chevron-right"} size={20} />
          )}
          onPress={() => this.openEditAddress()}
        />
        <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.verusDarkGray:Colors.ultraLightGrey
            }}
            />
      </ScrollView>
    </SafeAreaView>
  );
};
