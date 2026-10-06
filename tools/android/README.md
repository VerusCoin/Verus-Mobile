# Android native libraries and 16 KB validation

The app uses React Native 0.77.3, Android Gradle Plugin 8.7.2 and NDK 27.0.12077973. The wallet SDK stays on its existing 2.1.2 API. Only its native backend dependency is replaced with `com.github.VerusCoin:verus-android-backend:2.1.2-16k.1`, vendored in [android/local-maven](../../android/local-maven/com/github/VerusCoin/verus-android-backend/2.1.2-16k.1/).

The replacement AAR contains the original Java classes, resources and manifest. Its four `libzcashwalletsdk.so` libraries are rebuilt from SDK commit `f725d03c1ab93f00491bc6753848b245c7612b56` with Rust 1.81.0, NDK 27.0.12077973 and Android API 24. The [native patch](patches/verus-android-wallet-sdk-16k.patch) sets both the linker's maximum and common page sizes to 16384 bytes. This aligns the ELF LOAD segments and the end of GNU_RELRO for 16 KB pages. It also retains the SDK's existing x86_64 linker workaround.

The [build provenance](../../android/local-maven/com/github/VerusCoin/verus-android-backend/2.1.2-16k.1/build-provenance.json) records the source revision, base AAR/POM hashes, patch and Cargo.lock hashes, toolchain versions, and per-ABI output hashes. The vendored AAR SHA-256 is `9888b240e6ab982d74e04740fe4ad93e51bb9fe961d104c5fda5e14c46f9e24b`.

