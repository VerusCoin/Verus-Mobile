import React, {Component} from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';

class DatePickerModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      date: props.initialDate,
    };
  }

  render() {
    const {onCancel, onSelect, visible} = this.props;
    const {datePickerVisible} = this.state;

    return (
      <DateTimePickerModal
        
        isVisible={visible}
        onConfirm={date => {
          const newMoment = moment(date).toObject();

          onSelect({
            day: newMoment.date,
            month: newMoment.months,
            year: newMoment.years,
          });
        }}
        onCancel={onCancel}
      />
    );
  }
}

export default DatePickerModal;
