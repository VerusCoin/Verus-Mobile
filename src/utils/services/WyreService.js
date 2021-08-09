import axios from 'axios';
import crypto from 'crypto'
import { mnemonicToSeed } from 'bip39'
import { Platform } from 'react-native'
import RNFS from "react-native-fs"

import { WYRE_URL } from '../constants/constants';
import { WYRE_SERVICE_ID } from '../constants/services';
import { Buffer } from 'buffer'
import { mapWyreDocumentIds } from '../../actions/actions/services/dispatchers/wyre';
import { requestServiceStoredData } from '../auth/authBox';

const parseError = (error) => (
  error.response ? error.response.data.message : error.toString()
)

class WyreService {
  constructor(url, service) {
    this.url = url;
    this.service = service;
    this.authInterceptor = null;
    this.wyreToken = null;
    this.apiKey = null;
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

  static signUrlString(url_body, bearer) {
    return crypto
      .createHmac("sha256", bearer)
      .update(url_body)
      .digest()
      .toString("hex");
  }

  static signUrlBuffer = (url, data, bearer) => {
    const urlBuffer = Buffer.from(url);
    const dataToBeSigned = Buffer.concat([urlBuffer, data]);

    return crypto
      .createHmac("sha256", bearer)
      .update(dataToBeSigned)
      .digest()
      .toString("hex");
  }

  static formatCall = async (call) => {
    try {
      const { data } = await call();
      return data;
    } catch (error) {      
      throw new Error(parseError(error));
    }
  };

  static bearerFromSeed = async (seed) => {
    var ripemd160 = crypto.createHash("ripemd160");
    var sha256 = crypto.createHash("sha256");

    const WYRE_SERVICE_CANONICAL = Buffer.from(WYRE_SERVICE_ID, "utf8");

    const sha256Hash = sha256
      .update(await mnemonicToSeed(seed))
      .update(WYRE_SERVICE_CANONICAL)
      .digest();

    return ripemd160.update(sha256Hash).digest().toString("hex");
  };

  static formatUploadUri = (uri) => {
    return Platform.OS === "android" ? uri : uri.replace("file://", "");
  };

  authenticate(wyreToken, apiKey) {
    this.apiKey = apiKey;
    this.wyreToken = wyreToken;

    this.authInterceptor = this.service.interceptors.request.use(
      (config) => {
        config.url = config.url + `?timestamp=${Date.now()}`;

        if (config.method === "post") {
          config.headers.common["X-Api-Signature"] =
            WyreService.signUrlString(
              axios.getUri(config) + JSON.stringify(config.data),
              wyreToken
            );
        } else {
          config.headers.common["X-Api-Signature"] =
            WyreService.signUrlString(
              config.baseURL.replace(/\/+$/, "") + axios.getUri(config),
              wyreToken
            );
        }

        config.headers.common["X-Api-Key"] = apiKey;

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  deauthenticate() {
    this.service.interceptors.request.eject(this.authInterceptor);
  }

  submitAuthToken = async (secretKey) => {
    return await WyreService.formatCall(() => {
      return this.service.post(`${this.url}/v2/sessions/auth/key`, {
        secretKey,
      });
    });
  };

  createAccount = async (wyreAccount) => {
    return await WyreService.formatCall(() => {
      return this.service.post(`${this.url}/v3/accounts`, wyreAccount);
    }, true);
  };

  getAccount = async (id) => {
    return await WyreService.formatCall(() => {
      return this.service.get(`/v3/accounts/${id}`);
    }, true);
  };

  updateAccount = async (id, updateObj) => {
    return await WyreService.formatCall(() => {
      return this.service.post(`${this.url}/v3/accounts/${id}`, updateObj);
    }, true);
  };

  uploadDocument = async (
    accountId,
    field,
    uris,
    documentType,
    documentSubTypes,
    format = "image/jpeg"
  ) => {
    return await WyreService.formatCall(async () => {
      let index = 0

      const accountBefore = await this.getAccount(accountId)
      let hashes = []

      for (const uri of uris) {
        const url = `${WYRE_URL}/v3/accounts/${accountId}/${field}?${
          documentType != null ? `documentType=${documentType}&` : ""
        }${
          documentSubTypes[uri] != null ? `documentSubType=${documentSubTypes[uri]}&` : ""
        }timestamp=${Date.now()}`;

        const { buffer } = await this.uploadImage(uri, url, format)

        hashes.push(
          crypto
            .createHash("sha256")
            .update(buffer)
            .digest()
            .toString("hex")
        );

        index++
      }
      
      const res = { data: await this.getAccount(accountId) } 

      const beforeDocument = accountBefore.profileFields.find(profileField => profileField.fieldId === field)
      const afterDocument = res.data.profileFields.find(profileField => profileField.fieldId === field)

      if (beforeDocument != null && afterDocument != null) {
        const submittedDocumentDifference = afterDocument.value
          .filter((x) => !beforeDocument.value.includes(x))
          .concat(beforeDocument.value.filter((x) => !afterDocument.value.includes(x)));
        
        await mapWyreDocumentIds(field, submittedDocumentDifference, uris, hashes)
      } 

      return res
    }, true);
  };

  uploadImage = async (
    uri,
    url,
    format = "image/jpeg"
  ) => {
    return await WyreService.formatCall(async () => {
      const base64 = await RNFS.readFile(uri, 'base64')
      const buffer = Buffer.from(base64, 'base64')

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": `${format}; charset=utf-8`,
          "X-Api-Key": this.apiKey,
          "X-Api-Signature": WyreService.signUrlBuffer(
            url,
            buffer,
            this.wyreToken
          ),
        },
        body: buffer,
      });

      return { data: { buffer, res } }
    }, true);
  };

  createPaymentMethod = async (publicToken) => {
    return await WyreService.formatCall(() => {
      const paymentMethod = {
        publicToken,
        paymentMethodType: "LOCAL_TRANSFER",
        country: "US",
      };

      return this.service.post("/v2/paymentMethods", paymentMethod);
    }, true);
  };

  getPaymentMethods = async () => {
    return await WyreService.formatCall(() => {
      return this.service.get("/v2/paymentMethods");
    }, true);
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
    }, true);
  };

  getRates = async () => {
    return await WyreService.formatCall(() => {
      return axios.get(`${this.url}/v3/rates`);
    });
  };

  getSupportedCountries = async () => {
    return await WyreService.formatCall(() => {
      return axios.get(`${this.url}/v3/widget/supportedCountries`);
    });
  };

  getTransactions = async () => {
    return await WyreService.formatCall(() => {
      return this.service.get(`${this.url}/v3/transfers`);
    }, true);
  };
}


export default WyreService;
