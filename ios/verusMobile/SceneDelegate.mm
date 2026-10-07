#import "SceneDelegate.h"
#import "AppDelegate.h"

#import <React/RCTLinkingManager.h>

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  UIWindowScene *windowScene = (UIWindowScene *)scene;

  // Reconnecting a scene must not mount a second copy of the React application.
  if (appDelegate.window.rootViewController != nil) {
    self.window = appDelegate.window;
    self.window.windowScene = windowScene;
    [self.window makeKeyAndVisible];
    [self scene:scene openURLContexts:connectionOptions.URLContexts];
    for (NSUserActivity *activity in connectionOptions.userActivities) {
      [self scene:scene continueUserActivity:activity];
    }
    return;
  }

  NSMutableDictionary *launchOptions =
      [appDelegate.initialLaunchOptions mutableCopy] ?: [NSMutableDictionary new];
  UIOpenURLContext *urlContext = connectionOptions.URLContexts.anyObject;
  if (urlContext != nil) {
    launchOptions[UIApplicationLaunchOptionsURLKey] = urlContext.URL;
    if (urlContext.options.sourceApplication != nil) {
      launchOptions[UIApplicationLaunchOptionsSourceApplicationKey] = urlContext.options.sourceApplication;
    }
    if (urlContext.options.annotation != nil) {
      launchOptions[UIApplicationLaunchOptionsAnnotationKey] = urlContext.options.annotation;
    }
  }
  for (NSUserActivity *activity in connectionOptions.userActivities) {
    if ([activity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb]) {
      launchOptions[UIApplicationLaunchOptionsUserActivityDictionaryKey] = @{
        UIApplicationLaunchOptionsUserActivityTypeKey : activity.activityType,
        @"UIApplicationLaunchOptionsUserActivityKey" : activity
      };
      break;
    }
  }

  self.window = [[UIWindow alloc] initWithWindowScene:windowScene];
  // Native modules, including Reanimated's keyboard observer, read this property.
  appDelegate.window = self.window;
  // Cold links must reach getInitialURL through the bridge's launch options,
  // before JS subscribes to URL events. Do not emit them a second time here.
  UIView *rootView = [appDelegate.rootViewFactory viewWithModuleName:appDelegate.moduleName
                                                 initialProperties:appDelegate.initialProps
                                                     launchOptions:launchOptions];
  UIViewController *rootViewController = [appDelegate createRootViewController];
  [appDelegate setRootView:rootView toRootViewController:rootViewController];
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts
{
  for (UIOpenURLContext *context in URLContexts) {
    NSMutableDictionary *options = [NSMutableDictionary new];
    options[UIApplicationOpenURLOptionsOpenInPlaceKey] = @(context.options.openInPlace);
    if (context.options.sourceApplication != nil) {
      options[UIApplicationOpenURLOptionsSourceApplicationKey] = context.options.sourceApplication;
    }
    if (context.options.annotation != nil) {
      options[UIApplicationOpenURLOptionsAnnotationKey] = context.options.annotation;
    }
    [RCTLinkingManager application:UIApplication.sharedApplication openURL:context.URL options:options];
  }
}

- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)userActivity
{
  [RCTLinkingManager application:UIApplication.sharedApplication
           continueUserActivity:userActivity
             restorationHandler:^(NSArray<id<UIUserActivityRestoring>> *restorableObjects) {}];
}

- (void)windowScene:(UIWindowScene *)windowScene
    didUpdateCoordinateSpace:(id<UICoordinateSpace>)previousCoordinateSpace
        interfaceOrientation:(UIInterfaceOrientation)previousInterfaceOrientation
             traitCollection:(UITraitCollection *)previousTraitCollection
{
  // Preserve RCTAppDelegate's dimension-change notification for React Native.
  [(id<UIWindowSceneDelegate>)UIApplication.sharedApplication.delegate
                  windowScene:windowScene
      didUpdateCoordinateSpace:previousCoordinateSpace
          interfaceOrientation:previousInterfaceOrientation
               traitCollection:previousTraitCollection];
}

@end
