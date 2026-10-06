# Verus Mobile 
The iOS/Android Verus Mobile multi-coin Wallet

Welcome to the Verus Mobile multi-currency crypto wallet test release! This mobile wallet will be the core code base going forward for the Verus mobile experience, including PBaaS and crypto application support in the future. The features currently included are: 

•Multiple account support, the ability to use different keys on the same phone

•VerusPay QR scanner integration, allowing users to go from scanning a Verus QR code to being prompted with a transaction to confirm in one step

•Support for 11 different coins, with more to come soon

•The ability to create VerusPay invoices compatible with the Verus Mobile app

Feel free to report any discovered bugs, issues, or suggestions by either publicly asking for community support on one of our mobile channels at https://discord.gg/VRKMP2S, or, for more discretion, emailing development@veruscoin.io.

# Privacy Statement
No personal data is stored or collected by the Verus Mobile application, except as necessary for authentication. All authentication data is stored locally.

The Verus Mobile application uses the following permissions for the following reasons:

•Internet connectivity: In order to fetch and post data and communicate with the blockchain through Electrum servers, the app requires internet connectivity. The signing of transactions is done locally and private keys are not shared over any network.

•Access to system alerts: In order to notify the user of important ongoing events while using the Verus Mobile application, the Verus Mobile application uses the system alert framework on both iOS and Android.

•Camera and Audio access: The Verus Mobile application's VerusPay QR code scanner is designed to read and parse VerusQR codes, or VerusPay invoices through the camera, and requires camera access to work properly. The user will be prompted to allow camera access upon first opening the VerusPay feature. Due to the current constraints of the library being used for VerusPay, the user will be asked to enable audio by default when starting VerusPay for the first time. Choosing to disable audio should in no way affect VerusPay's functionality. 

•Permission to vibrate the mobile device: The Verus Mobile application uses the vibration feature of the mobile device it is running on for VerusPay, in order to give feedback upon the scan of a QR code invoice.

•Permission to read/write to phone memory: The Verus Mobile application uses the mobile devices AsyncStorage memory storage to hold encrypted account data while the application isn't running.

# Disclaimer

THIS IS EXPERIMENTAL SOFTWARE AND IT IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

# Build Instructions

## Shared prerequisites

The app uses React Native 0.77.3 with Hermes and the legacy React Native architecture. Keep the six dependency patches in `patches/`: they retain the app's ENS/Verus behavior, random-number error handling, legacy network-module build fixes and Verus SDK packaging fixes. The other compatibility patches have been replaced by library upgrades or React Native's built-in Android Gradle support; see the [dependency compatibility notes](tools/android/README.md#dependency-compatibility).

Use Node.js 22.13 or newer and Corepack with **pnpm 11.5.2**, pinned by `package.json`. The Node 22 version used for development is recorded in `.nvmrc`. `pnpm-lock.yaml` is the authoritative JavaScript lockfile.

```sh
# With nvm installed, from the repository root:
nvm install
nvm use
corepack enable
corepack pnpm --version # Must print 11.5.2
corepack pnpm install --frozen-lockfile
```

Allow the install scripts to run; `--ignore-scripts` skips required native patches. The final patch-package subprocess uses `CI=true` so patch failures also stop local installs; the pinned patch-package 6.2.1 does not support `--error-on-fail`. The checked-in pnpm workspace configuration supplies the hoisted layout expected by the native projects. Keep the environment files configured for your build without committing API credentials.

## Android (Linux or macOS)

Install Android Studio, Java 17, Python 3, and these Android SDK components:

- Android SDK Platform 35 and Build Tools 35.0.0.
- NDK 27.0.12077973.
- Platform Tools and an emulator system image, or a connected Android device.
- Android SDK Platform 34 if building the existing wallet SDK locally as described below.

Set `ANDROID_HOME` to your SDK directory and add its `platform-tools` and `emulator` directories to `PATH`. Set `JAVA_HOME` to Java 17. The project pins Gradle 8.10.2, Android Gradle Plugin 8.7.2 and Kotlin 2.0.21; use the checked-in Gradle wrapper. The minimum Android version is API 24, and the compile and target SDK are 35.

### Prepare the wallet SDK dependencies

The app still consumes the Verus Android wallet SDK 2.1.2 Java/Kotlin modules from Maven Local. If those artifacts are not already provisioned, install [rustup](https://rustup.rs/), clone the SDK beside this repository and publish its pinned source revision:

```sh
git clone https://github.com/VerusCoin/verus-android-wallet-sdk.git ../verus-android-wallet-sdk
(
  cd ../verus-android-wallet-sdk
  git checkout f725d03c1ab93f00491bc6753848b245c7612b56
  # rust-toolchain.toml selects Rust 1.81.0 and all four Android targets.
  ./gradlew publishToMavenLocal
)
```

The native backend is replaced separately with the checked-in `com.github.VerusCoin:verus-android-backend:2.1.2-16k.1` artifact in `android/local-maven`. This preserves the SDK 2.1.2 API while adding 16 KB alignment. The same repository supplies `com.facebook.conceal:conceal:1.1.3-16k.1`, which keeps the existing keychain encryption format and Java API with rebuilt native libraries. Normal app builds consume these artifacts directly. See [native provenance and maintainer rebuild instructions](tools/android/README.md).

### Run and validate

Run Metro in one terminal and install the debug app from another:

```sh
corepack pnpm start
```

```sh
corepack pnpm android
```

To produce a release APK, configure the existing release signing properties, then build and check the resulting APKs:

```sh
(cd android && ./gradlew assembleRelease)
for apk in android/app/build/outputs/apk/release/*.apk; do
  python3 tools/android/check-16k.py "$apk" || exit 1
done
```

The checker inspects every packaged 64-bit native library for ELF alignment and uncompressed APK entry alignment. Run the app on an Android device or emulator with 16 KB pages as well; static alignment checks do not exercise the native wallet operations. For an Android App Bundle, also check APKs generated from the bundle. More details are in the [Android native build notes](tools/android/README.md).

The GitLab jobs use frozen pnpm installs and check debug/release APK alignment. The `Mobile` runner must have Node 22.13+ in the Node 22 release line, Corepack, Python 3, the Android toolchain above, and the existing SDK 2.1.2 Maven Local dependencies provisioned. `.nvmrc` records the suggested Node version; CI validates the runner's active version.

## iOS (macOS)

The app now requires **iOS 15.1 or later**. Install full Xcode and select its command-line tools. React Native 0.77 requires Xcode 15.1 or newer; this migration uses Xcode 26.2. Install Ruby 3.4.1 (for example with rbenv), Bundler 2.6.2, and [rustup](https://rustup.rs/). Run the shared pnpm installation above first.

Use the repository's Gemfile and lockfile for CocoaPods and its dependencies:

```sh
gem install bundler -v 2.6.2
bundle install
(cd ios && bundle exec pod install)
```

The Verus native module's preparation hook downloads its pinned wallet sources and builds the Rust/Swift XCFramework for devices and simulators on first installation. It installs the needed Rust targets through the SDK build scripts; allow additional time, network access and disk space for this step. Completed framework builds are reused on later installs.

Open `ios/verusMobile.xcworkspace` in Xcode, select the app scheme and configure signing. Keep Metro running with `corepack pnpm start`, then build in Xcode or run `corepack pnpm ios`. The native project retains the legacy React Native architecture. If Xcode cannot find Node, set `NODE_BINARY` in the local, untracked `ios/.xcode.env.local` to the Node executable used for the pnpm installation.
