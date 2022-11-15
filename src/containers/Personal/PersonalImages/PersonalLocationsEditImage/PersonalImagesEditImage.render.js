import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import {
  Divider,
  List,
  Portal,
  ActivityIndicator,
  Card,
  Title,
} from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import Colors from "../../../../globals/colors";
import { PERSONAL_DOCUMENT_OTHER, PERSONAL_IMAGE_SUBTYPE_SCHEMA, PERSONAL_IMAGE_TYPE_SCHEMA } from "../../../../utils/constants/personal";
import { getPersonalImageDisplayUri } from "../../../../utils/personal/displayUtils";

export const PersonalImagesEditImageRender = function () {
  const schema =
    this.state.image.image_type == null
      ? PERSONAL_IMAGE_TYPE_SCHEMA[PERSONAL_DOCUMENT_OTHER]
      : PERSONAL_IMAGE_TYPE_SCHEMA[this.state.image.image_type];
    
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.currentTextInputModal != null && (
            <TextInputModal
              value={this.state.image[this.state.currentTextInputModal]}
              visible={this.state.currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({
                    image: {
                      ...this.state.image,
                      [this.state.currentTextInputModal]: text,
                    },
                  });
              }}
              cancel={() => this.closeTextInputModal()}
            />
          )}
          {this.state.imageTypeModalOpen && (
            <ListSelectionModal
              title="Select an image type"
              flexHeight={3}
              visible={this.state.imageTypeModalOpen}
              onSelect={(item) => this.selectImageType(item.key)}
              data={this.imageTypeOrder.map((key) => {
                const { title, description } = PERSONAL_IMAGE_TYPE_SCHEMA[key];

                return {
                  key,
                  title,
                  description,
                };
              })}
              cancel={() => this.setState({ imageTypeModalOpen: false })}
            />
          )}
          {this.state.imageAddModalIndex != null && (
            <ListSelectionModal
              title={
                schema.images == null || this.state.imageAddModalIndex == null
                  ? "Add image"
                  : schema.images[this.state.imageAddModalIndex].addLabel
              }
              flexHeight={0.5}
              visible={this.state.imageAddModalIndex != null}
              onSelect={(item) =>
                this.addImage(item.key, this.state.imageAddModalIndex)
              }
              data={this.addImageOptionOrder.map(
                (optionKey) => this.addImageOptions[optionKey]
              )}
              cancel={() => this.setState({ imageAddModalIndex: null })}
            />
          )}
          {this.state.imageEditModalIndex != null && (
            <ListSelectionModal
              title="Edit image"
              flexHeight={0.5}
              visible={this.state.imageEditModalIndex != null}
              onSelect={(item) => this.selectImageEditOption(item.key)}
              data={this.IMAGE_EDIT_OPTIONS}
              cancel={() => this.setState({ imageEditModalIndex: null })}
            />
          )}
        </Portal>
        {Object.keys(this.listSelectionLabels).map((key, index) => {
          const input = this.listSelectionLabels[key];
          const imageType =
            this.state.image[key] == null
              ? null
              : PERSONAL_IMAGE_TYPE_SCHEMA[this.state.image[key]];

          return (
            <React.Fragment key={index}>
              <Divider />
              <List.Item
                title={imageType != null ? imageType.title : input.placeholder}
                titleStyle={{
                  color:
                    imageType != null
                      ? Colors.quaternaryColor
                      : Colors.verusDarkGray,
                }}
                right={(props) => (
                  <List.Icon {...props} icon={"account-edit"} size={20} />
                )}
                onPress={
                  this.state.loadingImage || this.state.loading
                    ? () => {}
                    : () => this.setState({ imageTypeModalOpen: true })
                }
                description={input.title}
              />
              <Divider />
            </React.Fragment>
          );
        })}
        {Object.keys(this.imageTextInputLabels).map((key, index) => {
          const input = this.imageTextInputLabels[key];

          return (
            <React.Fragment key={index}>
              <List.Item
                title={
                  this.state.image[key].length > 0
                    ? this.state.image[key]
                    : input.placeholder
                }
                titleStyle={{
                  color:
                    this.state.image[key].length > 0
                      ? Colors.quaternaryColor
                      : Colors.verusDarkGray,
                }}
                right={(props) => (
                  <List.Icon {...props} icon={"account-edit"} size={20} />
                )}
                onPress={
                  this.state.loadingImage || this.state.loading
                    ? () => {}
                    : () => this.setState({ currentTextInputModal: key })
                }
                description={input.title}
              />
              <Divider />
            </React.Fragment>
          );
        })}
        {this.subtypeLabel != null && this.imageSubtypeOrder != null && (
          <React.Fragment>
            <List.Subheader>{this.subtypeLabel}</List.Subheader>
            {this.imageSubtypeOrder.map((key, index) => {
              const option = PERSONAL_IMAGE_SUBTYPE_SCHEMA[key];

              return (
                <React.Fragment key={index}>
                  <List.Item
                    title={option.title}
                    right={(props) =>
                      this.state.image.image_subtype != key ? (
                        <List.Icon
                          {...props}
                          color={Colors.secondaryColor}
                          icon={"check"}
                          size={20}
                        />
                      ) : (
                        <List.Icon {...props} icon={"check"} size={20} />
                      )
                    }
                    onPress={
                      this.state.loadingImage || this.state.loading
                        ? () => {}
                        : () => this.selectImageSubtype(key)
                    }
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        )}
        <List.Subheader>{"Images"}</List.Subheader>
        <Divider />
        {(this.state.loadingImage ||
          schema.images == null ||
          this.state.image.uris.length < schema.images.length) && (
          <List.Item
            title={
              this.state.loadingImage
                ? "Loading..."
                : schema.images == null
                ? "Add image"
                : schema.images[this.state.image.uris.length].addLabel
            }
            right={(props) => {
              return this.state.loadingImage ? (
                <ActivityIndicator
                  animating={true}
                  color={Colors.primaryColor}
                  style={{
                    marginRight: 8,
                  }}
                />
              ) : (
                <List.Icon {...props} icon={"plus"} size={20} />
              );
            }}
            onPress={
              this.state.loadingImage || this.state.loading
                ? () => {}
                : () =>
                    this.setState({
                      imageAddModalIndex: this.state.image.uris.length,
                    })
            }
          />
        )}
        {this.state.image.uris.map((uri, index, uris) => {
          const docUri = getPersonalImageDisplayUri(uri)

          return (
            <Card
              onPress={
                this.state.loadingImage || this.state.loading
                  ? () => {}
                  : () => this.setState({ imageEditModalIndex: index })
              }
              style={{
                borderRadius: 0,
                backgroundColor: Colors.secondaryColor,
                marginHorizontal: 8,
                marginTop: index == 0 ? 8 : 4,
                marginBottom: index == uris.length - 1 ? 8 : 4,
              }}
              key={index}
            >
              <Card.Cover
                source={{ uri: docUri }}
                style={{
                  borderRadius: 0,
                }}
              />
              <Card.Content
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Title style={{ marginTop: 16, padding: 0 }}>
                  {schema.images == null
                    ? `Image ${index + 1}`
                    : schema.images[index].title}
                </Title>
              </Card.Content>
            </Card>
          );
        })}
        <Divider />
        <List.Subheader>{"Options"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Delete image"}
          titleStyle={{
            color: Colors.warningButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"close"} size={20} />}
          onPress={this.state.loading ? () => {} : () => this.tryDeleteImage()}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
