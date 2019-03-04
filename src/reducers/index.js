import { combineReducers } from 'redux'
import { authentication } from './authentication'
import { coins } from './coins'
import { ledger } from './ledger'
import { settings } from './settings'

export default combineReducers({
    authentication,
    coins,
    ledger,
    settings
})