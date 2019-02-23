import { combineReducers } from 'redux'
import { authentication } from './authentication'
import { coins } from './coins'
import { ledger } from './ledger'

export default combineReducers({
    authentication,
    coins,
    ledger,
})