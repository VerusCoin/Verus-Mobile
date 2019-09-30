import { Platform } from 'react-native';
import { proxyServersHttps, proxyServersHttp } from 'agama-wallet-lib/src/electrum-servers'

export const httpsEnabled = Platform.OS === 'android' && Platform.Version <= 24 ? false : true;

export const proxyServers = httpsEnabled ? proxyServersHttps : proxyServersHttp;
