/*
  This component is simply to display the app version data and 
  mobile platform to the user. It is more for debugging or support purposes,
  and any general, non-sensitive, useful information that would help a dev
  help a user should go here.
*/

import React from 'react';
import {Platform} from 'react-native';
import {APP_VERSION} from '../../../../env/index';
import AppIconSource from '../../../images/appIconSource';
import {openUrl} from '../../../utils/linking';
import {
  SettingsAppSummary,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../components/SettingsScaffold';

const DISCORD_URL = 'https://www.verus.io/discord';
const REDDIT_URL = 'https://www.reddit.com/r/VerusCoin/';
const GITHUB_URL = 'https://github.com/VerusCoin/';
const PRIVACY_URL =
  'https://github.com/VerusCoin/Verus-Mobile/blob/master/PRIVACY.txt';
const LICENCE_URL =
  'https://github.com/VerusCoin/Verus-Mobile/blob/master/LICENCE';

const AppInfo = () => (
  <SettingsScreen testID="settings.appInfo">
    <SettingsAppSummary
      logoSource={AppIconSource}
      name="Verus Mobile"
      subtitle="Support and build information"
    />
    <SettingsSection title="Information">
      <SettingsRow icon="information-outline" title="App version" value={APP_VERSION} />
      <SettingsRow icon="cellphone" title="Platform" value={Platform.OS} />
      <SettingsRow
        icon="cellphone-information"
        last
        title="Platform version"
        value={`${Platform.Version}`}
      />
    </SettingsSection>
    <SettingsSection title="Documentation">
      <SettingsRow
        description="How Verus Mobile handles privacy"
        external
        icon="shield-check-outline"
        onPress={() => openUrl(PRIVACY_URL)}
        title="Privacy policy"
      />
      <SettingsRow
        description="How Verus Mobile is licensed"
        external
        icon="scale-balance"
        last
        onPress={() => openUrl(LICENCE_URL)}
        title="Licence"
      />
    </SettingsSection>
    <SettingsSection title="Community & news">
      <SettingsRow
        description="The Verus community Discord"
        external
        icon="message-outline"
        onPress={() => openUrl(DISCORD_URL)}
        title="Discord"
      />
      <SettingsRow
        description="The Verus subreddit"
        external
        icon="reddit"
        onPress={() => openUrl(REDDIT_URL)}
        title="Reddit"
      />
      <SettingsRow
        description="The Verus Coin GitHub"
        external
        icon="github"
        last
        onPress={() => openUrl(GITHUB_URL)}
        title="GitHub"
      />
    </SettingsSection>
  </SettingsScreen>
);

export default AppInfo;
