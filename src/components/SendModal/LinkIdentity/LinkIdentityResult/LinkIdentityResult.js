import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {LinkIdentityResultRender} from './LinkIdentityResult.render';

const LinkIdentityResult = (props) => {
  const [verusId, setVerusId] = useState(props.route.params == null ? {} : props.route.params.verusId);
  const [friendlyNames, setFriendlyNames] = useState(props.route.params == null ? {} : props.route.params.friendlyNames);
  const sendModal = useSelector(state => state.sendModal);
  const {data} = sendModal;

  const finishSend = async () => {
    if (data.noLogin) {
      await props.updateSendFormData(
        "success",
        true,
      );
    }
    closeSendModal()
  };

  return LinkIdentityResultRender({
    verusId,
    friendlyNames,
    finishSend
  });
};

export default LinkIdentityResult;
