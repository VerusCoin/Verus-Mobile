package com.verusmobile;

import android.app.Activity;
import android.view.WindowManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;

public class VerusKeepAwakeModule extends ReactContextBaseJavaModule {
  VerusKeepAwakeModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "VerusKeepAwake";
  }

  @ReactMethod
  public void activate() {
    final Activity activity = getCurrentActivity();
    if (activity == null) return;

    UiThreadUtil.runOnUiThread(
        () -> activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
  }

  @ReactMethod
  public void deactivate() {
    final Activity activity = getCurrentActivity();
    if (activity == null) return;

    UiThreadUtil.runOnUiThread(
        () -> activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
  }
}
