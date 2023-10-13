import {useState} from 'react';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {AddErc20TokenResultRender} from './AddErc20TokenResult.render';

const AddErc20TokenResult = (props) => {
  const [contract, setContract] = useState(props.route.params == null ? {} : props.route.params.contract);

  const finishSend = () => {
    closeSendModal()
  };

  return AddErc20TokenResultRender({
    contract,
    finishSend
  });
};

export default AddErc20TokenResult;
