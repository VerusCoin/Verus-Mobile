import axios from 'axios';
import crypto from 'crypto';
import RNFetchBlob from 'rn-fetch-blob';

import { WYRE_URL, WYRE_REFERRER_ACCOUNT_ID } from '../utils/constants';

const parseError = (error) => (
  error.response ? error.response.data.message : error.toString()
)

class WyreService {
  constructor(url, service) {
    this.url = url;
    this.service = service;
  }

  static build() {
    const service = axios.create({
      baseURL: WYRE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return new WyreService(WYRE_URL, service);
  }

  setHeader = (name, value) => {
    this.service.defaults.headers.common[name] = value;
  }

  setAuthorizationHeader = (token) => {
    this.setHeader('Authorization', `Bearer ${token}`);
  }

  submitAuthToken = async (secretKey) => (
    this.service.post(
      `${this.url}/v2/sessions/auth/key`,
      { secretKey },
    )
  )
  
  createAccount = async (key) => {
    try {
      const wyreAccount = {
        type: 'INDIVIDUAL',
        country: 'US',
        subaccount: false,
        referrerAccountId: WYRE_REFERRER_ACCOUNT_ID,
      };
      this.setAuthorizationHeader(key);
      const { data } = await this.service.post(`${this.url}/v3/accounts`, wyreAccount);
      return {
        data,
        key: key,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }

  getAccount = async (id, key) => {
    try {
      this.setAuthorizationHeader(key);
      const { data } = await this.service.get(`/v3/accounts/${id}`);
      return {
        data,
        error: data.errorCode,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }

  putAccount = async (id, key, updateObj) => {
    try {
      this.setAuthorizationHeader(key);
      const { data } = await this.service.post(`/v3/accounts/${id}`, updateObj);
      return {
        data,
        error: data.errorCode,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }

  uploadDocument = async (id, key, field, uri, type) => {
    try {
      let { data } = await RNFetchBlob.fetch('POST', `${WYRE_URL}/v3/accounts/${id}/${field}`, {
        Authorization: `Bearer ${key}`,
        'Content-Type': type,
      }, RNFetchBlob.wrap(uri));

      if (data !== '') {
        data = JSON.parse(data);
      } else {
        data = {};
      }

      return {
        data,
        error: data.errorCode,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }

  createPaymentMethod = async (key, publicToken) => {
    try {
      this.setAuthorizationHeader(key);
      const paymentMethod = {
        publicToken,
        paymentMethodType: 'LOCAL_TRANSFER',
        country: 'US',
      };

      const { data } = await this.service.post('/v2/paymentMethods', paymentMethod);
      return {
        data,
        error: data.errorCode,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }

  getPaymentMethods = async (key) => {
    try {
      this.setAuthorizationHeader(key);
      const { data } = await this.service.get('/v2/paymentMethods');
      return {
        data: data && data.data,
        error: data.errorCode,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }

  createTransfer = async (key, source, fromCurr, fromVal, dest, toCurr) => {
    try {
      this.setAuthorizationHeader(key);
      const transfer = {
        source,
        sourceCurrency: fromCurr,
        sourceAmount: fromVal,
        dest,
        destCurrency: toCurr,
        autoConfirm: true
      };

      const { data } = await this.service.post('/v3/transfers', transfer);
      return {
        data,
        error: data.errorCode,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error),
      };
    }
  }
  getRates = async () => {
    try {
      const data = await this.service.get(`${this.url}/v3/rates`)
      return {
        data: data,
        error: false,
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error)
      };
    }
  }
  getTransactions = async (key) => {
    try {
      this.setAuthorizationHeader(key);
      const { data } = await this.service.get(`${this.url}/v3/transfers`)
      return {
        data: data,
        error: false, 
      };
    } catch (error) {
      return {
        data: null,
        error: parseError(error)
      };
    }
  }
}


export default WyreService;
