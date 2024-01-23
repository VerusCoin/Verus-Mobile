import {
  NOTIFICATION_TYPE_BASIC,
  NOTIFICATION_TYPE_DEEPLINK,
  NOTIFICATION_TYPE_LOADING,
  NOTIFICATION_TYPE_NAVIGATION,
  NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
} from './constants/notifications';

import getUid from './uid'

export class Notification {
  constructor(body, title, type, uid, acchash) {
    this.body = body;
    this.title = title;
    this.type = type;
    this.uid = uid == null ? getUid() : uid
    this.acchash = acchash
    this.icon = null
  }

  static fromJson(json) {
    const {body, title, type, uid} = json;
    return new Notification(body, title, type, uid);
  }

  toJson() {
    return {
      body: this.body,
      title: this.title,
      type: this.type,
    };
  }

  isActionable() {
    return typeof this.onAction === 'function';
  }
}

export class BasicNotification extends Notification {
  constructor(body, title, uid, acchash) {
    super(body, title, NOTIFICATION_TYPE_BASIC, uid, acchash)
  }

  static fromJson(json) {
    const {body, title, uid} = json;
    return new BasicNotification(body, title, uid);
  }
}

export class NavigationNotification extends Notification {
  constructor(body, title, navigate = () => {}, uid, acchash) {
    super(body, title, NOTIFICATION_TYPE_NAVIGATION, uid, acchash)

    this.navigate = navigate
  }

  static fromJson(json, navigate) {
    const {body, title, uid} = json;
    return new NavigationNotification(body, title, navigate, uid);
  }

  onAction() {
    return this.navigate()
  }
}

export class LoadingNotification extends Notification {
  constructor(body, title, uid, acchash) {
    super(body, title, NOTIFICATION_TYPE_LOADING, uid, acchash)
  }

  static fromJson(json) {
    const {body, title, uid} = json;
    return new LoadingNotification(body, title, uid);
  }
}

export class DeeplinkNotification extends Notification {
  constructor(body, title, reopen = () => {}, uid, uri, acchash, fromService = null) {
    super(body, title, NOTIFICATION_TYPE_DEEPLINK, uid, acchash)
    this.uri = uri
    this.reopen = reopen
    this.fromService = fromService
  }

  static fromJson(json, reopen) {
    const {body, title, uid, uri, fromService} = json;
    return new DeeplinkNotification(body, title, reopen, uid, uri, null , fromService);
  }

  onAction(props = null) {
    return this.reopen(props, this.uri, this.fromService)
  }

  toJson() {
    return {
      body: this.body,
      title: this.title,
      type: this.type,
      uid: this.uid,
      uri: this.uri,
      fromService: this.fromService
    };
  }
}

export class VerusIdProvisioningNotification extends DeeplinkNotification {
  constructor(body, title, reopen = () => {}, uid, uri, acchash, fqn, fromService) {
    super(body, title, reopen, uid, uri, acchash, fromService)
    this.type = NOTIFICATION_TYPE_VERUS_ID_PROVISIONING
    this.fqn = fqn

  }

  static fromJson(json, reopen) {
    const {body, title, uid, uri, fqn, fromService} = json;
    return new VerusIdProvisioningNotification(body, title, reopen, uid, uri, null, fqn, fromService);
  }

  onAction(props = null) {
    return this.reopen(props, this.uri, this.fromService, this.fqn)
  }

  toJson() {
    return {
      body: this.body,
      title: this.title,
      type: this.type,
      uid: this.uid,
      uri: this.uri,
      fqn: this.fqn,
      fromService: this.fromService

    };
  }
}