import axios from 'axios';

class axiosConnect {

    constructor(sandbox = true){

        if(sandbox) this.axiosEndpoint = "https://sandbox.primetrust.com";
        else this.axiosEndpoint = "https://primetrust.com";
        this.service = axios.create({
            baseURL: this.axiosEndpoint,
            headers: { 
              'Content-Type': 'application/json'
            }
          });

    }

    setHeader(name, value){
        this.service.defaults.headers.common[name] = value;
    }
    
    setAuthorizationHeader(token){
        this.setHeader('Authorization', `Bearer ${token}`);
    }


    async dataPostBasicAuth(url,username,password){
        url = this.axiosEndpoint + url;
        try{

            let response = await axios.post(url,{},{
                auth: {
                    username: username,
                    password: password
                }
            });
            console.log("axios",response);
            return {
                data: response.data.token,
                status: response.status,
                success: true,

            }
        } catch(error){
            console.log("error:",error)
            return {
                data: null,
                success: false,
                error: error
            }
        }
    }

    async dataPost(url,data,jwt = null,multipart = null){
        try{
            if(jwt){
                this.setAuthorizationHeader(jwt)
            } 
            if(multipart){
                this.setHeader('Content-Type', 'multipart/form-data');
            }
            let fullUrl = this.axiosEndpoint + url;
            let response = null;

            if(data === null) response = await this.service.post(`${fullUrl}`);
            else response = await this.service.post(`${fullUrl}`,data);
            //console.log("dataPost:",response);
            return {
                data: response.data,
                success: true,
                status: response.status
            }

        } catch(error){
            console.log(error);
            return {
                data: null,
                success: false,
                error: error.response.data.errors
            }
        }
    }

    async dataPatch(url,data,jwt = null,multipart = null){
        try{
            if(jwt){
                this.setAuthorizationHeader(jwt)
            } 
            if(multipart){
                this.setHeader('Content-Type', 'multipart/form-data');
            }
            let fullUrl = this.axiosEndpoint + url;
            let response = null;

            if(data === null) response = await this.service.post(`${fullUrl}`);
            else response = await this.service.patch(`${fullUrl}`,data);
            //console.log("dataPost:",response);
            return {
                data: response.data,
                success: true,
                status: response.status
            }

        } catch(error){
            console.log(error);
            return {
                data: null,
                success: false,
                error: error.response.data.errors
            }
        }
    }
    async filePost(url,data,jwt){

        var axios = require('axios');
        
       
        let fullUrl = this.axiosEndpoint + url;
        let config = {
        method: 'post',
        url: fullUrl,
        headers: { 
            'Authorization': 'Bearer ' + jwt, 
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
            //...data.getHeaders()
        },
        data : data
        };
        console.log("config:",config);
        let response = null;
        try{
            response = await axios(config);
            return{
                data: response.data,
                success: true,
                status: response.status
            };
            
        } catch (error) {
            return {
                data: null,
                success: false,
                error: error.response.data.errors,
            };
        }
    
    }

    async dataGet(url,jwt = null){
        try {
            if(jwt){
                this.setAuthorizationHeader(jwt)
            } 
            let fullUrl = this.axiosEndpoint + url;
            /*if(query_parameters){
                fullUrl + "/" + query_parameters;
            }*/
            let response = await this.service.get(fullUrl);
            
            return {
              data: response.data,
              success: true,
              status: response.status,
            };
        } catch (error) {
            return {
              data: null,
              status: false,
              success: false,
              error: error.response.data.errors,
            };
        }
    }

}


/** 
 * All use functions for prime trust
 */

class PrimeTrustInterface{

    constructor(){
        this.connection = new axiosConnect();
        this.user = null;
        this.jwt = null;
    }

    getUrl = async (url) => {
        let response = await this.connection.dataGet(url,this.jwt);
        console.log(this.jwt);
        //console.log("response:",response);
        return response;
    }

    postUrl = async (url,data) => {
        let response = null;
        if(this.jwt) response = await this.connection.dataPost(url,data,this.jwt);
        else response = await this.connection.dataPost(url,data);
        console.log("post Url response:",response);
        return response;
    }

    createUser = async (username,email,password) => {

        let url = "/v2/users";
        let data = 
        {
            "data" : {
                "type" : "user", 
                "attributes" : {
                    "email" : email,
                    "name" : username,
                    "password" : password
                }
            }
        }
        
        let response = await this.postUrl(url,data);
        if(response.success){
            this.user = response.data;
          
        } 
        return response;       
    }

