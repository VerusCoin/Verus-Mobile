import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import DatePickerModal from "../../../components/DatePickerModal/DatePickerModal";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES, ISO_3166_ALPHA_2_CODES } from "../../../utils/constants/iso3166";
import { PERSONAL_NATIONALITIES } from "../../../utils/constants/personal";
import { renderPersonalBirthday, renderPersonalFullName } from "../../../utils/personal/displayUtils";
import Colors from "../../../globals/colors";

export const PersonalAttributesRender = function () {
  return (
    <SafeAreaView style={[Styles.defaultRoot.alignContent,{
      flex:this.props.darkMode?1:0,
      backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
    }]}>
      <ScrollView style={[Styles.fullWidth,{
      backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
      }]}>
        <Portal>
          {this.state.nationalityModalOpen && (
            <ListSelectionModal
              title="Select a Nationality"
              flexHeight={3}
              visible={this.state.nationalityModalOpen}
              onSelect={(item) => this.addNationality(item.key)}
              data={ISO_3166_ALPHA_2_CODES.map((code) => {
                const item = ISO_3166_COUNTRIES[code];

                return {
                  key: code,
                  title: `${item.emoji} ${item.name}`,
                };
              })}
              cancel={() => this.setState({ nationalityModalOpen: false })}
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
          {this.state.birthdaySelectorModalOpen && (
            <DatePickerModal
              title={"Birthday"}
              flexHeight={0.5}
              visible={this.state.birthdaySelectorModalOpen}
              initialDate={
                this.state.attributes.birthday == null
                  ? new Date()
                  : this.getDateClassInstance(
                      this.state.attributes.birthday.day,
                      this.state.attributes.birthday.month,
                      this.state.attributes.birthday.year
                    )
              }
              onSelect={(date) => this.setBirthday(date)}
              onCancel={() => this.setState({
                birthdaySelectorModalOpen: false
              })}
            />
          )}
        </Portal>
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.lightGrey:Colors.verusDarkGray
        }}
        >{"Name"}</List.Subheader>
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          title={renderPersonalFullName(this.state.attributes.name).title}
          descriptionStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black'
          }}
          right={(props) => (
            <List.Icon 
            {...props} 
            color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
            icon={"chevron-right"} size={20} />
          )}
          onPress={() => this.openEditNameScreen()}
        />
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.lightGrey:Colors.verusDarkGray
        }}
        >{"Date of birth"}</List.Subheader>
        <Divider />
        {this.state.attributes.birthday != null ? (
          <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
            title={renderPersonalBirthday(this.state.attributes.birthday).title}
            right={(props) => (
              <List.Icon 
              {...props} 
              color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
              icon={"account-edit"} size={20} />
            )}
            onPress={() => this.setState({ birthdaySelectorModalOpen: true })}
          />
        ) : (
          <List.Item
            title={"Add birthday"}
            titleStyle={{
              color: this.props.darkMode ? Colors.secondaryColor : 'black',
            }}
            right={(props) => <List.Icon 
              {...props} 
              color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
              icon={"plus"} size={20} />}
            onPress={() => this.setState({ birthdaySelectorModalOpen: true })}
          />
        )}
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.lightGrey:Colors.verusDarkGray
        }}
        >{"Nationalities"}</List.Subheader>
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        {this.state.attributes.nationalities == null
          ? null
          : this.state.attributes.nationalities.map((code, index) => {
              const nationality = ISO_3166_COUNTRIES[code];

              return (
                <React.Fragment key={index}>
                  <List.Item
                  titleStyle={{
                    color: this.props.darkMode ? Colors.secondaryColor : 'black',
                  }}
                    key={index}
                    title={`${nationality.emoji} ${nationality.name}`}
                    description={`Nationality ${index + 1}`}
                    right={(props) => (
                      <List.Icon 
                      {...props} 
                      color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
                      icon={"account-edit"} size={20} />
                    )}
                    onPress={() =>
                      this.openEditPropertyModal(
                        `Nationality ${index + 1}`,
                        PERSONAL_NATIONALITIES,
                        index
                      )
                    }
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
          color: this.props.darkMode ? Colors.secondaryColor : 'black',
        }}
          title={"Add nationality"}
          right={(props) => <List.Icon 
          {...props} 
          color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
          icon={"plus"} size={20} />}
          onPress={() => this.setState({ nationalityModalOpen: true })}
        />
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
