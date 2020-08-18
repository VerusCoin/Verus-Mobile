import {
  all, takeLatest, call, put, select,
} from 'redux-saga/effects';
import { v4 as uuidv4 } from 'uuid';
import isEqual from 'lodash/isEqual';
import VerusZkedidUtils from 'node-jest-testing-boilerplate';

import { unixToDate } from '../utils/math';


import { setMemoDataFromTx } from '../actions/actionCreators/claims';
import { updateClaimsStorage, updateAttestationStorage } from './identity';
import { selectTransactions } from '../selectors/transactions';
import { getStoredBlockHeight, storeBlockHeight } from '../utils/asyncStore/transactionsStorage';
import { SET_TRANSACTIONS } from '../utils/constants/storeType';

const crypto = require('react-native-crypto');

const sha256Hash = (memoData) => crypto.createHash('sha256')
  .update(memoData)
  .digest();

const rmd160Hash = (memoData) => crypto.createHash('rmd160')
  .update(sha256Hash(memoData))
  .digest('hex');

const generateUid = (type, id, data, date) => rmd160Hash(`${type}-${id}-${data}-${date}`);

export default function * transactionsSaga() {
  yield all([
    takeLatest(SET_TRANSACTIONS, handleGetMemosFromTransactions),
  ]);
}

const hashMap = {
  strings: {
    [VerusZkedidUtils.utf8ToHash160('firstName.personal-information.claim:vrsc').toString('hex')]: 'firstName.personal-information.claim:vrsc',
    [VerusZkedidUtils.utf8ToHash160('lastName.personal-information.claim:vrsc').toString('hex')]: 'lastName.personal-information.claim:vrsc',
    [VerusZkedidUtils.utf8ToHash160('birthDate.personal-information.claim:vrsc').toString('hex')]: 'birthDate.personal-information.claim:vrsc',
    [VerusZkedidUtils.utf8ToHash160('driversLicense.composite.claim:vrsc').toString('hex')]: 'driversLicense.composite.claim:vrsc',
  },
};

function * handleGetMemosFromTransactions() {
  if (global.ENABLE_DLIGHT) {
    const transactions = yield select(selectTransactions);
    const storedBlockHeight = yield call(getStoredBlockHeight);
  
    const transactionsBlockHeights = transactions.private.map((transaction) => transaction.height);
    const currentHighestBlockHeight = Math.max(...transactionsBlockHeights);
  
    if (storedBlockHeight >= currentHighestBlockHeight) {
      return null;
    }
  
    yield call(storeBlockHeight, currentHighestBlockHeight);
  
    const memosArray = transactions.private.map((transaction) => {
      try {
        const decodeBase64 = atob(transaction.memo);
        const memoTimeStamp = transaction.timestamp;
        const memo = VerusZkedidUtils.StructuredMemo.readMemo(decodeBase64, hashMap);
        return ({ ...memo, timestamp: memoTimeStamp });
      } catch (error) {
        return null;
      }
    });
  
    const txMemos = memosArray.flatMap((memoItem) => memoItem || []);
  
    const createdMemos = txMemos.flatMap((memoBody) => {
      const date = unixToDate(memoBody.timestamp);
      const memoObjects = memoBody.objects.map((memoObject) => {
        const typeStrings = memoObject.type.split('.');
        const memoId = typeStrings[0];
        const memoClaimCategory = typeStrings[1];
        if (memoObject.id.includes('claim')) {
          return ({
            uid: generateUid('claim', memoId, memoObject.data, date),
            id: memoId,
            categoryId: `${memoObject.to}-${memoClaimCategory}`,
            data: memoObject.data,
            identity: memoObject.to,
            hash: rmd160Hash(memoObject.data),
            hidden: false,
            date,
            type: 'claim',
          });
        }
  
        return ({
          uid: generateUid('attestation', memoId, memoObject.data, date),
          id: memoId,
          identityAttested: memoObject.from,
          identity: memoObject.to,
          contentRootKey: rmd160Hash(memoObject.data),
          sigKey: '',
          data: memoObject.data,
          showOnHomeScreen: false,
          claimId: memoId,
          date,
          type: 'attestation',
        });
      });
      return memoObjects;
    });
  
    const uniqueMemos = createdMemos.reduce((acc, current) => {
      const itemExists = acc.find((item) => isEqual(item, current));
  
      if (itemExists) {
        return acc;
      }
      return acc.concat([current]);
    }, []);
  
    yield put(setMemoDataFromTx(uniqueMemos));
    yield call(updateClaimsStorage);
    yield call(updateAttestationStorage);
  }
}
