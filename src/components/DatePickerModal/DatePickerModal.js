/*
  This component displays a modal with a date picker
*/

import React, { Component } from "react";
import SemiModal from "../SemiModal";
import { Text } from "react-native-paper"
import { View } from "react-native"
import Styles from "../../styles";
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from "moment";

class DatePickerModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      date: props.initialDate
    }
  }

  render() {
    const { visible, cancel, onSelect, title, flexHeight } = this.props;

    return (
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={() => {
          const newMoment = moment(this.state.date).toObject();

          cancel({
            day: newMoment.date,
            month: newMoment.months,
            year: newMoment.years,
          });
        }}
        flexHeight={flexHeight ? flexHeight : 3}
      >
        <View style={Styles.centerContainer}>
          <View
            style={{
              ...Styles.headerContainerSafeArea,
              minHeight: 36,
              maxHeight: 36,
              paddingBottom: 8,
            }}
          >
            <Text
              style={{
                ...Styles.centralHeader,
                ...Styles.smallMediumFont,
              }}
            >
              {title}
            </Text>
          </View>
          <View style={{ ...Styles.flex, ...Styles.fullWidthAlignCenterRowBlock }}>
            <DateTimePicker
              value={this.state.date}
              display="spinner"
              onChange={(event, date) => {
                this.setState(
                  {
                    date,
                  },
                  () => {
                    const newMoment = moment(date).toObject();
                    
                    onSelect({
                      day: newMoment.date,
                      month: newMoment.months,
                      year: newMoment.years,
                    });
                  }
                );
              }}
              style={{ width: "100%" }}
            />
          </View>
        </View>
      </SemiModal>
    );
  }
}

export default DatePickerModal;
