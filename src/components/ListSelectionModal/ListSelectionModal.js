/*
  This component displays a modal with a text input to enter number values
*/

import React, { Component } from "react";
import SemiModal from "../SemiModal";
import { List, Text } from "react-native-paper"
import { TouchableOpacity, FlatList, View } from "react-native"
import Styles from "../../styles";
import Colors from "../../globals/colors";

class ListSelectionModal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { visible, cancel, selectedKey, onSelect, data, title, flexHeight } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={cancel}
        flexHeight={flexHeight ? flexHeight : 3}
      >
        <View style={Styles.centerContainer}>
          <View style={{ ...Styles.headerContainerSafeArea, minHeight: 36, maxHeight: 36, paddingBottom: 8 }}>
              <Text
                style={{
                  ...Styles.centralHeader,
                  ...Styles.smallMediumFont
                }}
              >
                {title}
              </Text>
          </View>
          <FlatList
            style={Styles.fullWidth}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity onPress={() => {
                  onSelect(item)
                  cancel()
                }}>
                  <List.Item
                    title={item.title}
                    description={item.description}
                    right={
                      item.key === selectedKey
                        ? (props) => <List.Icon {...props} icon={"check"} />
                        : (props) => <List.Icon {...props} color={Colors.secondaryColor} icon={"check"} />
                    }
                  />
                </TouchableOpacity>
              );
            }}
            data={data}
          />
        </View>
      </SemiModal>
    );
  }
}

export default ListSelectionModal;
