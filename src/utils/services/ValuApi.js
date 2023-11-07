import Store from "../../store";
import { requestSeeds } from "../auth/authBox";
import { VALU_SERVICE_ID, CONNECTED_SERVICE_DISPLAY_INFO} from "../constants/services";
import { VALU_SERVICE } from "../constants/intervalConstants"
import { AUTHENTICATE_VALU_SERVICE, DEAUTHENTICATE_VALU_SERVICE } from "../constants/storeType";
import { AccountBasedFintechApiTemplate } from "./ServiceTemplates";
import ValuService from './ValuService'
import { storeLoginDetails } from '../../actions/actions/services/dispatchers/valu/updates';
import crypto from 'crypto'
import { mnemonicToSeed } from 'bip39'

export class ValuApi extends AccountBasedFintechApiTemplate {
  constructor() {
    super(VALU_SERVICE_ID, {
      authenticate: (seed) => this.authenticate(seed),
      reset: () => this.reset(),
      createAccount: (payload) => this.createAccount(payload),
      getAccount: (payload) => this.getAccount(payload),
      updateAccount: (payload) => this.updateAccount(payload),
      uploadDocument: (payload) => this.uploadDocument(payload),
      getSupportedCountries: (payload) => this.getSupportedCountries(payload),
      getAddresses:(payload) => this.getAddresses(payload),
      createUserContact:(payload) => this.createUserContact(payload),
      updateUserContact:(payload) => this.updateUserContact(payload),
      sendDocument:(contact_id,document_type,uploaded_file) => this.sendDocument(contact_id,document_type,uploaded_file),
      postKYCDocumentChecks:(payload) => this.postKYCDocumentChecks(payload),
      sandboxVerifyKYC:(payload) => this.sandboxVerifyKYC(payload),
      getAttestation:(payload) => this.getAttestation(payload),
      createLinkToken:(payload) => this.createLinkToken(payload),
      exchangePublicToken:(payload) => this.exchangePublicToken(payload),
      getProcessorToken:(payload) => this.getProcessorToken(payload),
      sendUSDCToWallet:(payload) => this.sendUSDCToWallet(payload),
      sendETHToWallet:(payload) => this.sendETHToWallet(payload),
      despositFundsPlaid:(payload) => this.despositFundsPlaid(payload),
      getAMLStatus:(payload) => this.getAMLStatus(payload),
      sandboxApproveAML:(payload) => this.sandboxApproveAML(payload),
      postFundsTransfer:(payload) => this.postFundsTransfer(payload),
      getFundsTransfer:(payload) => this.getFundsTransfer(payload),
      sandboxFundsTransferSettle:(payload) => this.sandboxFundsTransferSettle(payload),
      getAssets:(payload) => this.getAssets(payload),
      getQuotes:(payload) => this.getQuotes(payload),
      executeQuote:(payload) => this.executeQuote(payload),
      getOrganizations:(payload) => this.getOrganizations(payload),
      getContributions:(payload) => this.getContributions(payload),
      sandboxFundsTransferClear:(payload) => this.sandboxFundsTransferClear(payload),
      getTrades:(payload) => this.getTrades(payload),
      createAssetTransferMethod:(payload) => this.createAssetTransferMethod(payload),
      assetWithdrawal:(payload) => this.assetWithdrawal(payload),
      getAccountAssetTransfers:(payload) => this.getAccountAssetTransfers(payload),
      settleDisbursement:(payload) => this.settleDisbursement(payload),
      getAssetDisbursements:(payload) => this.getAssetDisbursements(payload),
      getAssetTransfers:(payload) => this.getAssetTransfers(payload),
      getAssetTransferMethods:(payload) => this.getAssetTransferMethods(payload),
      sandboxAssetTransferClear:(payload) => this.sandboxAssetTransferClear(payload),
      sandboxAssetTransferSettle:(payload) => this.sandboxAssetTransferSettle(payload),
      sandboxAccountOpen:(payload) => this.sandboxAccountOpen(payload),
      getKYCPaymentRef:(payload) => this.sandboxAccountOpen(payload),
      payKYCFee:(payload) => this.payKYCFee(payload),
      registerID:(payload) => this.registerID(payload),
      checkKYCFee:(payload) => this.checkKYCFee(payload),
      loginSignup:(payload) => this.loginSignup(payload),
      exchangecurrency:(payload) => this.exchangecurrency(payload),
      
    });

    this.service = new ValuService();
    this.bearerToken = null;
    this.apiKey = null;
    this.accountId = null;
  }

  async bearerFromSeed(seed) {
    var ripemd160 = crypto.createHash("ripemd160");
    var sha256 = crypto.createHash("sha256");

    const VALU_SERVICE_CANONICAL = Buffer.from(VALU_SERVICE_ID, "utf8");

    const sha256Hash = sha256
      .update(await mnemonicToSeed(seed))
      .update(VALU_SERVICE_CANONICAL)
      .digest();

    return ripemd160.update(sha256Hash).digest().toString("hex");
  };

