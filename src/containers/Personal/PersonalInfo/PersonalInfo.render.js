import React from "react";
import { Text, SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Avatar, Title } from "react-native-paper";
import Styles from "../../../styles";
import { renderPersonalFullName } from "../../../utils/personal/displayUtils";
import Colors from "../../../globals/colors";

export const PersonalInfoRender = function () {
  // console.log(this.props.darkMode)
  return (
    <SafeAreaView style={[Styles.defaultRoot,
    {
      backgroundColor:this.props.darkMode? Colors.darkModeColor : Colors.secondaryColor
    }]}>
      <ScrollView style={[Styles.fullWidth,
      {
        backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
      }
      ]}>
        <View style={Styles.centerContainer}>
          <Avatar.Text
            size={96}
            label={`${this.state.attributes.name.first
              .charAt(0)
              .toUpperCase()}${this.state.attributes.name.last.charAt(0).toUpperCase()}`}
            style={{
              marginVertical: 16,
            }}
          />
          <Title
            numberOfLines={1}
            style={{ fontSize: 28, 
            marginBottom: 16, paddingVertical: 0, paddingHorizontal: 16,
            color:this.props.darkMode?Colors.secondaryColor:'black'
            }}
          >
            {renderPersonalFullName(this.state.attributes.name).title}
          </Title>
        </View>
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          title={"Personal Details"}
          descriptionStyle={{color:this.props.darkMode ? Colors.secondaryColor : Colors.defaultGrayColor}}
          description={"Name, birthday, nationalities, etc."}
          onPress={this.state.loading ? () => {} : () => this.openAttributes()}
          right={(props) => <List.Icon 
            {...props} 
            color={this.props.darkMode ? Colors.secondaryColor : Colors.verusDarkGray}
            icon={"chevron-right"} size={20} />}
        />
        <Divider
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          title={"Contact"}
          description={"Email addresses, phone numbers, etc."}
          descriptionStyle={{color:this.props.darkMode ? Colors.secondaryColor : Colors.defaultGrayColor}}
          onPress={this.state.loading ? () => {} : () => this.openContact()}
          right={(props) => <List.Icon 
            {...props} 
            color={this.props.darkMode ? Colors.secondaryColor : Colors.verusDarkGray}
            icon={"chevron-right"} size={20} />}
        />
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Item
           titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          title={"Locations"}
          descriptionStyle={{color:this.props.darkMode ? Colors.secondaryColor : Colors.defaultGrayColor}}
          description={"Physical addresses, tax countries & IDs, etc."}
          onPress={this.state.loading ? () => {} : () => this.openLocations()}
          right={(props) => <List.Icon 
          {...props} 
          color={this.props.darkMode?Colors.secondaryColor:Colors.defaultGrayColor}
          icon={"chevron-right"} size={20} />}
        />
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Item
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          title={"Banking Information"}
          descriptionStyle={{color:this.props.darkMode ? Colors.secondaryColor : Colors.defaultGrayColor}}
          description={"Bank accounts"}
          onPress={this.state.loading ? () => {} : () => this.openPaymentMethods()}
          right={(props) => <List.Icon 
          {...props}
          color={this.props.darkMode?Colors.secondaryColor:Colors.defaultGrayColor} 
          icon={"chevron-right"} size={20} />}
        />
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        <List.Item
          title={"Documents & Images"}
          titleStyle={{
            color: this.props.darkMode ? Colors.secondaryColor : 'black',
          }}
          description={"Proof of identity, proof of address, etc."}
          descriptionStyle={{color:this.props.darkMode ? Colors.secondaryColor : Colors.defaultGrayColor}}
          onPress={this.state.loading ? () => {} : () => this.openImages()}
          right={(props) => <List.Icon 
            {...props} 
            color={this.props.darkMode?Colors.secondaryColor:Colors.defaultGrayColor}
            icon={"chevron-right"} size={20} />}
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