Normal app builds read the vendored artifact. The other SDK 2.1.2 modules retain their existing Maven Local provisioning requirement; see the [project build instructions](../../README.md#prepare-the-wallet-sdk-dependencies).

## Rebuild the backend

This is a maintainer operation, separate from the normal app build. It requires:

- macOS or Linux, Python 3.9 or newer, Git and rustup.
- NDK 27.0.12077973 under `ANDROID_HOME/ndk`, `ANDROID_SDK_ROOT/ndk`, or the explicit `--ndk` path.
- A Verus Android wallet SDK Git checkout containing the pinned commit, normally at `../verus-android-wallet-sdk`.
- The exact original SDK 2.1.2 backend AAR and POM identified by the provenance hashes. The defaults read these from `~/.m2/repository/com/github/VerusCoin/verus-android-backend/2.1.2/`; use `--base-aar` and `--base-pom` for another location. A new Gradle build may produce different archive bytes, so publishing version 2.1.2 alone does not guarantee these inputs match.

From the Mobile repository root:

```sh
rustup toolchain install 1.81.0
rustup target add --toolchain 1.81.0 \
  aarch64-linux-android armv7-linux-androideabi \
  i686-linux-android x86_64-linux-android
python3 tools/android/rebuild-wallet-backend-16k.py
```

After Cargo dependencies are cached, add `--offline`. Use `--jobs` to limit build concurrency and `--work-dir` to choose a location with several GB of free space. Run `--help` for all input overrides.

The script extracts the pinned SDK source into an isolated temporary directory, applies the native patch there, and builds all four ABIs with Cargo's locked dependencies. It checks ELF alignment and compares the exported JNI symbols against the original libraries before packaging. It writes the AAR, POM, checksums and provenance into the versioned `android/local-maven` directory. It does not modify the sibling SDK checkout or overwrite Maven Local artifacts.

Review generated binaries and provenance together. If source, toolchain or base artifact inputs intentionally change, update their pins and publish a new backend artifact version with the corresponding Gradle dependency change. Do not silently reuse an existing version for different binary content.

## Conceal compatibility rebuild

The keychain dependency also uses a vendored replacement, `com.facebook.conceal:conceal:1.1.3-16k.1`, under [android/local-maven](../../android/local-maven/com/facebook/conceal/conceal/1.1.3-16k.1/). The original 1.1.3 ARM64 library has writable data sharing a 16 KB RELRO page, and its x86_64 library has 4 KB LOAD alignment. This rebuild retains the original Java classes and encrypted-data format, including support for existing credentials.

The [rebuild script](rebuild-conceal-16k.py) uses upstream tag `v.1.1.3`, commit `c8a2841bd8996faa088040ef286b03328750389e`. It recompiles the unchanged JNI C sources against the exact OpenSSL 1.0.2g static archives committed in that release. Modern Clang receives the missing `string.h` declarations through `-include`; both page-size linker flags are set to 16384, with stack-protector and FORTIFY hardening enabled. All 20 JNI exports are compared against the original library for each ABI.

The AAR preserves all nonnative file contents and replaces the four ABIs that Mobile packages: arm64-v8a, armeabi-v7a, x86 and x86_64. The obsolete ARMv5 `armeabi` library is omitted; Mobile's default architecture list already excludes it, and NDK 27 no longer supports building that ABI. [Provenance](../../android/local-maven/com/facebook/conceal/conceal/1.1.3-16k.1/build-provenance.json), checksums and upstream license notices are stored beside the artifact.

To reproduce on macOS or Linux with Python 3.9+ and NDK 27.0.12077973:

```sh
python3 tools/android/rebuild-conceal-16k.py
python3 tools/android/check-16k.py \
  android/local-maven/com/facebook/conceal/conceal/1.1.3-16k.1/conceal-1.1.3-16k.1.aar \
  --all-abis
```

The first run downloads and verifies the source archive and original Maven AAR/POM against pinned SHA-256 hashes. Later runs accept `--offline`; `--work-dir` selects the download/build cache and `--ndk` overrides the NDK location. The script writes only that work directory and the versioned project-local Maven artifact.

[ConcealNativeSmoke.java](smoke/ConcealNativeSmoke.java) is a device probe for the rebuilt JNI implementation. It uses public synthetic keys to compare AES-128/AES-256 encryption and decryption with Android's independent JCA implementation and rejects altered authentication tags. It exercises the original Conceal serialization across five payload lengths without reading or changing app credentials.

## Validate packaged libraries

Check the final release APK, including every native dependency:

```sh
for apk in android/app/build/outputs/apk/release/*.apk; do
  python3 tools/android/check-16k.py "$apk" || exit 1
done
```

The checker validates every 64-bit `.so` by default. It requires power-of-two LOAD alignment of at least 16 KB, compatible segment offsets, and 16 KB ZIP data offsets for uncompressed APK native libraries. It also checks whether rounding GNU_RELRO protection to 16 KB pages would cover writable LOAD bytes outside RELRO. An unaligned RELRO end is safe when the remaining page contains only padding. This follows the page rounding in [Android's linker](https://android.googlesource.com/platform/bionic/+/android16-release/linker/linker_phdr.cpp#1352); the dangerous case is described in the [Android RELRO guidance](https://developer.android.com/guide/practices/page-sizes#relro). Add `--all-abis` to check 32-bit libraries too. It exits unsuccessfully on any issue or when no matching native libraries are present.

Run the checker regression tests with `python3 -m unittest discover -s tools/android -p 'test_*.py'`. They cover safe padding, unsafe RELRO protection, LOAD alignment, and APK ZIP offsets.

To validate the backend itself across all four ABIs:

```sh
python3 tools/android/check-16k.py \
  android/local-maven/com/github/VerusCoin/verus-android-backend/2.1.2-16k.1/verus-android-backend-2.1.2-16k.1.aar \
  --all-abis
```

The tool also accepts `.aab` and individual `.so` files. An AAB check validates ELF layout only; generate installable APKs with bundletool and check those APKs for ZIP alignment.

Static checks must be followed by running the app on a 16 KB Android device or emulator. Confirm the device with `adb shell getconf PAGE_SIZE` (expected `16384`), then exercise startup and native wallet operations. An aligned library can still contain runtime assumptions about page size, so alignment alone is not a runtime compatibility claim.

The [native smoke runner](smoke-native-16k.py) checks the libraries extracted from a built APK on an explicitly selected 16 KB device. It initializes/reopens the wallet SQLite databases and runs the Conceal interoperability checks above using only synthetic data:

```sh
python3 tools/android/smoke-native-16k.py path/to/app-release.apk \
  --serial emulator-5554 --sdk "$ANDROID_HOME"
```

This requires Java 17+, SDK Platform 35 and Build Tools 35.0.0. It writes a unique disposable directory under `/data/local/tmp`, removes it afterward, and leaves installed wallet data untouched. It complements app startup and UI testing; it does not submit transactions or exercise the full wallet UI.

## Dependency compatibility

The React Native 0.77.3 dependency cleanup uses AsyncStorage 2.1.2, DateTimePicker 8.2.0, NetInfo 11.4.1, Haptic Feedback 2.3.4, Lottie 7.2.4, Vector Icons 10.3.0, Elements 3.4.3 (with Ratings 8.0.4), and Dialog 9.3.0. Dialog no longer brings in `react-native-modal`. The five Elements list views use its compound components, animation wrappers provide explicit dimensions, and checked-in Android icon fonts match Vector Icons 10.3.0. Future icon upgrades must refresh those fonts and the iOS font registrations together.

Nine patch files were superseded by these upgrades. Five additional patches for Camera Roll, FS, Image Picker, Keychain and UDP were removed without changing those package versions: React Native's Gradle plugin fills missing library namespaces and enables BuildConfig generation. Matching manifest package declarations produce warnings under AGP 8.7.2 and do not need source patches. Their formerly patched files were compared against the original published archives before validating the builds.

The six remaining patches are for ENS Normalize, Bitcoin Ops, React Native OS, RandomBytes, TCP and Verus. Their contents are unchanged by this cleanup. Keep AsyncStorage's NextStorage/Room configuration and Keychain 8.1.3 with the rebuilt Conceal artifact; removing a build-metadata patch is not a credential or database migration.

## Migration validation (2026-10-06)

The final debug APK, release APK and release AAB each passed the checker for all 34 packaged 64-bit native libraries. Android Build Tools `zipalign -P 16` and APK signature verification passed for both APKs. Bundletool 1.18.3 validated the final AAB and confirmed `PAGE_ALIGNMENT_16K`; its 87 generated split APKs included two native splits, with all 17 ARM64 and 17 x86_64 libraries passing ELF/RELRO and APK ZIP checks. These checks were repeated after the final JavaScript rebuild, and all 34 native libraries in the final AAB were byte-identical to those in the validated generated splits. Those generated APKs used a temporary test signing key and were not deployed.

The combined native smoke runner passed against the final release APK on a 16 KB emulator: wallet SQLite databases were created and reopened, and Conceal AES-128/AES-256 matched JCA across all ten payload cases while rejecting altered tags. Both vendored native artifacts passed checks across their four ABIs and retained the original JNI exports. The Conceal rebuild also reproduced byte-identical output from a separate source/work directory. These checks do not replace full wallet UI and transaction testing.

The release app also passed UI smoke checks on an isolated Android 15 ARM64 emulator with a verified 16,384-byte page size. These covered startup, onboarding, creation of a disposable test-network profile, encrypted profile persistence across an app restart, password unlock, Wallets/Personal/Services navigation, and dialogs. Testing exposed a native Screens fragment crash in the login modal; disabling screen detachment on the three modal stack navigators fixed it, and password unlock was repeated successfully against the rebuilt release. Camera permission, offline QR camera preview and CameraX image analysis startup passed; an actual QR decode was not tested. Only a public test mnemonic and synthetic credentials were used, with no funded transaction testing.

The same release APK installed and cold-launched successfully on a separate, disposable Android 15 ARM64 emulator with 4,096-byte pages. The welcome screen rendered without JavaScript or native startup errors. This was a startup smoke check, not a repetition of the full profile workflow above.

After the dependency cleanup, all 97 JavaScript unit suites passed (765 tests), including real upgraded Elements list views, Dialog controls and Lottie source/playback integration. The native alignment checker's ten regression tests passed. All six retained patches applied successfully and passed an exact reverse/reapply check in an isolated copy. Frozen pnpm lockfile verification passed. Repository-wide lint remains blocked by the existing ESLint 8 / older `eslint-plugin-import` incompatibility.

The upgraded debug APK, release APK and AAB built successfully and repeated the 34-library alignment, APK signature, ZIP alignment and bundletool split checks above. The packaged native wallet/database and Conceal probes also passed again on a 16 KB emulator. A disposable profile and personal-data fixture created with the preceding release survived installing the new APK over it: the correct password unlocked it, an incorrect password was rejected, and the encrypted personal data remained readable. Date selection, confirmation and cancellation passed; new personal data survived another cold restart alongside the original fixture. The upgraded Lottie loader visibly rendered and animated during unlock. All four main tabs, camera permission, preview and image analysis passed again. The upgraded release also passed clean installation, cold launch, onboarding navigation and native text input on a separate 4 KB emulator. Actual QR decoding and identity-dependent claim screens were not exercised on-device; the five migrated claim views have component-test coverage.

The companion iOS migration passed ARM64 Release builds for both the simulator and the physical-device SDK under Xcode 26.2, and both builds passed again after the dependency cleanup. The upgraded simulator build launched successfully on a fresh iPhone 16 Pro simulator running iOS 18.1 and displayed the welcome/onboarding screen without JavaScript or native startup errors. All 19 bundled icon fonts matched the installed Vector Icons package in both iOS build products and the Android source assets. The device build used `CODE_SIGNING_ALLOWED=NO`; distribution signing and installation on physical Apple hardware were not exercised. React Native 0.77 raises the minimum supported iOS version to 15.1.