  authenticate = async (KYCState, reauthenticate = false) => {
    if (reauthenticate) {
      this.service.deauthenticate()
    }
    const seed = (await requestSeeds())[VALU_SERVICE];
    
    if (seed == null) throw new Error('No Valu seed present');

    const key = await this.bearerFromSeed(seed);
    const authenticated = Store.getState().channelStore_valu_service.authenticated;
    const storedID = Store.getState().channelStore_valu_service.accountId;
    if (authenticated && !reauthenticate && this.accountId && this.apiKey)
      return { apiKey: this.apiKey, authenticatedAs: this.accountId };

    const res = await this.service.submitAuthToken(key);
    console.log("res", res, storedID)
    if (!res.success)
      throw res.error;

    this.bearerToken = res.data.key;
    this.apiKey = res.data.apiKey;
    if (storedID)
      this.accountId = storedID;
    else
      this.accountId = res.data.accountId;

    const auth = await this.service.authenticate(this.bearerToken, res.data.apiKey);
    console.log("auth", auth)
    if (!auth.success)
      throw auth.error;

    if(!reauthenticate)
      await this.initAccountData(KYCState)
      console.log("res2", { apiKey: this.apiKey, authenticatedAs: this.accountId, success: true })
    return { apiKey: this.apiKey, authenticatedAs: this.accountId, success: true };
  };

  initAccountData = async (KYCState) => {
    
    Store.dispatch({
      type: AUTHENTICATE_VALU_SERVICE,
      payload: {
        accountId: this.accountId,
        KYCState: KYCState
      },
    });
  };

  reset = () => {
    this.bearerToken = null;
    this.apiKey = null;
    this.accountId = null;
    this.service.deauthenticate();
    this.service = new ValuService();

    Store.dispatch({
      type: DEAUTHENTICATE_VALU_SERVICE,
    });
  };

  createAccount = async ( username, email, data) => {

   
    if(!(data.key && data.apiKey && data.iAddress))
    {
      throw new Error("Server did not authenticate" + data )
    }
    console.log("data", data);

    // log the Valu servers JWT token 
    this.bearerToken = data.key;
    this.apiKey = data.apiKey;

    if (data.accountId)
      this.accountId = data.accountId;

    const serverAuthenticated = await this.service.authenticate(data.key, data.apiKey);
    console.log("serverAuthenticated", serverAuthenticated)
    
    if(!serverAuthenticated.success)
    {
      throw new Error("Server did not authenticate")
    }
        
    const newAccount = await this.service.createAccount(username, email, data.apiKey, data.iAddress);
   // console.log("newAccount", JSON.stringify(newAccount, null, 2))

    if(newAccount.error == "Acount already registered.")
    {
      this.accountId = newAccount.data.accountId;
    }
    else if(!newAccount.success) {
      throw new Error(newAccount.error)
    } else {
      this.accountId = newAccount.data.data.id;
    }

    await storeLoginDetails({email, apiKey: data.apiKey, accountId: this.accountId, iAddress: data.iAddress });

    console.log("loginstored", {email, apiKey: data.apiKey, accountId: this.accountId })

    return this.accountId
  };

  getAccount = async (accountId) => {

    let account = await this.service.getaccounts(accountId || this.accountId);
    return account;
  };

  updateAccount = async ({ accountId, updateObj }) => {
    return await this.service.updateAccount(
      accountId == null ? this.accountId : accountId,
      updateObj
    );
  };

  uploadDocument = async ({ accountId, field, uris, format, documentType, documentSubTypes }) => {
    return await this.service.uploadDocument(
      accountId == null ? this.accountId : accountId,
      field,
      uris,
      documentType,
      documentSubTypes,
      format == null ? "image/jpeg" : format
    );
  };

  getSupportedCountries = async () => {
    const countries = await this.service.getSupportedCountries()
    //console.log("countries",countries.data.data)

    return countries?.data?.data.map((item) => item.id);
  };

  getAddresses = async () => {
    const reply = await this.service.getAddresses()
   // console.log("addresses", reply)
    return reply?.data?.data;
  };

  createUserContact = async (payload) => {
   // console.log("createUserContact", payload)
    const data = await this.service.createUserContact(payload)
    return data;
  };

  updateUserContact = async (payload) => {
    // console.log("createUserContact", payload)
     const data = await this.service.updateUserContact(payload)
     return data;
   };

  sendDocument = async (contact_id, document_type, uploaded_file) => {
    const data = await this.service.sendDocument(contact_id, document_type, uploaded_file)
    return data;
  };

  postKYCDocumentChecks = async (payload) => {
    const data = await this.service.apiFunction("postKYCDocumentChecks", payload)
    return data;
  };

