import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Avatar} from "react-native-paper";
import Styles from "../../../styles";
import {
  PERSONAL_IMAGES_DOCUMENTS,
  PERSONAL_IMAGE_TYPE_SCHEMA,
  PERSONAL_IMAGE_SUBTYPE_SCHEMA,
} from "../../../utils/constants/personal";
import { renderPersonalDocument } from "../../../utils/personal/displayUtils";
import Colors from "../../../globals/colors";

export const PersonalImagesRender = function () {
  return (
    <SafeAreaView style={[Styles.defaultRoot,
    {
      backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
    }
    ]}>
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader
        style={{
          color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
        }}
        >{"Documents"}</List.Subheader>
        <Divider 
        style={{
          backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraLightGrey
        }}
        />
        {this.state.images.documents == null
          ? null
          : this.state.images.documents.map((image, index) => {
              const documentRender = renderPersonalDocument(image)

              return (
                <React.Fragment key={index}>
                  <List.Item
                   titleStyle={{
                    color:this.props.darkMode?Colors.secondaryColor:'black'
                   }}
                    key={index}
                    title={documentRender.title}
                    description={documentRender.description}
                    descriptionStyle={{
                      color:this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor
                    }}
                    right={(props) => (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <List.Icon {...props} 
                        color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
                        icon={"chevron-right"} size={20} />
                      </View>
                    )}
                    onPress={() =>
                      this.openEditImage(PERSONAL_IMAGES_DOCUMENTS, index)
                    }
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
        titleStyle={{
          color:this.props.darkMode?Colors.secondaryColor:'black'
         }}
          title={"Add document"}
          right={(props) => <List.Icon {...props} 
          color={this.props.darkMode?Colors.verusDarkGray:Colors.defaultGrayColor}
          icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditImage(PERSONAL_IMAGES_DOCUMENTS)}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
