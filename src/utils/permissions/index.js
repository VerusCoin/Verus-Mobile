import { request, check, RESULTS } from 'react-native-permissions';
import { Platform } from "react-native";

export const verifyPermissions = async (ios, android) => {
  const permissionCheck = await check(Platform.OS === "ios" ? ios : android)
  
  switch (permissionCheck) {
    case RESULTS.UNAVAILABLE:
    case RESULTS.BLOCKED:
      return {
        canUse: false,
        reason: permissionCheck
      }
    case RESULTS.LIMITED:
    case RESULTS.GRANTED:
      return {
        canUse: true,
        reason: permissionCheck
      }
    case RESULTS.DENIED:
      const permissionRequest = await request(Platform.OS === "ios" ? ios : android)

      switch (permissionRequest) {
        case RESULTS.LIMITED:
        case RESULTS.GRANTED:
          return {
            canUse: true,
            reason: permissionRequest
          }
        default:
          return {
            canUse: false,
            reason: permissionRequest
          }
      }
  }
}