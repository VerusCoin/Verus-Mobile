package com.verusmobile;

import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowInsets;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MainActivity extends ReactActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Let React recreate screens instead of restoring detached native fragments.
    super.onCreate(null);
    observeKeyboardResize();
  }

  /**
   * React Native (Android 11+) sends "keyboardDidShow" once, when the IME turns
   * visible, with the IME size at that moment. IMEs such as Gboard can still
   * resize in the next frames (text layout, then numeric pad), and RN sends no
   * second event. Re-send "keyboardDidShow" when the IME inset changes while it
   * stays visible, so JS (Keyboard, KeyboardAvoidingView, custom avoiders)
   * always ends with the final frame.
   */
  private void observeKeyboardResize() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      return; // RN's legacy path already reports height changes.
    }
    final View decor = getWindow().getDecorView();
    final Rect visible = new Rect();
    final int[] lastIme = {-1};
    decor.getViewTreeObserver().addOnGlobalLayoutListener(
        new ViewTreeObserver.OnGlobalLayoutListener() {
          @Override
          public void onGlobalLayout() {
            WindowInsets insets = decor.getRootWindowInsets();
            if (insets == null || !insets.isVisible(WindowInsets.Type.ime())) {
              lastIme[0] = -1;
              return;
            }
            int ime = insets.getInsets(WindowInsets.Type.ime()).bottom;
            int previous = lastIme[0];
            lastIme[0] = ime;
            // The first show is reported by React Native itself.
            if (previous == -1 || previous == ime) {
              return;
            }
            ReactContext context = getReactInstanceManager().getCurrentReactContext();
            if (context == null) {
              return;
            }
            float density = getResources().getDisplayMetrics().density;
            int bars = insets.getInsets(WindowInsets.Type.systemBars()).bottom;
            decor.getWindowVisibleDisplayFrame(visible);
            WritableMap frame = Arguments.createMap();
            frame.putDouble("screenX", visible.left / density);
            frame.putDouble("screenY", visible.bottom / density);
            frame.putDouble("width", visible.width() / density);
            frame.putDouble("height", (ime - bars) / density);
            WritableMap event = Arguments.createMap();
            event.putMap("endCoordinates", frame);
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("keyboardDidShow", event);
          }
        });
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "verusmobile";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled()
        );
  }
}
