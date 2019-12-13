import AlertAsync from "react-native-alert-async";

const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async (...args) => {
  await delay(1000);
  return AlertAsync(...args);
}
