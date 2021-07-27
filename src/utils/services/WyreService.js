import axios from 'axios';
import RNFetchBlob from 'rn-fetch-blob';
import crypto from 'crypto'
import { mnemonicToSeed } from 'bip39'

import { WYRE_URL } from '../constants/constants';
import { WYRE_SERVICE_ID } from '../constants/services';

const parseError = (error) => (
  error.response ? error.response.data.message : error.toString()
)

class WyreService {
  constructor(url, service) {
    this.url = url;
    this.service = service;
    this.authInterceptor = null;
  }

  static build() {
    const service = axios.create({
      baseURL: WYRE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    return new WyreService(WYRE_URL, service);
  }

  static calculateSignature(url_body, bearer) {
    return crypto
      .createHmac("sha256", bearer)
      .update(url_body)
      .digest()
      .toString("hex");
  }

  static formatCall = async (call) => {
    try {
      const { data } = await call();
      return data
    } catch (error) {
      throw new Error(parseError(error))
    }
  };

  static bearerFromSeed = async (seed) => {
    var ripemd160 = crypto.createHash('ripemd160');
    var sha256 = crypto.createHash('sha256');

    const WYRE_SERVICE_CANONICAL = Buffer.from(WYRE_SERVICE_ID, 'utf8')

    const sha256Hash = sha256
      .update(await mnemonicToSeed(seed))
      .update(WYRE_SERVICE_CANONICAL)
      .digest();

    return (ripemd160.update(sha256Hash).digest()).toString('hex')
  }

  authenticate(wyreToken, apiKey) {
    this.service.interceptors.request.use((config) => {
      config.url = config.url + `?timestamp=${Date.now()}`

      if (config.method === 'post') {
        config.headers.common["X-Api-Signature"] = WyreService.calculateSignature(
          axios.getUri(config) + JSON.stringify(config.data),
          wyreToken
        );
      } else {
        config.headers.common["X-Api-Signature"] = WyreService.calculateSignature(
          config.baseURL.replace(/\/+$/, "") + axios.getUri(config),
          wyreToken
        );
      }
      
      config.headers.common["X-Api-Key"] = apiKey
      
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }

  deauthenticate() {
    this.service.interceptors.request.eject(this.authInterceptor);
  }

  submitAuthToken = async (secretKey) => {
    return await WyreService.formatCall(() => {
      return this.service.post(`${this.url}/v2/sessions/auth/key`, { secretKey });
    })
  }

  createAccount = async (wyreAccount) => {
    return await WyreService.formatCall(() => {
      return this.service.post(
        `${this.url}/v3/accounts`,
        wyreAccount
      );
    }, true)
  };

  getAccount = async (id) => {
    return await WyreService.formatCall(() => {
      return this.service.get(`/v3/accounts/${id}`);
    }, true)
  };

  putAccount = async (id, updateObj) => {
    return await WyreService.formatCall(() => {
      return this.service.post(`/v3/accounts/${id}`, updateObj);
    }, true)
  };

  // uploadDocument = async (id, field, uri, type) => {
  //   try {
  //     let { data } = await RNFetchBlob.fetch(
  //       "POST",
  //       `${WYRE_URL}/v3/accounts/${id}/${field}`,
  //       {
  //         Authorization: `Bearer ${key}`,
  //         "Content-Type": type,
  //       },
  //       RNFetchBlob.wrap(uri)
  //     );

  //     if (data !== "") {
  //       data = JSON.parse(data);
  //     } else {
  //       data = {};
  //     }

  //     return {
  //       data,
  //       error: data.errorCode,
  //     };
  //   } catch (error) {
  //     return {
  //       data: null,
  //       error: parseError(error),
  //     };
  //   }
  // };

  createPaymentMethod = async (publicToken) => {
    return await WyreService.formatCall(() => {
      const paymentMethod = {
        publicToken,
        paymentMethodType: "LOCAL_TRANSFER",
        country: "US",
      };

      return this.service.post(
        "/v2/paymentMethods",
        paymentMethod
      );
    }, true)
  };

  getPaymentMethods = async () => {
    return await WyreService.formatCall(() => {
      return this.service.get("/v2/paymentMethods");
    }, true)
  };

  createTransfer = async (source, fromCurr, fromVal, dest, toCurr) => {
    return await WyreService.formatCall(() => {
      const transfer = {
        source,
        sourceCurrency: fromCurr,
        sourceAmount: fromVal,
        dest,
        destCurrency: toCurr,
        autoConfirm: true,
      };

      return this.service.post("/v3/transfers", transfer);
    }, true)
  };

  getRates = async () => {
    return await WyreService.formatCall(() => {
      return axios.get(`${this.url}/v3/rates`);
    })
  };

  getSupportedCountries = async () => {
    return await WyreService.formatCall(() => {
      return axios.get(`${this.url}/v3/widget/supportedCountries`);
    })
  };

  getTransactions = async () => {
    return await WyreService.formatCall(() => {
      return this.service.get(`${this.url}/v3/transfers`);
    }, true)
  };
}


export default WyreService;
