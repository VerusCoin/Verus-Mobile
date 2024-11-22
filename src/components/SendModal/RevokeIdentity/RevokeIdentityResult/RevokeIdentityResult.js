import {useEffect, useState} from 'react';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import { RevokeIdentityResultRender } from './RevokeIdentityResult.render';
import { SEND_MODAL_REVOKE_RECOVER_COMPLETE, SEND_MODAL_SYSTEM_ID } from '../../../../utils/constants/sendModal';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { explorers } from '../../../../utils/CoinData/CoinData';
import { openUrl } from '../../../../utils/linking';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';

const RevokeIdentityResult = (props) => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const {data} = sendModal;
  const [targetId, setTargetId] = useState(props.route.params == null ? {} : props.route.params.targetId);
  const [txid, setTxid] = useState(props.route.params.txid);
  const [networkObj, setNetworkObj] = useState(null);

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(data[SEND_MODAL_SYSTEM_ID]);
      setNetworkObj(systemObj);
    } catch(e) {}
  }, [])

  const finishSend = async () => {
    await props.updateSendFormData(
      SEND_MODAL_REVOKE_RECOVER_COMPLETE,
      true,
    );
    closeSendModal()
  };

  const openExplorer = () => {
    const url = `${explorers[networkObj.id]}/tx/${txid}`;

    openUrl(url);
  };

  return RevokeIdentityResultRender({
    targetId,
    networkObj,
    finishSend,
    txid,
    openExplorer
  });
};

export default RevokeIdentityResult;
