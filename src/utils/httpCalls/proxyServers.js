import { Platform } from 'react-native';

const httpsServers = ['el1.vrsc.0x03.services', 'el2.vrsc.0x03.services'];
const httpServers = ['94.130.225.86:80', '94.130.225.86:80'];

export const httpsEnabled = false//Platform.OS === 'android' && Platform.Version <= 24 ? false : true;

export const proxyServers = httpServers//httpsEnabled ? httpsServers : httpServers;

//TODO: Setup https servers