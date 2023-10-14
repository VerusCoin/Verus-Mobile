import React from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Avatar } from "react-native-paper";
import Styles from "../../../styles";
import {
  PERSONAL_IMAGES_DOCUMENTS,
  PERSONAL_IMAGE_TYPE_SCHEMA,
  PERSONAL_IMAGE_SUBTYPE_SCHEMA,
} from "../../../utils/constants/personal";
import { renderPersonalDocument } from "../../../utils/personal/displayUtils";

export const PersonalImagesRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader>{"Documents"}</List.Subheader>
        <Divider />
        {this.state.images.documents == null
          ? null
          : this.state.images.documents.map((image, index) => {
              const documentRender = renderPersonalDocument(image)

              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={documentRender.title}
                    description={documentRender.description}
                    right={(props) => (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <List.Icon {...props} icon={"chevron-right"} size={20} />
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
          title={"Add document"}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditImage(PERSONAL_IMAGES_DOCUMENTS)}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