    loginUser = async (email,password) => {

        let url = "/auth/jwts";
        console.log("loginUser Parameters:",url,email,password);
        let response = await this.connection.dataPostBasicAuth(url,email,password);
        console.log("login user response:", response);
        
        if(response.success){
            this.jwt = response.data;
            console.log("loginUser jwt:",this.jwt);
            return response;
        } else {
            //return response.error.response.data.errors;
            return response;
        }   

    }

    logoutUser = () => {
        this.jwt = null;
    }

    createUserContact = async (
        email,
        name,
        date_of_birth = null,
        sex = null,
        tax_id_number = null,
        tax_country = null,
        primary_phone_country = null,
        primary_phone_number = null,
        primary_address = null) => {

        if(!this.jwt) return ("User is not logged in");

        let url = "/v2/accounts?include=contacts";        
        let owner = {
            "contact-type" : "natural_person",
            "name" : name,
            "email" : email
        };
        //have to use this as an array due to hyphens in the name
        if(date_of_birth) owner["date-of-birth"] = date_of_birth;
        if(sex) owner["sex"] = sex;
        if(tax_id_number) owner["tax-id-number"] = tax_id_number;
        if(tax_country) owner["tax-country"] = tax_country;
        if(primary_phone_number && primary_phone_country) {
            owner["primary-phone-number"] = {};
            owner["primary-phone-number"]["country"] = primary_phone_country;
            owner["primary-phone-number"]["number"] = primary_phone_number;
        }
        
        if(primary_address) owner["primary-address"] = primary_address;

        let attributes = {
            "account-type" : "custodial",
            "name" : name,
            "authorized-signature" : name,
            "owner" : owner
        };
        
        let request = {
            "data" : {
                "type" : "account",
                "attributes" : attributes
            }
        }
        console.log("Create User requrest:",request);
        let response = await this.postUrl(url,request);
        //console.log(response);
        return response;
    }

    getAccounts = async (account_id = null) => {
        let url = "/v2/accounts";
        if(account_id) url += "/" + account_id;
        let response = await this.getUrl(url);
        return response;
    }


    updateUserContact = async (contact_id,
        email = null,
        name = null,
        date_of_birth = null,
        sex = null,
        tax_id_number = null,
        tax_country = null,
        primary_phone_country = null,
        primary_phone_number = null,
        primary_address = null) => {

        if(!this.jwt) return ("User is not logged in");

        let url = "/v2/contacts/" + contact_id;        
        let attributes = {
            "contact-type" : "natural_person"
        };
        //have to use this as an array due to hyphens in the name
        if(name) attributes["name"] = name;
        if(email) attributes["email"] = email;
        
        if(date_of_birth) attributes["date-of-birth"] = date_of_birth;
        if(sex) attributes["sex"] = sex;
        if(tax_id_number) attributes["tax-id-number"] = tax_id_number;
        if(tax_country) attributes["tax-country"] = tax_country;

        let request = {
            "data" : {
                "type" : "contacts",
                "attributes" : attributes
            }
        }

        console.log("attributes:",attributes);
        let response = await this.connection.dataPatch(url,request,this.jwt);

        let phoneUrl = "/v2/addresses/"
        if(primary_phone_number && primary_phone_country) {
            attributes["primary-phone-number"] = {};
            attributes["primary-phone-number"]["number"] = primary_phone_number;
        }
        
        if(primary_address) attributes["primary-address"] = primary_address;

        //update the address and the phone number


        console.log(response);
        return response;
    }

    //returns an account for the current JWT
    getUser = async () => {
        
        if(!this.jwt) return ("User is not logged in");

        let url = "/v2/users?include=contacts";
        let response = await this.getUrl(url);
        if(response.success){
            this.user = response.data;
        }
        return response;
    }

