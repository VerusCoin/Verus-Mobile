/*
  This component displays a modal with a text input to enter number values
*/

import React, {Component} from 'react';
import SemiModal from '../SemiModal';
import {List, Text} from 'react-native-paper';
import {TouchableOpacity, FlatList, View} from 'react-native';
import Styles from '../../styles';
import Colors from '../../globals/colors';
import {connect} from 'react-redux';

class ListSelectionModal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      visible,
      cancel,
      selectedKey,
      onSelect,
      data,
      title,
      flexHeight,
      darkMode,
    } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={cancel}
        flexHeight={flexHeight ? flexHeight : 3}>
        <View style={Styles.centerContainer}>
          <View
            style={{
              ...Styles.headerContainerSafeArea,
              minHeight: 36,
              maxHeight: 36,
              paddingBottom: 8,
              backgroundColor: darkMode ? Colors.darkModeColor : '',
            }}>
            <Text
              style={{
                ...Styles.centralHeader,
                ...Styles.smallMediumFont,
                color: darkMode ? Colors.secondaryColor : 'black',
              }}>
              {title}
            </Text>
          </View>
          <FlatList
            style={Styles.fullWidth}
            renderItem={({item}) => {
              return (
                <TouchableOpacity onPress={onSelect != null ? () => {
                  onSelect(item)
                  cancel()
                } : undefined}>
                  <List.Item
                    titleStyle={{color: darkMode ? Colors.secondaryColor : 'black'}}
                    descriptionStyle={{
                      color: darkMode ? Colors.secondaryColor : Colors.defaultGrayColor,
                    }}
                    title={item.title}
                    description={item.description}
                    right={
                      item.key === selectedKey
                        ? props => (
                            <List.Icon
                              {...props}
                              color={
                                this.props.darkMode
                                  ? Colors.secondaryColor
                                  : Colors.defaultGrayColor
                              }
                              icon={'check'}
                            />
                          )
                        : props => (
                            <List.Icon
                              {...props}
                              color={
                                this.props.darkMode
                                  ? Colors.darkModeColor
                                  : Colors.secondaryColor
                              }
                              icon={'check'}
                            />
                          )
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

const mapStateToProps = state => {
  return {
    darkMode: state.settings.darkModeState,
  };
};

export default connect(mapStateToProps)(ListSelectionModal);