  sandboxVerifyKYC = async (payload) => {
    const data = await this.service.apiFunction("sandboxVerifyKYC", payload)
    return data;
  };

  getAMLStatus = async (payload) => {
    const data = await this.service.apiFunction("getAMLStatus", payload)
    return data;
  };

  sandboxApproveAML = async (payload) => {
    const data = await this.service.apiFunction("sandboxApproveAML", payload)
    return data;
  };

  despositFundsPlaid = async (payload)  => {
    const data = await this.service.apiFunction("despositFundsPlaid", payload)
    return data;
  };

  postFundsTransfer = async (payload)  => {
    const data = await this.service.apiFunction("postFundsTransfer", payload)
    return data;
  };
  
  getFundsTransfer = async (payload)  => {
    const data = await this.service.apiFunction("getFundsTransfer", payload)
    return data;
  };

  sandboxAccountOpen = async (payload)  => {
    const data = await this.service.apiFunction("sandboxAccountOpen", payload)
    return data;
  };

  sandboxFundsTransferSettle = async (payload)  => {
    const data = await this.service.apiFunction("sandboxFundsTransferSettle", payload)
    return data;
  };

  sandboxFundsTransferClear = async (payload)  => {
    const data = await this.service.apiFunction("sandboxFundsTransferClear", payload)
    return data;
  };

  getAssets = async (payload)  => {
    const data = await this.service.apiFunction("getAssets", payload)
    return data;
  };

  getQuotes = async (payload)  => {
    const data = await this.service.apiFunction("getQuotes", payload)
    return data;
  };

  executeQuote = async (payload)  => {
    const data = await this.service.apiFunction("executeQuote", payload)
    return data;
  };

  getOrganizations = async (payload)  => {
    const data = await this.service.apiFunction("getOrganizations", payload)
    return data;
  };

  getContributions = async (payload)  => {
    const data = await this.service.apiFunction("getContributions", payload)
    return data;
  };

  getTrades = async (payload)  => {
    const data = await this.service.apiFunction("getTrades", payload)
    return data;
  };

  settleTrades = async (payload)  => {
    const data = await this.service.apiFunction("settleTrades", payload)
    return data;
  };

  createAssetTransferMethod = async (payload)  => {
    const data = await this.service.apiFunction("createAssetTransferMethod", payload)
    return data;
  };

  assetWithdrawal = async (payload)  => {
    const data = await this.service.apiFunction("assetWithdrawal", payload)
    return data;
  };

  getAccountAssetTransfers = async (payload)  => {
    const data = await this.service.apiFunction("getAccountAssetTransfers", payload)
    return data;
  };

  settleDisbursement = async (payload)  => {
    const data = await this.service.apiFunction("settleDisbursement", payload)
    return data;
  };

  getAssetDisbursements = async (payload)  => {
    const data = await this.service.apiFunction("getAssetDisbursements", payload)
    return data;
  };

  getAssetTransfers = async (payload)  => {
    const data = await this.service.apiFunction("getAssetTransfers", payload)
    return data;
  };

  getAssetTransferMethods = async (payload)  => {
    const data = await this.service.apiFunction("getAssetTransferMethods", payload)
    return data;
  };

  sandboxAssetTransferClear = async (payload)  => {
    const data = await this.service.apiFunction("sandboxAssetTransferClear", payload)
    return data;
  };

  sandboxAssetTransferSettle = async (payload)  => {
    const data = await this.service.apiFunction("sandboxAssetTransferSettle", payload)
    return data;
  };

  getAttestation = async (payload)  => {
    const data = await this.service.getAttestation(payload)
    return data;
  };

  createLinkToken = async (payload)  => {
    const data = await this.service.createLinkToken(payload)
    return data;
  };
  
  exchangePublicToken = async (payload)  => {
    const data = await this.service.exchangePublicToken(payload)
    return data;
  };
  
  getProcessorToken = async (payload)  => {
    const data = await this.service.getProcessorToken(payload)
    return data;
  };

  sendUSDCToWallet = async (payload)  => {
    const data = await this.service.sendUSDCToWallet(payload)
    return data;
  };

  sendETHToWallet = async (payload)  => {
    const data = await this.service.sendETHToWallet(payload)
    return data;
  };

  getKYCPaymentRef = async (payload)  => {
    const data = await this.service.getKYCPaymentRef(payload)
    return data;
  };

  payKYCFee = async (payload)  => {
    const data = await this.service.payKYCFee(payload)
    return data;
  };

  registerID = async (payload)  => {
    const data = await this.service.registerID(payload)
    return data;
  };

  checkKYCFee = async (payload)  => {
    const data = await this.service.checkKYCFee(payload)
    return data;
  };

  loginSignup = async (payload)  => {
    const data = await this.service.loginSignup(payload)
    return data;
  };

  exchangecurrency = async (payload)  => {
    const data = await this.service.exchangecurrency(payload)
    return data;
  };


}