import axios from 'axios';
import crypto from 'crypto'
import { mnemonicToSeed } from 'bip39'
import { Platform } from 'react-native'
import RNFS from "react-native-fs"

import { WYRE_URL } from '../constants/constants';
import { WYRE_SERVICE_ID } from '../constants/services';
import { Buffer } from 'buffer'
import { mapWyreDocumentIds } from '../../actions/actions/services/dispatchers/wyre';

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
    if (this.wyreToken == null) {
      this.apiKey = apiKey;
      this.wyreToken = wyreToken;

      this.authInterceptor = this.service.interceptors.request.use(
        (config) => {
          config.url = config.url.includes("timestamp")
            ? config.url
            : config.url + `?timestamp=${Date.now()}`;

          if (config.method === "get") {
            config.headers.common["X-Api-Signature"] = WyreService.signUrlString(
              config.baseURL.replace(/\/+$/, "") + axios.getUri(config),
              wyreToken
            );
          } else {
            config.headers.common["X-Api-Signature"] = WyreService.signUrlString(
              config.data == null
                ? axios.getUri(config)
                : axios.getUri(config) + JSON.stringify(config.data),
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
  }

  deauthenticate() {
    this.wyreToken = null;
    this.apiKey = null;
    this.service.interceptors.request.eject(this.authInterceptor);
    this.authInterceptor = null;
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

  getPaymentMethod = async (id) => {
    return await WyreService.formatCall(() => {
      return this.service.get(`/v2/paymentMethod/${id}`);
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

        const { buffer } = await this.uploadFile(uri, url, format)

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

  followupPaymentMethod = async (
    paymentMethod,
    uris,
    format = "image/jpeg"
  ) => {
    return await WyreService.formatCall(async () => {
      let index = 0;
      let hashes = [];

      for (const uri of uris) {
        const url = `${this.url}/v2/paymentMethod/${paymentMethod.id}/followup?timestamp=${Date.now()}`;
        const { buffer } = await this.uploadFile(uri, url, format);
        hashes.push(crypto.createHash("sha256").update(buffer).digest().toString("hex"));

        index++;
      }

      const res = { data: await this.getPaymentMethod(paymentMethod.id) };

      const beforeDocuments = paymentMethod.documents;
      const afterDocuments = res.data.documents;

      if (beforeDocuments != null && afterDocuments != null) {
        const submittedDocumentDifference = afterDocuments
          .filter((x) => !beforeDocuments.includes(x))
          .concat(beforeDocuments.filter((x) => !afterDocuments.includes(x)));

        await mapWyreDocumentIds(paymentMethod.id, submittedDocumentDifference, uris, hashes);
      }

      return res;
    }, true);
  }

  uploadFile = async (
    uri,
    url,
    format = "image/jpeg"
  ) => {
    return await WyreService.formatCall(async () => {
      const base64 = await RNFS.readFile(uri, 'base64')
      const buffer = Buffer.from(base64, 'base64')

      const res = await axios.post(url, buffer, {
        headers: {
          "Content-Type": `${format}; charset=utf-8`,
          "X-Api-Key": this.apiKey,
          "X-Api-Signature": WyreService.signUrlBuffer(
            url,
            buffer,
            this.wyreToken
          ),
        },
      })

      // const res = await fetch(url, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": `${format}; charset=utf-8`,
      //     "X-Api-Key": this.apiKey,
      //     "X-Api-Signature": WyreService.signUrlBuffer(
      //       url,
      //       buffer,
      //       this.wyreToken
      //     ),
      //   },
      //   body: buffer,
      // });

      return { data: { buffer, res } }
    }, true);
  };

  createPaymentMethod = async (paymentMethod) => {
    return await WyreService.formatCall(() => {
      return this.service.post(`${this.url}/v2/paymentMethods`, paymentMethod);
    }, true);
  };

  deletePaymentMethod = async (paymentMethod) => {
    return await WyreService.formatCall(() => {
      return this.service.delete(`${this.url}/v2/paymentMethod/${paymentMethod.id}`);
    }, true);
  };

  listPaymentMethods = async () => {
    return await WyreService.formatCall(() => {
      return this.service.get('/v2/paymentMethods');
    }, true);
  };

  getTransferHistory = async () => {
    return await WyreService.formatCall(() => {
      return this.service.get('/v3/transfers');
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
}


export default WyreService;
