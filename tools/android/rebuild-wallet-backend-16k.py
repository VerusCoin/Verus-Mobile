#!/usr/bin/env python3
"""Rebuild the pinned Verus JNI backend without changing the wallet SDK API.

Requires Python 3, git, rustup with Rust 1.81.0 and its four Android targets,
Android NDK 27.0.12077973, and the existing SDK 2.1.2 backend AAR/POM.
No sibling source checkout or Maven-local artifact is modified.

Example from the Mobile repository:
  python3 tools/android/rebuild-wallet-backend-16k.py --offline

The exact SDK commit, Cargo.lock, toolchain, native patch and base AAR/POM hashes
are checked before rebuilding. Output is a versioned project-local Maven artifact
com.github.VerusCoin:verus-android-backend:2.1.2-16k.1 plus build provenance.
"""

import argparse
import hashlib
import io
import json
import os
import platform
import runpy
import shutil
import subprocess
import tarfile
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SDK_COMMIT = "f725d03c1ab93f00491bc6753848b245c7612b56"
BASE_AAR_SHA256 = "136a8760e6e8d30151db344671da9d1503cea6d737d3ac6205e95c2322335770"
BASE_POM_SHA256 = "713f1f18a0ef025b609a5f6a6b904da865ad248b63514713fc03c418df98198e"
BASE_VERSION = "2.1.2"
VERSION = "2.1.2-16k.1"
ARTIFACT = "verus-android-backend"
NDK_VERSION = "27.0.12077973"
RUST_VERSION = "1.81.0"
TARGETS = {
    "arm64-v8a": ("aarch64-linux-android", "aarch64-linux-android"),
    "armeabi-v7a": ("armv7-linux-androideabi", "armv7a-linux-androideabi"),
    "x86": ("i686-linux-android", "i686-linux-android"),
    "x86_64": ("x86_64-linux-android", "x86_64-linux-android"),
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run(command, **kwargs):
    print("+ " + " ".join(str(arg) for arg in command), flush=True)
    return subprocess.run(command, check=True, **kwargs)


def write_zip_entry(archive, name, data):
    entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    entry.compress_type = zipfile.ZIP_DEFLATED
    entry.external_attr = 0o100644 << 16
    archive.writestr(entry, data, compresslevel=9)


def jni_exports(nm, library):
    result = subprocess.check_output([
        str(nm), "--dynamic", "--defined-only", "--format=posix", str(library)
    ], text=True)
    return {line.split()[0] for line in result.splitlines()
            if line.startswith("Java_") or line.startswith("JNI_")}


def main():
    home = Path.home()
    maven = home / ".m2/repository/com/github/VerusCoin" / ARTIFACT / BASE_VERSION
    android_sdk = Path(os.environ.get("ANDROID_SDK_ROOT", os.environ.get(
        "ANDROID_HOME", str(home / "Library/Android/sdk"))))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk-source", type=Path, default=ROOT.parent / "verus-android-wallet-sdk")
    parser.add_argument("--base-aar", type=Path, default=maven / f"{ARTIFACT}-{BASE_VERSION}.aar")
    parser.add_argument("--base-pom", type=Path, default=maven / f"{ARTIFACT}-{BASE_VERSION}.pom")
    parser.add_argument("--ndk", type=Path, default=android_sdk / "ndk" / NDK_VERSION)
    parser.add_argument("--work-dir", type=Path, default=Path(tempfile.gettempdir()) / f"verus-wallet-backend-{VERSION}")
    parser.add_argument("--offline", action="store_true", help="Use only cached Cargo dependencies")
    parser.add_argument("--jobs", type=int, default=min(os.cpu_count() or 2, 8))
    args = parser.parse_args()
    for required in [args.base_aar, args.base_pom, args.ndk / "source.properties"]:
        if not required.is_file():
            parser.error(f"Missing required build input: {required}")
    if args.jobs < 1:
        parser.error("--jobs must be a positive integer")
    base_aar = args.base_aar.read_bytes()
    if sha256(base_aar) != BASE_AAR_SHA256:
        parser.error("Base AAR does not match the pinned SDK 2.1.2 artifact; rebuild/review its provenance before changing the pin.")
    base_pom = args.base_pom.read_bytes()
    if sha256(base_pom) != BASE_POM_SHA256:
        parser.error("Base POM does not match the pinned SDK 2.1.2 artifact")
    ndk_properties = (args.ndk / "source.properties").read_text()
    if f"Pkg.Revision = {NDK_VERSION}" not in ndk_properties:
        parser.error(f"Expected Android NDK {NDK_VERSION}")
    host = {"Darwin": "darwin-x86_64", "Linux": "linux-x86_64"}.get(platform.system())
    if host is None:
        parser.error("Run this rebuild on macOS or Linux")
    toolchain = args.ndk.resolve() / "toolchains/llvm/prebuilt" / host / "bin"
    rustup = shutil.which("rustup") or str(home / ".cargo/bin/rustup")
    run([rustup, "run", RUST_VERSION, "cargo", "--version"])
    patch_path = ROOT / "tools/android/patches/verus-android-wallet-sdk-16k.patch"
    source = args.work_dir.resolve() / "source"
    source.mkdir(parents=True, exist_ok=True)
    source_tar = subprocess.check_output([
        "git", "-C", str(args.sdk_source.resolve()), "archive", SDK_COMMIT,
        "backend-lib", "rust-toolchain.toml",
    ])
    # Verify every source byte against the pinned archive and patch, preserving
    # timestamps of identical files so repeated validation can reuse Cargo output.
    with tempfile.TemporaryDirectory(dir=args.work_dir.resolve()) as staging_dir:
        staging = Path(staging_dir)
        with tarfile.open(fileobj=io.BytesIO(source_tar)) as archive:
            for member in archive.getmembers():
                if member.issym() or member.islnk() or not (staging / member.name).resolve().is_relative_to(staging):
                    parser.error("Unexpected SDK archive member")
            archive.extractall(staging)
        run(["git", "apply", "--unsafe-paths", "--directory", str(staging), str(patch_path)])
        expected = set()
        for original in staging.rglob("*"):
            if original.is_file():
                relative = original.relative_to(staging)
                expected.add(relative)
                destination = source / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                if not destination.is_file() or destination.read_bytes() != original.read_bytes():
                    shutil.copyfile(original, destination)
        for existing in source.rglob("*"):
            if existing.is_file() and existing.relative_to(source) not in expected:
                existing.unlink()
    backend = source / "backend-lib"
    target_dir = args.work_dir.resolve() / "target"
    checker = runpy.run_path(str(ROOT / "tools/android/check-16k.py"))
    libraries = {}
    for abi, (target, clang_target) in TARGETS.items():
        compiler = toolchain / f"{clang_target}24-clang"
        env = os.environ.copy()
        env["CARGO_TARGET_DIR"] = str(target_dir)
        env["ANDROID_NDK_HOME"] = str(args.ndk.resolve())
        env["RUST_ANDROID_GRADLE_CC"] = str(compiler)
        env[f"CARGO_TARGET_{target.upper().replace('-', '_')}_LINKER"] = str(compiler)
        env[f"CC_{target.replace('-', '_')}"] = str(compiler)
        env[f"CXX_{target.replace('-', '_')}"] = str(compiler) + "++"
        env[f"AR_{target.replace('-', '_')}"] = str(toolchain / "llvm-ar")
        # Preserve the pinned source path in debug metadata across machines.
        env.pop("RUSTFLAGS", None)
        env["CARGO_ENCODED_RUSTFLAGS"] = f"--remap-path-prefix={source}=/verus-wallet-sdk"
        command = [rustup, "run", RUST_VERSION, "cargo", "build", "--locked", "--release",
                   "--lib", "--target", target, "--jobs", str(args.jobs)]
        if args.offline:
            command.append("--offline")
        run(command, cwd=backend, env=env)
        library_path = target_dir / target / "release/libzcashwalletsdk.so"
        # Keep the dynamic JNI symbol table and remove non-runtime symbols.
        run([str(toolchain / "llvm-strip"), "--strip-unneeded", str(library_path)])
        data = library_path.read_bytes()
        _, issues = checker["elf_issues"](data)
        if issues:
            parser.error(f"{abi} failed ELF validation: {'; '.join(issues)}")
        library_name = f"jni/{abi}/libzcashwalletsdk.so"
        original_path = args.work_dir.resolve() / "base" / abi / "libzcashwalletsdk.so"
        original_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(base_aar)) as original:
            original_path.write_bytes(original.read(library_name))
        if jni_exports(toolchain / "llvm-nm", original_path) != jni_exports(toolchain / "llvm-nm", library_path):
            parser.error(f"{abi} JNI exports differ from the base SDK; refusing API change")
        libraries[library_name] = data
        print(f"Validated {abi} LOAD and GNU_RELRO alignment", flush=True)
    output = ROOT / "android/local-maven/com/github/VerusCoin" / ARTIFACT / VERSION
    output.mkdir(parents=True, exist_ok=True)
    aar_path = output / f"{ARTIFACT}-{VERSION}.aar"
    with zipfile.ZipFile(io.BytesIO(base_aar)) as original:
        original_libraries = {name for name in original.namelist() if name.endswith(".so")}
        if original_libraries != set(libraries):
            parser.error("Unexpected base AAR native library set; refusing partial replacement")
        with zipfile.ZipFile(aar_path, "w") as archive:
            for name in sorted(original.namelist()):
                if not name.endswith("/"):
                    write_zip_entry(archive, name, libraries.get(name, original.read(name)))
    ns = "http://maven.apache.org/POM/4.0.0"
    ET.register_namespace("", ns)
    pom = ET.fromstring(base_pom)
    pom.find(f"{{{ns}}}version").text = VERSION
    # ElementTree discards Gradle-metadata markers: this artifact intentionally has
    # a POM only, with all original transitive dependencies preserved.
    pom_path = output / f"{ARTIFACT}-{VERSION}.pom"
    ET.ElementTree(pom).write(pom_path, encoding="utf-8", xml_declaration=True)
    for artifact in [aar_path, pom_path]:
        data = artifact.read_bytes()
        artifact.with_suffix(artifact.suffix + ".sha256").write_text(sha256(data) + "\n")
        artifact.with_suffix(artifact.suffix + ".sha1").write_text(hashlib.sha1(data).hexdigest() + "\n")
    provenance = {
        "sdk_commit": SDK_COMMIT, "base_aar_sha256": BASE_AAR_SHA256,
        "base_pom_sha256": sha256(base_pom), "patch_sha256": sha256(patch_path.read_bytes()),
        "cargo_lock_sha256": sha256((backend / "Cargo.lock").read_bytes()),
        "ndk": NDK_VERSION, "rust": RUST_VERSION, "android_api": 24,
        "artifact": f"com.github.VerusCoin:{ARTIFACT}:{VERSION}",
        "aar_sha256": sha256(aar_path.read_bytes()),
        "native_sha256": {name: sha256(data) for name, data in libraries.items()},
    }
    (output / "build-provenance.json").write_text(json.dumps(provenance, indent=2, sort_keys=True) + "\n")
    print(f"Created {aar_path}")


if __name__ == "__main__":
    main()