    //returns an account for the current JWT
    getContacts = async () => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/contacts?include=primary-phone-number";
        let response = this.getUrl(url);
        return response;
    }
    getContact = async (contact_id) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/contacts/" + contact_id + "??include=primary-phone-number";
        let response = this.getUrl(url);
        return response;
    }

    getAddresses = async () => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/addresses";
        let response = this.getUrl(url);
        return response;
    }
    getAddress = async (address_id) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/addresses/" + address_id;
        let response = this.getUrl(url);
        return response;
    }
    getPhoneNumbers = async () => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/phone-numbers";
        let response = this.getUrl(url);
        return response;
    }
    getPhoneNumber = async (phone_id) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/phone-numbers/" + phone_id;
        let response = this.getUrl(url);
        return response;
    }

    sendDocument = async (contact_id,document_type,uploaded_file) => {

        let url = "/v2/uploaded-documents";
        let data = new FormData();
        data.append('contact-id', contact_id);
        data.append('description', document_type);  
        data.append('file', {
            uri: uploaded_file.uri,
            name: uploaded_file.fileName,
            type: uploaded_file.type
        });
        data.append('label', document_type);
        data.append('public', 'false');
        
        let response = await this.connection.filePost(url,data,this.jwt);
        return response;
    }

    /**
     * returns an object 
     * aml_cleared
     * cip_cleared
     * identity_confirmed
     * identity_documents_verified
     * proof_of_address_documents_verified
     */
    getAMLStatus = async () => {
        if(!this.jwt) return ("User is not logged in");
        
        let contacts = await this.getUrl('/v2/contacts?include=cip-checks,aml-checks,kyc-document-checks');
        
        let amlResult = {};
        let amlResults = [];

        if(contacts.included){
            amlResult = {};
            contacts.included.forEach((check) => {
                
                if(check.type == "cip-checks") amlResult.cip_check = check.attributes.status;
                if(check.type == "kyc-document-checks") amlResult.kyc_check = check.attributes.status;
                if(check.type == "aml-checks") amlResult.aml_check = check.attributes.status;
/*
                amlResult.aml_cleared = contact["aml-cleared"];
                amlResult.identity_confirmed = contact["identity-confirmed"];
                amlResult.identity_documents_verified = contact["identity-documents-verified"];
                amlResult.proof_of_address_documents_verified = contact["proof-of-address-documents-verified"];*/
            });
            amlResults.push(amlResult);
        }
        return amlResults;
    }

    getAMLChecks = async () => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/aml-checks";
        let response = await this.getUrl(url);
        return response;
    }

    getKYCDocumentChecks = async () => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/kyc-document-checks";
        let response = await this.getUrl(url);
        return response;
    }

    getUploadedDocuments = async () => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/uploaded-documents";
        let response = await this.getUrl(url);
        return response;
    }

    postKYCDocumentChecks = async (contact_id,
        documentFront,
        documentBack,
        identity,
        identity_photo,
        proof_of_address,
        document_country,
        document_type) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/kyc-document-checks";
        let data = {
            "data" : {
                "type" : "kyc-document-checks",
                "attributes" : {
                    "contact-id" : contact_id,
                    "uploaded-document-id" : documentFront,
                    "backside-document-id" : documentBack,
                    "identity" : identity,
                    "identity-photo" : identity_photo,
                    "proof-of-address" : proof_of_address,
                    "kyc-document-country" : document_country,
                    "kyc-document-type" : document_type
                }
            }
        };
        return this.postUrl(url,data);
    }

    //funds wire details generate
    postFundsTransferReferences = async (account_id,contact_id) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/contact-funds-transfer-references";
        let data = {
            "data" : {
                "type" : "contact-funds-transfer-references",
                "attributes" : {
                    "account-id" : account_id,
                    "contact-id" : contact_id,
                }
            }
        };
        let response = await this.postUrl(url,data);
        return response;
    }

    getFundsTransferReferences = async (funds_transfer_id = null) => {
        let url = "/v2/contact-funds-transfer-references";
        if(funds_transfer_id) url += "/" + funds_transfer_id;
        let response = await this.getUrl(url);
        return response;
    }

    //making a deposit (contributions fund transfer)
    postFundsTransfer = async (contact_id,funds_transfer_method_id,account_id,amount) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/contributions?include=funds-transfer";
        let data = {
            "data" : {
                "type" : "contributions",
                "attributes" : {
                    "amount" : amount,
                    "account-id" : account_id,
                    "contact-id" : contact_id,
                }
            }
        };
        let response = await this.postUrl(url,data);
        return response;

    }
    //list funds transfer
    getFundsTransfer = async (funds_transfer_id = null) => {
        let url = "/v2/funds-transfers";
        if(funds_transfer_id) url += "?filter[id eq]=${funds_transfer_id}&include=contingent-holds";
        let response = await this.getUrl(url);
        return response;
    }

    //withdrawing funds, create a funds transfer methods , create a disbursement
    createFundsTransferMethod = async (bank_account_name,
        bank_account_number,
        routing_number,
        funds_transfer_type) => {

            let account_id = null; 
if(this.user.id != undefined) account_id = this.user.id;
            else return false;    
            let url="/v2/funds-transfer-methods?include=bank";
            let data = {
                "data" : {
                    "type" : "funds-transfer-methods",
                    "attributes" : {
                        "contact-id" : contact_id,
                        "bank-account-name" : bank_account_name,
                        "bank-account-number" : bank_account_number,
                        "routing-number" : routing_number,
                        "funds-transfer-type" : funds_transfer_type
                    }
                }
            };
        let response = await this.postUrl(url,data);
        return response;
    }
    
    createWithdrawal = async (funds_transfer_method_id,amount,reference) => {
        let account_id = null; 
if(this.user.id != undefined) account_id = this.user.id;
        else return false;
        let url = "/v2/disbursements?include=funds-transfer,disbursement-authorization";
        let data = {
            "data" : {
                "type" : "disimbursements",
                "attributes" : {
                    "account-id" : account_id,
                    "funds-transfer-method-id" : funds_transfer_method_id,
                    "amount" : amount,
                    "reference" : reference
                }
            }
        }
        let response = await this.postUrl(url,data);
        return response;
    }

    trackWithdrawal = async (funds_transfer_outgoing_id) => {
        let url = "/v2/funds-transfers?filter[id eq]=" + transfer_outgoing_id + "&include=contingent-holds,disbursement-authorization";
        let response = await this.getUrl(url);
        return response;
    }


    //get asset types, returns a listof available assets 
    getAssets = async () => {
        let url = "/v2/assets";
        let response = await this.getUrl(url);
        return response;
    }


    //deposit digital assets create a method and then 
    //track the inbound or outbound depending on the direction variable
    createAssetTransferMethod = async (account_id,
        label,
        cost_basis = null,
        acquisition_on = null,
        currency_type = null,
        asset_id,
        contact_id,
        single_use,
        asset_transfer_type,
        direction,
        wallet_address = null) => {

        let url = "/v2/asset-transfer-methods";
        let attributes = {
            "label" : label,
            "asset-id" : asset_id,
            "contact-id" : contact_id,
            "account-id" : account_id,
            "transfer-direction" : direction,
            "single-use" : single_use,
            "asset-transfer-type" : asset_transfer_type,
        }
        if(cost_basis) attributes["cost-basis"] = cost_basis;
        if(acquisition_on) attributes["acquisition-on"] = acquisition_on;
        if(currency_type) attributes["currency-type"] = currency_type;
        if(wallet_address) attributes["wallet-address"] = wallet_address;

        let data = {
            "data" : {
                "type" : "asset-transfer-methods",
                "attributes" : attributes
            }
        }
        console.log("data: ",data);
        let response = await this.postUrl(url,data);
        return response;

    }

    getAssetTransferMethods = async () => {
        let url = "/v2/asset-transfer-methods";
        let response = await this.getUrl(url);
        return response;
    }

    postAssetContribution = async (account_id,
        asset_id,
        unit_count,
        acquisition_on,
        cost_basis,
        currency_type,
        contact_id) => {
        let url = "/v2/asset-contributions";
        let data = {
            "data": {
                "type": "asset-contributions",
                "attributes": {
                    "account-id": account_id,
                    "asset-id": asset_id,
                    "unit-count": unit_count,
                    "acquisition-on": acquisition_on,
                    "cost-basis": cost_basis,
                    "currency-type" : currency_type,
                    "contact-id" : contact_id
                }
            }
        }
        let response = await this.postUrl(url,data);
        return response;
    }

    assetWithdrawal = async (account_id,asset_id,asset_transfer_method_id,contact_id,unit_count) => {
        let url = "/v2/asset-disbursements?include=asset-transfer-method,asset-transfer";  
        let data = {
            "data" : {
                "type" : "asset-disbursements",
                "attributes" : {
                    "asset-id" : asset_id,
                    "asset-transfer" : {
                        "asset-transfer-method-id" : asset_transfer_method_id
                    },
                    "unit-count" : unit_count,
                    "account-id" : account_id,
                    "contact-id" : contact_id
                }
            }
        };      
        let response = await this.postUrl(url,data);
        return response;

    }

    getAssetTransfers = async (account_id) => {
        let url = "/v2/asset-transfers?account.id=" + account_id;
        let response = await this.getUrl(url);
        return response;
    }

    //trades

    requestTrade = async (account_id,sent_currency_type,
        sent_amount,
        acceptor_account_id,
        acceptor_asset_id,
        acceptor_market_value_amount,
        acceptor_amount) => {
        let url = "/v2/trades";
        let data = {
            "data": {
              "type": "trades",
              "attributes": {
                "initiator": {
                    "account-id": account_id,
                    "currency-type": sent_currency_type,
                    "amount": sent_amount
                },
                "acceptor": {
                    "account-id": acceptor_account_id,
                    "asset-id": acceptor_asset_id,
                    "market-value-amount": acceptor_market_value_amount,
                    "amount": acceptor_amount
                }
              }
            }
          };
          let response = await this.postUrl(url,data);
          return response;  
    }

    getTrades = async (account_id) => {
        let url = "/v2/trades";
        let response = await this.getUrl(url);
        return response;
    } 

    settleTrade = async (trade_id) => {
        let url = "/v2/trades/" + trade_id + "/settle";
        let response = await this.postUrl(url,null);
        return response;
    }

    cancelTrade = async (trade_id) => {
        let url = "/v2/trades/" + trade_id + "/cancel";
        let response = await this.postUrl(url,null);
        return response;
    }

    //account balances
    getAccountCashBalances = async (account_id = null) => {
        let url = "/v2/account-cash-totals";
        if(account_id) url += "?account.id=" + account_id;
        let response = await this.getUrl(url);
        return response;
    }

    getAccountCashTransactions = async (account_id = null) => {
        let url = "/v2/cash-transactions";
        if(account_id) url += "?account.id=" + account_id;
        if(currency_type) {
            if(account_id) url+="&"
            else url+="?";
            url += "filter[currency_type eq]=" + currency_type;
         }
        let response = await this.getUrl(url);
        return response;
    } 

    getAccountAssetBalances = async (account_id = null) => {
        let url = "/v2/account-asset-totals";
        if(account_id) url += "?account.id=" + account_id;
        let response = await this.getUrl(url);
        return response;
    }

    getAccountAssetTransactions = async (account_id = null,currency_type = null) => {
        let url = "/v2/asset-transactions";
        if(account_id) url += "?account.id=" + account_id;
        if(currency_type) {
            if(account_id) url+="&"
            else url+="?";
            url += "filter[asset-transfer-type eq]=" + currency_type;
         }
        let response = await this.getUrl(url);
        return response;
    }

    getAccountAssetTransfers = async (account_id = null,currency_type = null) => {
        let url = "/v2/asset-transfers?include=asset-transfer-method";
        let response = await this.getUrl(url);
        return response;
    }

    /**
     * 
     * Functions for verus/valu wallet returns in the format
     * {
     * confirmed,
     * pending,
     * total
     * }
     */
    getBalances = async () => {

        let returnBalances = [];
        //get the balances of all the accounts
        let cashBalances = await this.getAccountCashBalances();
        cashBalances.data.forEach(balance => {
            returnBalances[balance.attributes.currency_type] = {
                confirmed : balance.attributes.disbursable,
                pending : balance.attributes["contingent-hold"] + balance.attributes["non-contingent-hold"],
                total : balance.attributes.settled
            };
        });

        let assetBalances = await this.getAccountAssetBalances();
        assetBalances.data.forEach(balance => {
            returnBalances[balance.attributes.name] = {
                confirmed : balance.attributes.disbursable,
                pending : balance.attributes["contingent-hold"] - balance.attributes["pending-transfer"],
                total : balance.attributes.settled
            };
        });

        return returnBalances;
    }

    getOneBalance = async (currencyName) => {

        let balances = this.getBalances();
        if(balance.currencyName != undefined) return balances.currencyName;
        else return 0;

    }

    getTransactions = async (currencyName) => {

        const cryptos = ["bitcoin","ethereum","verus"];
        //check if its a crypto or a fiat
        let accounts = this.getAccounts();
        if(accounts[0]== undefined) return null;            
        let transactions = [];
        let transactionObject = {};
        if(cryptos.indexOf(currencyName)) {

            //get all asset transactions and then check asset transfers 
            let transfersResult = this.getAccountAssetTransaction()
            //loop through the transactions and port to a wallet friendly array
            let transfers = transfersResult.data;

            transactionsResult.forEach(transaction => {
                transactionObject = {};
                if(transaction.attributes.data.from != undefined) transactionObject.address = transaction.attributes.data.from;
                else transactionObject.address = "test transfer";
                if(transaction.attributes.unit_count != undefined) transactionObject.amount = transaction.attributes.unit_count;
                else transactionObject.amount = 0;
                if(transaction.attributes["asset-transfer-type"] != undefined){
                    if(transaction.attributes["asset-transfer-type"] == "free_receive") {
                        transactionObject.type = "received";
                    }
                    if(transaction.attributes["asset-transfer-type"] == "free_deliver") {
                        transactionObject.type = "sent";
                    }
                }

                transactionObject.type = "confirmed";
                transactionObject.timestamp = transaction.attributes["effective-at"];

                if(transaction.attributes["transfer_hash"] != undefined) transactionObject.txid = transactions.attributes.data["transfer_hash"];
                else transactionObject.txid = null;

                if(transaction.attributes.comments-1 != undefined) transactionObject.memo = transactions.attributes["comments-1"] 
                    + transactions.attributes["comments-2"] 
                    + transactions.attributes["comments-3"] 
                    + transactions.attributes["comments-4"];
                else transactionObject.memo = null;
                transactions.push
            });

        } else {
            let cashTransactions = this.getAccountCashTransactions(accounts[0].id,currencyName)
            //loop through the cash transactions and populate the transaction
            cashTransactions.data.forEach(transaction => {
                transactionObject = {};
                if(transaction.attributes.amount != undefined) transactionObject.amount = transaction.attributes.amount;
                else transactionObject.amount = 0;

                if(transaction.attributes["funds-transfer-type"] != undefined){
                    if(transaction.attributes["funds-transfer-type"] == "sent") transactionObject.type = "sent";
                    else  transactionObject.type = "recieved";
                } 

                if(transaction.attributes.comments-1 != undefined) transactionObject.memo = transactions.attributes["comments-1"] 
                    + transactions.attributes["comments-2"] 
                    + transactions.attributes["comments-3"] 
                    + transactions.attributes["comments-4"];
                else transactionObject.memo = null;
                transactionObject.timestamp = transaction.attributes["effective-at"];
                if(transaction.attributes["transfer_hash"] != undefined) transactionObject.txid = transactions.attributes.data["transfer_hash"];
                else transactionObject.txid = null;

            });

        }

        return transactions;

    }

    /**
     * returns the current status of the user
     */
    getStatus = async () => {

        let status = {
            user_created: false,
            contact_created: false,
            identity_confirmed: false,
            identity_documents_verified: false,
            proof_of_address_documents_verified: false,
            cip_cleared: false,
            aml_cleared: false,
            account_complete: false,
        };
        if(!this.jwt) return status; //User not logged in
        else status.user_created = true;
        let contacts = await this.getContacts();
        if(contacts.data.data[0] == undefined) return status; //user has not completed basic contact information
        else status.contact_created = true;

        let contact = contacts.data.data[0].attributes;
        if(contact["identity-documents-verified"]) status.identity_documents_verified = true;
        if(contact["identity-confirmed"]) status.identity_confirmed = true;
        if(contact["proof-of-address-documents-verified"]) status.identity_confirmed = true;
        if(contact["cip-cleared"]) status.cip_cleared = true;
        if(contact["aml-cleared"]) status.aml_cleared = true;
        if(status.cip_cleared && status.aml_cleared) status.account_complete = true;
        return status;
    }


    /** sandbox functions */

    sandboxVerifyKYC = async (kyc_check_id) => {
        if(!this.jwt) return ("User is not logged in");
        
        let url = "/v2/kyc-document-checks/" + kyc_check_id + "/sandbox/verify";
        let response = await this.postUrl(url,null);
        return response;
    }
    
    sandboxVerifyAML = async (aml_check_id) => {
        if(!this.jwt) return ("User is not logged in");
        
        let url = "/v2/aml-checks/" + aml_check_id + "/sandbox/approve";
        let response = await this.postUrl(url,null);
        return response;
    }

    sandboxDirectlyAddFunds = async (account_id,amount) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/accounts/" + account_id + "/sandbox/fund";
        let data = {
            "data" : {
                "type" : "accounts",
                "attributes" : {
                    "amount" : amount
                }
            }
        };
        let response = await this.postUrl(url,data);
        return response;
    }

    sandboxTransferSettle = async (funds_transfer_id) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/accounts/" + funds_transfer_id + "/sandbox/settle";
        let data = null;
        let response = await this.postUrl(url,data);
        return response;
    }

    

    sandboxAssetTransferSettle = async (asset_transfer_id) => {
        if(!this.jwt) return ("User is not logged in");
        let url = "/v2/asset-transfers/" + asset_transfer_id + "/sandbox/settle";
        let data = null;
        let response = await this.postUrl(url,data);
        return response;
    }


}



export default PrimeTrustInterface;
