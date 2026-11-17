import React from 'react';
import RevokeRecoverSubmittedResult from '../../../../containers/RevokeRecover/RevokeRecoverSubmittedResult';
import {explorers} from '../../../../utils/CoinData/CoinData';
import {identityName} from '../../../../containers/RevokeRecover/RecoveryValues';

export const RecoverIdentityResultRender = ({
  deliveryUnknown,
  finishSend,
  networkObj,
  openExplorer,
  targetId,
  txid,
  values,
}) => (
  <RevokeRecoverSubmittedResult
    deliveryUnknown={deliveryUnknown}
    action="recovery"
    values={values}
    identityName={identityName(targetId)}
    networkName={networkObj?.display_name || 'the selected blockchain'}
    onDone={finishSend}
    onViewTransaction={
      networkObj && explorers[networkObj.id] ? openExplorer : null
    }
    txid={txid}
  />
);
