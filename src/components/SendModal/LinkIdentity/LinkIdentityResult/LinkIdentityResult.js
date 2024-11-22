import {useEffect, useState} from 'react';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {LinkIdentityResultRender} from './LinkIdentityResult.render';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';

const LinkIdentityResult = (props) => {
  const [verusId, setVerusId] = useState(props.route.params == null ? {} : props.route.params.verusId);
  const [friendlyNames, setFriendlyNames] = useState(props.route.params == null ? {} : props.route.params.friendlyNames);
  const sendModal = useObjectSelector(state => state.sendModal);
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
