import Reactotron from "reactotron-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reactotronRedux } from 'reactotron-redux';
import sagaPlugin from 'reactotron-redux-saga';

//Reactotron.configure()
//  .connect()

const reactotron = Reactotron.configure({ name: 'VerusMobile' }) // Customize the app name
  .use(reactotronRedux()) // Connect Redux plugin
  .use(sagaPlugin()) // Connect Redux-Saga plugin
  .connect(); // Establish the connection

/*const reactotron = Reactotron.setAsyncStorageHandler(AsyncStorage)
  .configure({
    name: "VerusMobile",
  })
  .useReactNative({
    asyncStorage: true, // there are more options to the async storage.
    networking: {
      // optionally, you can turn it off with false.
      ignoreUrls: /symbolicate/,
    },
    editor: true, // there are more options to editor
    errors: { veto: (stackFrame) => false }, // or turn it off with false
    overlay: false, // just turning off overlay
  })
  .use(sagaPlugin())
  .use(reactotronRedux())
  .connect();
*/
export default reactotron
