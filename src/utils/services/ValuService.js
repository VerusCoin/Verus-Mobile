import axios from 'axios';
import mime from "mime";
import * as https from 'https';
class ValuInterface{

    constructor(sandbox = true){

        if(sandbox) this.axiosEndpoint = "http://192.168.1.121:8000";
        else this.axiosEndpoint = "https://live.com";
        this.valuToken = null;
        this.apiKey = null;
        this.service = axios.create({
            withCredentials: true, 
            baseURL: this.axiosEndpoint,
            headers: { 
              'Content-Type': 'application/json'
            }
          });

    }

    deauthenticate() {
        this.valuToken = null;
        this.apiKey = null;
        this.service = null;
      }

    setHeader(name, value){
        this.service.defaults.headers.common[name] = value;
    }

    setAuthorizationHeader(token){
        this.valuToken = token;
        this.setHeader('Authorization', `Bearer ${token}`);
    }

    setMultiPartHeader(){
        this.setHeader('Content-Type', `multipart/form-data`);
    }

    setJsonHeader(){
        this.setHeader('Content-Type', `application/json`);
    }

    async getAttestation(data){

        return  await this.dataPost("/makeKYCAttestation", JSON.stringify(data))     
   
    } 

    async createLinkToken(data){

        return  await this.dataPost("/create_link_token", JSON.stringify(data))     
   
    } 

    async exchangePublicToken(data){

        return  await this.dataPost("/exchange_public_token", JSON.stringify(data))     
   
    } 
    
    async getProcessorToken(data){

        return await this.dataPost("/get_processor_token", JSON.stringify(data))    
    }

    async sendUSDCToWallet(data){

        return await this.dataPost("/send_USDC_To_Wallet", JSON.stringify(data))    
    }

    async sendETHToWallet(data){

        return await this.dataPost("/send_ETH_To_Wallet", JSON.stringify(data))    
    }

    async getKYCPaymentRef(data){

        return await this.dataPost("/getKYCPaymentRef", JSON.stringify(data))    
    }

    async payKYCFee(data){

        return await this.dataPost("/payKYCFee", JSON.stringify(data))    
    }

    async registerID(data){

        return await this.dataPost("/registerid", JSON.stringify(data))    
    }

    async checkKYCFee(data){

        return await this.dataPost("/checkkycfee", JSON.stringify(data))    
    }

    async loginSignup(data){

        return await this.dataPost("/loginsignup", null)    
    }

    async exchangecurrency(data){

        return await this.dataPost("/exchangecurrency", JSON.stringify(data))    
    }


    async dataPost(url, data){
        try{
            let fullUrl = this.axiosEndpoint + url;
            let response = null;
            console.log("url:", url);
            console.log("data:" ,data);
            if(data === null) response = await this.service.post(`${fullUrl}`);
            else response = await this.service.post(`${fullUrl}`, data);
            

            if(response?.data?.error == "jwt expired")
            {
                console.log("jwt expired",response?.data);
                const create = await this.submitAuthToken(this.apiKey);
                console.log("jwt create",create);

              this.setAuthorizationHeader(create.data.key);

              if(create.success) {

                if(data === null) response = await this.service.post(`${fullUrl}`);
                else response = await this.service.post(`${fullUrl}`, data);
              }
            }
            //console.log("dataPost:",response);
            if(response.status == 200)
                return response.data
            else if (response.status == 201)    
                throw response.data.error
            else 
                throw response.data

        } catch(error){
            console.log("error in attesation server dataPost:", JSON.stringify(error, null, 2));
            return {
                data: null,
                success: false,
                error: error
            }
        }
    }

    async submitAuthToken(key) {

        let url = "/submitAuthToken";
        let data = {key: key};
        let response = await this.dataPost(url, data);
        return response;
    } 

    async authenticate(valuToken, apiKey) {

            if (!this.apiKey) {
                this.apiKey = apiKey;
            }
            
            if (!this.apiKey)
                throw new Error("APIkey not provided")
            
            try{
                if(!this.valuToken){
                    this.setAuthorizationHeader(valuToken)
                } 

                let url = "/authenticate";
                let data = {apiKey: this.apiKey};
                let response = await this.dataPost(url, data);
                console.log("response:", response, valuToken, apiKey);
                
                if (response.success)
                    return response;
                else
                    throw response.error;
    
            } catch(error){
                console.log("error in dataPostauthenticate:",error);
                return {
                    data: null,
                    success: false,
                    error: error
                }
            }
    }

    async createAccount(username, email, apiKey, iAddress ) {

        try{

            let url = "/register";
            let data = {username, email, apiKey, iAddress};
            let response = await this.dataPost(url, data);
            return response;

        } catch(error){
            console.log("error in dataPostcreateAccount:",error);
            return {
                data: null,
                success: false,
                error: error.response.data.errors
            }
        }
    }

    async getaccounts(accountId = null, withContacts = true) {

        try{
            let url = "/getaccounts";
            let data = {accountId, withContacts};
            let response = await this.dataPost(url, data);
            return response;

        } catch(error){
            console.log("error in dataPostgetaccounts:",error);
            return {
                data: null,
                success: false,
                error: error.response.data.errors
            }
        }
    }

    async updateUserContact(payload) {

        try{
            let url = "/updatecontact";
            let data = payload;
            let response = await this.dataPost(url, data);
            return response;

        } catch(error){
            console.log("error in dataPostupdateUserContact:",error);
            return {
                data: null,
                success: false,
                error: error.response.data.errors
            }
        }
    }

    async filePost(url,data){

        const axiosLocal = require('axios');   
        let fullUrl = this.axiosEndpoint + url;
        let config = {
        method: 'POST',
        url: fullUrl,
        headers: { 
            'Authorization': 'Bearer ' + this.valuToken, 
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
        },
        data : data
        };
        let response = null;

        try{
            response = await axiosLocal(config);//await fetch(fullUrl, options)
            return {
                data: response.data.data,
                success: true,
                status: response.status
            };
            
        } catch (error) {
            console.warn("filepost error ", error)
            return {
                data: null,
                success: false,
                error: JSON.parse(JSON.stringify(error.response.data.errors)),
            };
        }
    }

    async sendDocument(contact_id, document_type, uploaded_file) {

        let url = "/senddocument";
        let data = new FormData();

        data.append('contact-id', contact_id);
        data.append('description', document_type);  
        data.append('file', {
            uri: uploaded_file.uri,
            type: mime.getType(uploaded_file.uri),
            name: uploaded_file.uri.split("/").pop()
        });
        data.append('label', document_type);
        data.append('public', 'false');

        let response = await this.filePost(url,data);

        return response;
    }

    async apiFunction(apiCall, payload) {

        try{
            let url = "/apifunctions";
            let data = {apiCall, payload};
            let response = await this.dataPost(url, data);
            return response;

        } catch(error){
            console.log(`error in ${apiCall}`,error);
            return {
                data: null,
                success: false,
                error: error.response.data.errors
            }
        }
    }
    
}
export default ValuInterface;