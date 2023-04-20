import { Platform } from 'react-native';

const proxyServersHttps = ['el0.verus.io', 'el1.verus.io', 'el2.verus.io','el3.verus.io'];
const proxyServersHttp = ['94.130.225.86:80', '94.130.225.86:80'];

export const httpsEnabled = Platform.OS === 'android' && Platform.Version <= 24 ? false : true;

export const proxyServers = httpsEnabled ? proxyServersHttps : proxyServersHttp;
