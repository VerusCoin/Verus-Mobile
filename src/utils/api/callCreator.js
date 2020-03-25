import {
  token,
  agamaPort,
} from '../../config';
import fetchType from '../fetchType';
import urlParams from '../url'
import { NATIVE, ETH, ELECTRUM, POST, GET } from '../constants/componentConstants'

/**
 * Makes a blockchain call to the API depending on a number of parameters
 * @param {String} mode native || electrum || eth
 * @param {String} call Name of the api call to make, e.g. get_balances
 * @param {Object} params Parameters to pass to api call, the required parameters depend on the mode specified above
 * @param {String} reqType (Optional) 'post' || 'get' If unspecified, defaults to 'post' for native mode and 'get' for eth and electrum
 */
export const getApiData = (mode, call, params, reqType) => {
  const requestFunc = reqType ? modeNameMap[reqType] : modeDefaultCallMap[mode]

  return new Promise((resolve, reject) => {
    requestFunc(`${mode}/${call}`, params)
    .catch((error) => {
      reject(error)
    })
    .then(json => {
      resolve(json)
    });
  })
}

/**
 * Makes an API get request to the specified API call 
 * @param {String} callPath The full location of the specified call, e.g. electrum/get_balances
 * @param {Object} params Parameters to pass to api call
 */
export const apiGet = (callPath, params) => {
  let urlParamsObj = {
    ...params
  }
  return new Promise((resolve, reject) => {
    fetch(
      `http://127.0.0.1:${agamaPort}/api/${callPath}${urlParams(urlParamsObj)}`,
      fetchType.get
    )
    .then(response => response.json())
    .then(json => {
      resolve(json)
    })
    .catch(e => reject(e))
  })
  
}

/**
 * Makes an API post request to the specified API call 
 * @param {String} callPath The full location of the specified call, e.g. native/get_balances
 * @param {Object} params Parameters to pass to api call
 */
export const apiPost = (callPath, params) => {  
  return new Promise((resolve, reject) => {
    fetch(
      `http://127.0.0.1:${agamaPort}/api/${callPath}`,
      fetchType(
        JSON.stringify({
          token,
          ...params
        })
      ).post
    ).then(response => response.json())
    .then(json => {
      resolve(json)
    })
    .catch(e => reject(e))
  })
}

export const modeDefaultCallMap = {
  [NATIVE]: apiPost,
  [ETH]: apiGet,
  [ELECTRUM]: apiGet
}

export const modeNameMap = {
  [POST]: apiPost,
  [GET]: apiGet
}

