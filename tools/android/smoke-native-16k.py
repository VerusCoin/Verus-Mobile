#!/usr/bin/env python3
"""Exercise wallet SQLite and legacy credential encryption on a 16 KB device.

Requires Java 17+, Android SDK Platform 35 / Build Tools 35.0.0 and adb.
Only writes a disposable directory under /data/local/tmp; no installed wallet
data, credentials, or network transactions are used.
"""

import argparse
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import uuid
import zipfile


def run(*args, capture=False):
    return subprocess.run(args, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--serial", required=True, help="Explicit adb device serial")
    parser.add_argument("--sdk", type=Path, default=os.environ.get("ANDROID_HOME") or
                        os.environ.get("ANDROID_SDK_ROOT"))
    args = parser.parse_args()
    if args.sdk is None:
        parser.error("Set ANDROID_HOME or pass --sdk")
    apk = args.apk.resolve(strict=True)
    adb = str(args.sdk / "platform-tools/adb")
    adb_args = (adb, "-s", args.serial)

    def shell(*command):
        return run(*adb_args, "shell", shlex.join(command), capture=True).strip()

    if shell("getconf", "PAGESIZE") != "16384":
        parser.error("The selected device must report a 16384-byte page size")
    abi = shell("getprop", "ro.product.cpu.abi")
    java_home = os.environ.get("JAVA_HOME")
    javac = str(Path(java_home) / "bin/javac") if java_home else "javac"
    android_jar = str(args.sdk / "platforms/android-35/android.jar")
    scripts = Path(__file__).parent
    conceal_aar = scripts.parents[1] / (
        "android/local-maven/com/facebook/conceal/conceal/1.1.3-16k.1/"
        "conceal-1.1.3-16k.1.aar")
    remote = "/data/local/tmp/verus-16k-smoke-" + uuid.uuid4().hex

    with tempfile.TemporaryDirectory(prefix="verus-16k-smoke-") as temporary:
        work = Path(temporary)
        with zipfile.ZipFile(apk) as archive:
            for library in ("libzcashwalletsdk.so", "libconceal.so"):
                (work / library).write_bytes(archive.read(f"lib/{abi}/{library}"))
        with zipfile.ZipFile(conceal_aar) as archive:
            (work / "conceal.jar").write_bytes(archive.read("classes.jar"))
        run(javac, "--release", "17", "-classpath",
            os.pathsep.join((android_jar, str(work / "conceal.jar"))),
            "-d", str(work), str(scripts / "smoke/WalletNativeSmoke.java"),
            str(scripts / "smoke/ConcealNativeSmoke.java"))
        run(str(args.sdk / "build-tools/35.0.0/d8"), "--min-api", "24",
            "--lib", android_jar, "--lib", str(work / "conceal.jar"),
            "--output", str(work / "probe.zip"),
            *(str(path) for path in sorted(work.glob("*.class"))))
        shell("mkdir", "-p", remote)
        try:
            run(*adb_args, "push", str(apk), remote + "/app.apk")
            run(*adb_args, "push", str(work / "probe.zip"),
                str(work / "libzcashwalletsdk.so"), str(work / "libconceal.so"), remote + "/")
            print(shell("env", f"CLASSPATH={remote}/probe.zip:{remote}/app.apk",
                        "app_process", remote, "WalletNativeSmoke",
                        remote + "/libzcashwalletsdk.so", remote + "/database"))
            print(shell("env", f"CLASSPATH={remote}/probe.zip:{remote}/app.apk",
                        "app_process", remote, "ConcealNativeSmoke", remote + "/libconceal.so"))
        finally:
            shell("rm", "-rf", remote)


if __name__ == "__main__":
    main()
