import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { setServiceLoading } from "../../../../actions/actionCreators";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { PBAAS_PRECONVERT_SERVICE_ID } from "../../../../utils/constants/services";
import { PbaasPreconvertServiceRender } from "./PbaasPreconvertService.render";
import { listCurrencies } from "../../../../utils/api/channels/vrpc/requests/listCurrencies";
import { getInfo } from "../../../../utils/api/channels/vrpc/callCreators";
import BigNumber from "bignumber.js";
import { coinsList } from "../../../../utils/CoinData/CoinsList";

const PbaasPreconvertService = (props) => {
  const [currenciesInPreconvert, setCurrenciesInPreconvert] = useState(null);
  const loading = useSelector(state => state.services.loading[PBAAS_PRECONVERT_SERVICE_ID]);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const dispatch = useDispatch();

  props.navigation.setOptions({ title: 'Preconvert' });

  const getCurrenciesInPreconvert = async () => {
    dispatch(setServiceLoading(true, PBAAS_PRECONVERT_SERVICE_ID));

    try {
      const isTestnet = Object.keys(activeAccount.testnetOverrides).length > 0;
      const systemId = isTestnet ? coinsList.VRSCTEST.system_id : coinsList.VRSC.system_id;
      const allImportedCurrencies = await listCurrencies(systemId, "imported");
      const allLocalCurrencies = await listCurrencies(systemId, "local");
      const allPbaasCurrencies = await listCurrencies(systemId, "pbaas");

      const chainInfo = await getInfo(systemId);
      
      if (
        allImportedCurrencies.error ||
        allLocalCurrencies.error ||
        allPbaasCurrencies.error || 
        chainInfo.error
      )
        throw new Error('Error fetching currencies');

      const longestChain = BigNumber(chainInfo.result.longestchain);
      const preconvertCurrenciesMap = new Map();
      const allCurrencies = [...allImportedCurrencies.result, ...allLocalCurrencies.result, ...allPbaasCurrencies.result];

      for (const currency of allCurrencies) {
        const blocksLeft = BigNumber(currency.currencydefinition.startblock).minus(longestChain);
        const inPreconvert = blocksLeft.isGreaterThan(BigNumber(0));

        if (inPreconvert && !preconvertCurrenciesMap.has(currency.currencydefinition.currencyid)) {
          preconvertCurrenciesMap.set(currency.currencydefinition.currencyid, {...currency, blocks_left: blocksLeft.toNumber()})
        }
      }
      
      setCurrenciesInPreconvert(Array.from(preconvertCurrenciesMap.values()))
    } catch (e) {
      createAlert('Error Loading Linked VerusIDs', e.message);
    }

    dispatch(setServiceLoading(false, PBAAS_PRECONVERT_SERVICE_ID));
  };

  useEffect(() => {
    getCurrenciesInPreconvert()
  }, [])

  return PbaasPreconvertServiceRender({
    navigation: props.navigation,
    loading,
    currenciesInPreconvert,
    refreshCurrenciesInPreconvert: getCurrenciesInPreconvert,
  });
}

export default PbaasPreconvertService;