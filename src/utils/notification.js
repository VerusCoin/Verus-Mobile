import {
  NOTIFICATION_TYPE_BASIC,
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

// A completed provisioning notification opens identity linking, never login replay.
export class VerusIdProvisioningNotification extends Notification {
  constructor(body, title, uid, acchash, identityAddress, chain, linkIdentity = () => {}) {
    super(body, title, NOTIFICATION_TYPE_VERUS_ID_PROVISIONING, uid, acchash);
    this.identityAddress = identityAddress;
    this.chain = chain;
    this.linkIdentity = linkIdentity;
  }

  static fromJson(json, linkIdentity) {
    const {body, title, uid, identityAddress, chain} = json;
    return new VerusIdProvisioningNotification(body, title, uid, null, identityAddress, chain, linkIdentity);
  }

  isActionable() {
    return !!this.identityAddress && !!this.chain;
  }

  onAction(props = null) {
    return this.linkIdentity(props, this.identityAddress, this.chain);
  }

  toJson() {
    return {
      body: this.body,
      title: this.title,
      type: this.type,
      uid: this.uid,
      identityAddress: this.identityAddress,
      chain: this.chain,
    };
  }
}
