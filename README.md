# Verus Mobile 
The iOS/Android Verus Mobile multi-coin Wallet

Welcome to the Verus Mobile multi-currency crypto wallet test release! This mobile wallet will be the core code base going forward for the Verus mobile experience, including PBaaS and crypto application support in the future. The features currently included are: 

•Multiple account support, the ability to use different keys on the same phone

•VerusPay QR scanner integration, allowing users to go from scanning a Verus QR code to being prompted with a transaction to confirm in one step

•Support for 11 different coins, with more to come soon

•The ability to create VerusPay invoices compatible with the Verus Mobile app

Feel free to report any discovered bugs, issues, or suggestions by either publicly asking for community support on one of our mobile channels at https://discord.com/invite/Mur4c8dgxD, or, for more discretion, emailing development@veruscoin.io.

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

## Package manager

This project uses pnpm via Corepack. `pnpm-lock.yaml` is the source of truth for JavaScript dependency resolution after the migration from Yarn Classic. Do not run `yarn install` when working on this project.

The pinned pnpm version is declared in `package.json` through the `packageManager` field. Use Node.js 22.13 or newer so Corepack can run that pnpm version.

## Android (on Ubuntu)

0. Clone GitHub repository, and `cd` into it

1. Install Android Studio
  - Required SDK Components:
    - Android SDK 35 (33 or higher will work)
    - System Image for Emulator (Intel x86_64)
    - NDK version 27.0.12077973 (or change `gradle.properties` to match your precise version)

2a. Add `ANDROID_HOME` to `~/.bashrc` (tested on Meerkat Release of Android Studio)
```
echo "export ANDROID_HOME=$HOME/Android/Sdk" >> ~/.bashrc
```
2b. If on Koala Release of Android Studio, these lines may be necessary instead:
```
echo "export ANDROID_SDK_ROOT=$HOME/Android/Sdk" >> ~/.bashrc
echo "export PATH=$PATH:$ANDROID_SDK_ROOT/emulator" >> ~/.bashrc
echo "export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools" >> ~/.bashrc
```
(Would advise checking if the lines are already present in file, personally)

3. Install `openjdk-17-jdk` package

4. Install `nvm`, select and use Node.js 22
```
# from https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script

# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# install version 22.22.3, or any Node.js version >= 22.13
nvm install 22.22.3

# use 22.22.3. You will need to do this before you run `pnpm` in any new terminals
nvm use 22.22.3
```
5. Enable Corepack with `corepack enable` for access to the pinned `pnpm` version

```
corepack enable
corepack pnpm --version
```

6. Install rustup, and rust toolchain 1.81.0
```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup toolchain install 1.81.0
rustup default 1.81.0
```
7. Clone `verus-android-wallet-sdk` (`master` branch) repository, build and publish Maven artifacts locally, with steps below

```
cd ~
git clone https://github.com/VerusCoin/verus-android-wallet-sdk.git
cd verus-android-wallet-sdk

# stop here and open verus-android-wallet-sdk repo in Android studio, to download gradle with proper versions

# On Ubuntu 22.04 and later, if 'python' cmd does not map to python2.7, create a local.properties, so rust can locate it
echo "rust.pythonCommand=/usr/bin/python2" >> local.properties

# then run gradle wrapper to generate local Maven artifacts
./gradlew publishToMavenLocal

# this will install the artifacts locally in ~/.m2/repository/com/github/VerusCoin/verus-android-sdk` etc by module
```
8. Run `pnpm install`

9. Open a separate window and run `pnpm start` or `pnpm exec react-native start`

10. Build and install by running `pnpm android`

## iOS (on macOS)

0. Clone the GitHub repository and cd into it with a terminal window

1. Install Xcode and the Xcode command line build tools (version >= 14.0.1)

2. Install homebrew (version >= 3.6.14)

3. Install rbenv to manage your ruby versions with `brew install rbenv ruby-build`

4. Run `rbenv init`, `rbenv install 3.4.1` and `rbenv global 3.4.1`

 - You may also need to edit `~/.zprofile` to include rbenv path before system paths:
```
echo 'eval "$(export PATH=$HOME/.rbenv/shims:$PATH)"' >> $HOME/.zprofile
```

5. Install cocoapods (version >= 1.11.3)

6. Install Node.js 22.13 or newer

via Node Version Manager:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22.22.3
nvm use 22.22.3
```

7. Enable Corepack for pnpm

```
nvm use 22.22.3
corepack enable
corepack pnpm --version
```

8. Run `pnpm install`

9. Run `cd ios && pod install`, then if successful, `cd ..`

10. Setup a rust development environment by installing sourcery with `brew install sourcery`, `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, `cargo install cargo-lipo`, and installing rustup

11. Run `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`

12. open in ios/verusmobile.xcworkspace in Xcode (DO NOT OPEN THE XCODEPROJ FILE)

13. Run `pnpm bundle-ios`

14. Run `pnpm start` in a terminal window within the Verus-Mobile directory

15. Build the project in Xcode, or with `pnpm ios`

### Troubleshooting

#### Build error containing "Permission Denied"

If Xcode fails to build with an error mentioning "permission denied", try setting user permissions on iOS/Pods/ZcashLightClientKit/ZcashLightClientKit/zcashlc/zcashlc.h to read/write and re-building through Xcode

#### Failure to compile using `cargo lipo --manifest-path`

If Xcode fails to compile the Rust component correctly, you will get an error stating that a command starting with `cargo lipo --manifest-path` failed to execute. Try copying that command in its entirety and running it in a local terminal window. If that succeeds, rebuild through Xcode.
