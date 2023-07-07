import {useState} from 'react';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {AddPbaasCurrencyResultRender} from './AddPbaasCurrencyResult.render';

const AddPbaasCurrencyResult = (props) => {
  const [currency, setVerusId] = useState(props.route.params == null ? {} : props.route.params.currency);
  const [friendlyNames, setFriendlyNames] = useState(props.route.params == null ? {} : props.route.params.friendlyNames);

  const finishSend = () => {
    closeSendModal()
  };

  return AddPbaasCurrencyResultRender({
    currency,
    friendlyNames,
    finishSend
  });
};

export default AddPbaasCurrencyResult;
