import {useEffect, useState} from 'react';
import {closeSendModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import { UpdateIdentityResultRender } from './UpdateIdentityResult.render';
import { SEND_MODAL_IDENTITY_UPDATE_COMPLETE, SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX } from '../../../../utils/constants/sendModal';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { explorers } from '../../../../utils/CoinData/CoinData';
import { openUrl } from '../../../../utils/linking';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';

const UpdateIdentityResult = (props) => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const {data, subWallet} = sendModal;
  const [targetId, setTargetId] = useState(props.route.params == null ? {} : props.route.params.identity);
  const [txid, setTxid] = useState(props.route.params.txid);
  const [networkObj, setNetworkObj] = useState(null);

  useEffect(() => {
    try {
      const [channelName, address, systemId] = subWallet.channel.split('.');

      const systemObj = CoinDirectory.findSystemCoinObj(systemId);
      setNetworkObj(systemObj);
    } catch(e) {}
  }, []);

  const finishSend = async () => {
    await props.updateSendFormData(
      SEND_MODAL_IDENTITY_UPDATE_COMPLETE,
      true,
    );
    closeSendModal()
  };

  const openExplorer = () => {
    const url = `${explorers[networkObj.id]}/tx/${txid}`;

    openUrl(url);
  };

  return UpdateIdentityResultRender({
    targetId,
    networkObj,
    finishSend,
    txid,
    openExplorer
  });
};

export default UpdateIdentityResult;
