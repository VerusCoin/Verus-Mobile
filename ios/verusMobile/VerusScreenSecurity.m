#import "VerusScreenSecurity.h"
#import <UIKit/UIKit.h>

@implementation VerusScreenSecurity {
  BOOL _hasListeners;
  BOOL _protectionEnabled;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"screenCaptureChanged"];
}

- (void)startObserving
{
  _hasListeners = YES;
  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(screenCaptureChanged:)
             name:UIScreenCapturedDidChangeNotification
           object:nil];
}

- (void)stopObserving
{
  _hasListeners = NO;
  [[NSNotificationCenter defaultCenter]
      removeObserver:self
                name:UIScreenCapturedDidChangeNotification
              object:nil];
}

- (void)screenCaptureChanged:(NSNotification *)notification
{
  if (_hasListeners && _protectionEnabled) {
    [self sendEventWithName:@"screenCaptureChanged"
                       body:@{@"captured" : @(UIScreen.mainScreen.isCaptured)}];
  }
}

RCT_EXPORT_METHOD(setProtectionEnabled:(BOOL)enabled)
{
  _protectionEnabled = enabled;
}

RCT_REMAP_METHOD(getCaptureState,
                 getCaptureStateWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@(UIScreen.mainScreen.isCaptured));
}

@end
