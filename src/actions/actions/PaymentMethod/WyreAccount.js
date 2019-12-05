import DelayedAlert from '../../../utils/delayedAlert';
import { NavigationActions } from 'react-navigation';

import { WYRE_URL } from '../../../utils/constants';

import WyreService from '../../../services/wyreService';
import { putUserPaymentMethods } from '../../../utils/asyncStore/asyncStore';

import {
    selectWyrePaymentMethod,
    selectActiveAccount,
} from '../../../selectors/authentication';

import {
    createWyreAccount,
    createWyreAccountResponse,
    getWyreAccount,
    getWyreAccountResponse,
    setAccounts,
    signIntoAccount,
    putWyreAccount,
    putWyreAccountResponse,
    getWyreConfig,
    getWyreConfigResponse,
    createWyrePayment,
    createWyrePaymentResponse,
    getActiveTransaction,
    getActiveTransactionResponse,
    getTransactionHistory,
    getTransactionHistoryResponse
} from '../../actionCreators';

const getPaymentAddress = (account, currency) => {
    switch (currency) {
        case 'BTC':
            return `bitcoin:${account.depositAddresses.BTC}`;
        case 'USD':
            return `account:${account.id}`;
        default:
            return '';
    }
};

export const manageAccount = (navigation) => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        // Create account
        try {
            dispatch(createWyreAccount());

            const { data, key, error } = await WyreService.build().createAccount();

            dispatch(createWyreAccountResponse());

            if (error) return DelayedAlert('Failed creating Wyre account');

            const activeAccount = selectActiveAccount(state);

            const newActiveAccount = {
                ...activeAccount,
                paymentMethods: {
                    ...activeAccount.paymentMethods,
                    wyre: {
                        id: data.id,
                        key,
                    }
                }
            };

            const accounts = await putUserPaymentMethods(activeAccount, newActiveAccount.paymentMethods);
            if (!accounts) return DelayedAlert('Failed storing Wyre account credentials');

            dispatch(setAccounts(accounts));
            dispatch(signIntoAccount(newActiveAccount));
        } catch (error) {
            dispatch(createWyreAccountResponse());
            return DelayedAlert('Failed creating Wyre account');
        }
    }
    // Navigate to manage screen
    return navigation.navigate('ManageWyreAccount');
};

export const getAccount = () => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        DelayedAlert('No Payment Account');
        return;
    }
    dispatch(getWyreAccount());
    try {
        const { data, error } = await WyreService.build()
            .getAccount(paymentMethod.id, paymentMethod.key);

        dispatch(getWyreAccountResponse(data));

        if (error) DelayedAlert('Failed fetching Wyre account');
    } catch (error) {
        dispatch(getWyreAccountResponse());
        DelayedAlert('Failed fetching Wyre account');
    }
};

export const putWyreAccountField = (params, navigation) => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        return DelayedAlert('No Payment Account');
    }
    dispatch(putWyreAccount());
    try {
        const { data, error } = await WyreService.build()
            .putAccount(paymentMethod.id, paymentMethod.key, {
                profileFields: params,
            });

        dispatch(putWyreAccountResponse(data));
        if (error) return DelayedAlert('Failed updating Wyre account', error);
    } catch (error) {
        dispatch(putWyreAccountResponse(null));
        return DelayedAlert('Failed updating Wyre account', error);
    }

    return navigation.dispatch(NavigationActions.back());
};

export const uploadWyreAccountDocument = (field, uri, type, onSuccess) => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        return DelayedAlert('No Payment Account');
    }
    dispatch(putWyreAccount());
    try {
        const { data, error } = await WyreService.build()
            .uploadDocument(paymentMethod.id, paymentMethod.key, field, uri, type);

        dispatch(putWyreAccountResponse(data));

        if (error) return DelayedAlert('Failed uploading Wyre document', error);
    } catch (error) {
        dispatch(putWyreAccountResponse());
        return DelayedAlert('Failed uploading Wyre document');
    }
    return onSuccess();
};

export const getConfig = () => async(dispatch) => {
    dispatch(getWyreConfig());
    try {
        const response = await fetch(`${WYRE_URL}/v2/client/config/plaid`);

        if (response.ok) {
            const config = await response.json();
            dispatch(getWyreConfigResponse(config));
        } else {
            DelayedAlert('Failed fetching Wyre payment method configuration');
        }
    } catch (error) {
        dispatch(getWyreConfigResponse());
        DelayedAlert('Failed fetching Wyre payment method configuration');
    }
};

export const createWyreAccountPaymentMethod = (token, navigation) => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        DelayedAlert('No Payment Account');
        return;
    }

    dispatch(putWyreAccount());
    try {
        const { error } = await WyreService.build()
            .createPaymentMethod(paymentMethod.key, token);

        if (error) DelayedAlert('Failed creating Wyre payment method', error);
    } catch (error) {
        DelayedAlert('Failed creating Wyre payment method');
    }
    dispatch(putWyreAccountResponse({}));
    navigation.dispatch(NavigationActions.back());
};

export const sendTransaction = (_, fromCurr, fromVal, toCurr, navigation) => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        DelayedAlert('No Payment Account');
        return;
    }

    dispatch(createWyrePayment());
    try {
        const paymentMethods = await WyreService.build()
            .getPaymentMethods(paymentMethod.key);

        if (paymentMethods.error || !paymentMethods.data.length) {
            DelayedAlert('Cannot fetch Payment Method');
            dispatch(createWyrePaymentResponse());
            return;
        }

        const account = await WyreService.build()
            .getAccount(paymentMethod.id, paymentMethod.key);

        if (account.error) {
            DelayedAlert('Cannot fetch Payment Account');
            dispatch(createWyrePaymentResponse());
            return;
        }

        const { error } = await WyreService.build()
            .createTransfer(
                paymentMethod.key,
                `${paymentMethods.data[0].srn}:ach`,
                fromCurr,
                fromVal,
                getPaymentAddress(account.data, toCurr),
                toCurr
            );

        dispatch(createWyrePaymentResponse());

        if (error) {
            DelayedAlert('Failed to create Wyre Transfer', error);
            return;
        }

        DelayedAlert('Payment Success');
        navigation.dispatch(NavigationActions.back());
    } catch (error) {
        dispatch(createWyrePaymentResponse());
        DelayedAlert('Failed to create Wyre Transfer');
    }
};

export const getExchangeRates = () => async(dispatch) => {
    dispatch(getActiveTransaction());
    try {
        const { data, error} = await WyreService.build().getRates();
        if (!error) {
            dispatch(getActiveTransactionResponse(data));
        } else {
            DelayedAlert('Failed fetching Exchange rates');
        }
    } catch (error) {
        dispatch(getActiveTransactionResponse());
        DelayedAlert('Failed fetching  Exchange rates');
    }
};

export const getTransactions = () => async(dispatch, getState) => {
    const state = getState();
    const paymentMethod = selectWyrePaymentMethod(state);
    if (!paymentMethod) {
        DelayedAlert('No Payment Account');
        return;
    }
    dispatch(getTransactionHistory());
    try {
        const { data, error} = await WyreService.build().getTransactions(paymentMethod.key)
        if (!error){
            dispatch(getTransactionHistoryResponse(data));
        } else {
            DelayedAlert('Failed fetching transactions history')
        }
    } catch (error) {
        dispatch(getTransactionHistoryResponse());
        DelayedAlert('Failed fetching transactions history');
    }
}

export default manageAccount;