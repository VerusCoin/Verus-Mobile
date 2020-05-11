import {
  all, takeLatest, call, put, select,
} from 'redux-saga/effects';


import VerusZkedidUtils from 'node-jest-testing-boilerplate';

import selectTransactions from '../selectors/transactions';

import { SET_TRANSACTIONS } from '../utils/constants/storeType';

const crypto = require('react-native-crypto');

export default function * transactionsSaga() {
  yield all([
    takeLatest(SET_TRANSACTIONS, handleGetMemosFromTransactions),
  ]);
}

// const trans = {
//   address: 'ztestsapling1lu6p9xr0u8cdv6w2dn9p5gjzsvpuupx65p94drwl07gfv83jqq6c3kqgl9ac4ealf6nkwxlwzt0',
//   amount: 0.001,
//   height: 908793,
//   memo: 'OTU0NGZiYTViZmU1Mzg2MjgyOTRkYzNmMzZhNGEyY2I2NzA2MWEwNjAwMDAwMDAwMDAwMDAwMDJlZjE3OWY5OGNiNjQ0ZDk1MDE3Y2RlYmNkZjFkYmIzYzhiYTA1OTdhMDAyYmQ0NGNhZTNkMzU2ZjYwZGNmNDg5YjFkZjg0MzY1ODA4M2VlMTc5YTQwMDAwMDAwMDAwMDk3NDY1NzM3NDVmNjQ2MTc0NjEwMDA2NmU2MTdhNjk2NjQwZmJkZmI0ZTdhZDg1ODYyNTRmMmIwNDdkZGY5YTk2YTBjODZkMTZmYTAwMzNkNDRjYWUzZDM1NmY2MGRjZjQ4OWIxZGY4NDM2NTgwODNlZTE3OWE0MDAwMDAwMDAwMDA5NzQ2NTczNzQ1ZjY0NjE3NDYxMDAwNjZlNjE3YTY5NjY0MDAwMDY3NjY1NzI3NTczNDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
//   status: 'confirmed',
//   timestamp: 1588950349,
//   txid: '44068a078a452b2058ef04c4d79599540b3d8e97416ecd47b86ff951d2cd0f64',
//   type: 'sent',
// };


function * handleGetMemosFromTransactions() {
  const transactions = yield select(selectTransactions);
  const mockMemo = VerusZkedidUtils.StructuredMemo.writeMemo([VerusZkedidUtils.PresetObjects.Claim.create('covid19.health.claim:vrsc', 'test_data')]);
  // const mockMemo = '9544fba5bfe538628294dc3f36a4a2cb67061a060000000000000002ef179f98cb644d95017cdebcdf1dbb3c8ba0597a002bd44cae3d356f60dcf489b1df843658083ee179a4000000000009746573745f6461746100066e617a696640fbdfb4e7ad8586254f2b047ddf9a96a0c86d16fa0033d44cae3d356f60dcf489b1df843658083ee179a4000000000009746573745f6461746100066e617a6966400006766572757340';
  const memoObj = VerusZkedidUtils.StructuredMemo.readMemo(mockMemo);
  console.log(memoObj);
  // const memosFromTransactions = transactions.transactions.private?.map((transaction) => transaction.address && VerusZkedidUtils.StructuredMemo.readMemo(transaction.memo));
  // console.log(memosFromTransactions, 'memo from trans')
  const sha256 = crypto.createHash('sha256');
  if (memoObj.protocol === 'VRSC:MEMO') {
    const memoBodiesWithIds = memoObj.objects.map((object) => object);
    const memoObjects = memoBodiesWithIds.map((memoBody) => {
      const typeStrings = memoBody.type.split('.');
      const memoId = typeStrings[0];
      const memoClaimCategory = typeStrings[1];

      const sha256Hash = crypto.createHash('sha256')
        .update(memoBody.data)
        .digest('hex');

      const rmd160Hash = crypto.createHash('rmd160')
        .update(sha256Hash)
        .digest('hex');

      return ({
        [memoId]: {
          id: memoId,
          claimCategoryId: memoClaimCategory,
          data: memoBody.data,
          hash: rmd160Hash,
        },
      });
    });

    console.log('......>>>>>>>>', memoObjects, '<<<<<<.......');
  }
}
