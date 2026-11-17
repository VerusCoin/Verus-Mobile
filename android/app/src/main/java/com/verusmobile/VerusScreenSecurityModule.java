package com.verusmobile;

import android.app.Activity;
import android.view.WindowManager;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;

public class VerusScreenSecurityModule extends ReactContextBaseJavaModule {
  VerusScreenSecurityModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "VerusScreenSecurity";
  }

  @ReactMethod
  public void setProtectionEnabled(boolean enabled) {
    final Activity activity = getCurrentActivity();
    if (activity == null) return;

    UiThreadUtil.runOnUiThread(
        () -> {
          if (enabled) {
            activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
          } else {
            activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
          }
        });
  }

  @ReactMethod
  public void getCaptureState(Promise promise) {
    promise.resolve(false);
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Required by NativeEventEmitter. Android blocks capture with FLAG_SECURE.
  }

  @ReactMethod
  public void removeListeners(double count) {
    // Required by NativeEventEmitter. Android does not emit capture events.
  }
}
