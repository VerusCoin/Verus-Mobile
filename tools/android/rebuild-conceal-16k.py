#!/usr/bin/env python3
"""Rebuild Conceal 1.1.3 JNI libraries without changing its encrypted-data format.

Requires Python 3.9+, NDK 27.0.12077973, and network access on the first run.
Pinned source/base artifact downloads are cached under --work-dir; --offline
requires that cache. Does not modify Gradle caches, Maven Local, or node_modules.
"""

import argparse
import hashlib
import io
import json
import os
import platform
import runpy
import subprocess
import tarfile
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COMMIT = "c8a2841bd8996faa088040ef286b03328750389e"  # upstream tag v.1.1.3
VERSION = "1.1.3-16k.1"
NDK_VERSION = "27.0.12077973"
INPUTS = {
    "conceal-source.tar.gz": (
        f"https://codeload.github.com/facebookarchive/conceal/tar.gz/{COMMIT}",
        "4a6aa6e07f0a42119b851f5914c1c6ab0ab7d394395d5e04a5aeccaa789d140a"),
    "conceal-1.1.3.aar": (
        "https://repo.maven.apache.org/maven2/com/facebook/conceal/conceal/1.1.3/conceal-1.1.3.aar",
        "81f64b8a0faac6722106e5d5d9f289bb40a02bfd9793376571d4d7e571fc36cd"),
    "conceal-1.1.3.pom": (
        "https://repo.maven.apache.org/maven2/com/facebook/conceal/conceal/1.1.3/conceal-1.1.3.pom",
        "77044a1403b732fc9810bdb23b2356aece9a881f3acbd036d4a891b9c3aaae72"),
}
TARGETS = {
    "arm64-v8a": "aarch64-linux-android",
    "armeabi-v7a": "armv7a-linux-androideabi",
    "x86": "i686-linux-android",
    "x86_64": "x86_64-linux-android",
}
SOURCES = ["gcm.c", "gcm_util.c", "hmac.c", "hmac_util.c", "pbkdf2.c", "init.c", "util.c"]
FLAGS = [
    "-shared", "-fPIC", "-fvisibility=hidden", "-Os", "-fdata-sections", "-ffunction-sections",
    "-fstack-protector-strong", "-D_FORTIFY_SOURCE=2",
    # The original sources use memcpy without including its declaration.
    "-include", "string.h", "-Wno-pointer-sign",
]
LINK_FLAGS = [
    "-llog", "-Wl,--gc-sections", "-Wl,--exclude-libs,ALL",
    "-Wl,-z,max-page-size=16384", "-Wl,-z,common-page-size=16384",
    "-Wl,-z,relro", "-Wl,-z,now", "-Wl,-soname,libconceal.so", "-Wl,--no-undefined",
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def exports(nm, path):
    output = subprocess.check_output([
        str(nm), "--dynamic", "--defined-only", "--format=posix", str(path)
    ], text=True)
    return {line.split()[0] for line in output.splitlines() if line.startswith(("Java_", "JNI_"))}


def main():
    sdk = Path(os.environ.get("ANDROID_SDK_ROOT", os.environ.get(
        "ANDROID_HOME", str(Path.home() / "Library/Android/sdk"))))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ndk", type=Path, default=sdk / "ndk" / NDK_VERSION)
    parser.add_argument("--work-dir", type=Path,
                        default=Path(tempfile.gettempdir()) / f"verus-conceal-{VERSION}")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    work = args.work_dir.resolve()
    work.mkdir(parents=True, exist_ok=True)
    properties = args.ndk / "source.properties"
    if not properties.is_file() or f"Pkg.Revision = {NDK_VERSION}" not in properties.read_text():
        parser.error(f"Expected Android NDK {NDK_VERSION} at {args.ndk}")
    host = {"Darwin": "darwin-x86_64", "Linux": "linux-x86_64"}.get(platform.system())
    if host is None:
        parser.error("Run this rebuild on macOS or Linux")
    toolchain = args.ndk.resolve() / "toolchains/llvm/prebuilt" / host / "bin"
    for name, (url, expected_hash) in INPUTS.items():
        path = work / name
        if not path.is_file():
            if args.offline:
                parser.error(f"Missing cached input: {path}")
            print(f"Downloading {name}", flush=True)
            with urllib.request.urlopen(url) as response:
                data = response.read()
            if sha256(data) != expected_hash:
                parser.error(f"Downloaded {name} does not match the pinned hash")
            path.write_bytes(data)
        if sha256(path.read_bytes()) != expected_hash:
            parser.error(f"{name} does not match the pinned hash")
    checker = runpy.run_path(str(ROOT / "tools/android/check-16k.py"))
    libraries, crypto_hashes = {}, {}
    base_aar = (work / "conceal-1.1.3.aar").read_bytes()
    with tempfile.TemporaryDirectory(dir=work) as directory:
        staging = Path(directory)
        with tarfile.open(work / "conceal-source.tar.gz") as archive:
            for member in archive.getmembers():
                if member.issym() or member.islnk() or not (staging / member.name).resolve().is_relative_to(staging):
                    parser.error("Unexpected source archive member")
            archive.extractall(staging)
        source = staging / f"conceal-{COMMIT}"
        native = source / "native/crypto"
        openssl = source / "native/third-party/openssl"
        for abi, target in TARGETS.items():
            print(f"Building {abi}", flush=True)
            library = work / abi / "libconceal.so"
            library.parent.mkdir(parents=True, exist_ok=True)
            crypto = openssl / abi / "libcrypto.a"
            crypto_hashes[abi] = sha256(crypto.read_bytes())
            command = [str(toolchain / f"{target}24-clang"), *FLAGS,
                       f"-ffile-prefix-map={source}=/conceal-1.1.3",
                       "-I" + str(native), "-I" + str(openssl / "include"),
                       *(str(native / name) for name in SOURCES), str(crypto),
                       *LINK_FLAGS, "-o", str(library)]
            subprocess.run(command, check=True)
            subprocess.run([str(toolchain / "llvm-strip"), "--strip-unneeded", str(library)], check=True)
            data = library.read_bytes()
            issues = checker["elf_issues"](data)[1]
            if issues:
                parser.error(f"{abi}: {'; '.join(issues)}")
            name = f"jni/{abi}/libconceal.so"
            original = staging / f"{abi}-original.so"
            with zipfile.ZipFile(io.BytesIO(base_aar)) as archive:
                original.write_bytes(archive.read(name))
            if exports(toolchain / "llvm-nm", original) != exports(toolchain / "llvm-nm", library):
                parser.error(f"{abi} JNI exports changed")
            libraries[name] = data
        output = ROOT / "android/local-maven/com/facebook/conceal/conceal" / VERSION
        output.mkdir(parents=True, exist_ok=True)
        aar_path = output / f"conceal-{VERSION}.aar"
        with zipfile.ZipFile(io.BytesIO(base_aar)) as original, zipfile.ZipFile(aar_path, "w") as archive:
            native_names = {n for n in original.namelist() if n.endswith(".so")}
            if native_names != set(libraries) | {"jni/armeabi/libconceal.so"}:
                parser.error("Unexpected original native library set")
            for name in sorted(original.namelist()):
                # ARMv5 armeabi is unsupported by NDK 27 and is never packaged by Mobile.
                if name.endswith("/") or name == "jni/armeabi/libconceal.so":
                    continue
                entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, libraries.get(name, original.read(name)), compresslevel=9)
        ns = "http://maven.apache.org/POM/4.0.0"
        ET.register_namespace("", ns)
        pom = ET.fromstring((work / "conceal-1.1.3.pom").read_bytes())
        pom.find(f"{{{ns}}}version").text = VERSION
        pom.find(f"{{{ns}}}packaging").text = "aar"  # upstream says aar.asc
        pom_path = output / f"conceal-{VERSION}.pom"
        ET.ElementTree(pom).write(pom_path, encoding="utf-8", xml_declaration=True)
        for artifact in [aar_path, pom_path]:
            data = artifact.read_bytes()
            for algorithm in ["sha1", "sha256"]:
                Path(str(artifact) + "." + algorithm).write_text(hashlib.new(algorithm, data).hexdigest() + "\n")
        for name in ["LICENSE", "PATENTS", "third_party_copyright_notices.txt"]:
            (output / name).write_bytes((source / name).read_bytes())
        provenance = {
            "artifact": f"com.facebook.conceal:conceal:{VERSION}", "source_commit": COMMIT,
            "inputs": {name: {"url": url, "sha256": digest} for name, (url, digest) in INPUTS.items()},
            "ndk": NDK_VERSION, "android_api": 24, "compile_flags": FLAGS,
            "link_flags": LINK_FLAGS, "openssl_static_sha256": crypto_hashes,
            "omitted_abis": ["armeabi"], "aar_sha256": sha256(aar_path.read_bytes()),
            "native_sha256": {name: sha256(data) for name, data in libraries.items()},
        }
        (output / "build-provenance.json").write_text(json.dumps(provenance, indent=2, sort_keys=True) + "\n")
        print(f"Created {aar_path}")


if __name__ == "__main__":
    main()
