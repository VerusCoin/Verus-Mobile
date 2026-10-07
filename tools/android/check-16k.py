#!/usr/bin/env python3
"""Check ELF LOAD alignment, RELRO protection and native-library APK ZIP offsets.

Usage: python3 tools/android/check-16k.py app-release.apk
       python3 tools/android/check-16k.py backend.aar --all-abis

AAR/AAB ZIP offsets are not installable APK offsets. For an AAB, also check the
APKs generated from that bundle. By default only 64-bit ELF libraries are checked.
This static check does not replace running the app on a 16 KB Android device.
"""

import argparse
import struct
import sys
import zipfile
from pathlib import Path

PAGE_SIZE = 16384


def inspect_elf(data):
    if len(data) < 16 or data[:4] != b"\x7fELF" or data[4] not in (1, 2) or data[5] not in (1, 2):
        raise ValueError("Not a supported ELF file")
    bits = 64 if data[4] == 2 else 32
    endian = "<" if data[5] == 1 else ">"
    if bits == 64:
        phoff = struct.unpack_from(endian + "Q", data, 32)[0]
        phentsize, phnum = struct.unpack_from(endian + "HH", data, 54)
        phformat = endian + "IIQQQQQQ"
    else:
        phoff = struct.unpack_from(endian + "I", data, 28)[0]
        phentsize, phnum = struct.unpack_from(endian + "HH", data, 42)
        phformat = endian + "IIIIIIII"
    if phentsize < struct.calcsize(phformat):
        raise ValueError("Invalid ELF program-header size")
    segments = []
    for index in range(phnum):
        fields = struct.unpack_from(phformat, data, phoff + index * phentsize)
        if bits == 64:
            kind, flags, offset, address, _, _, memsize, alignment = fields
        else:
            kind, offset, address, _, _, memsize, flags, alignment = fields
        segments.append((kind, offset, address, memsize, alignment, flags))
    return bits, segments


def elf_issues(data):
    bits, segments = inspect_elf(data)
    issues = []
    loads = [segment for segment in segments if segment[0] == 1]
    if not loads:
        issues.append("no LOAD segments")
    for _, offset, address, _, alignment, _ in loads:
        if alignment < PAGE_SIZE or alignment & (alignment - 1):
            issues.append(f"LOAD alignment is {alignment:#x}, expected power-of-two >= 0x4000")
        if (address - offset) % PAGE_SIZE:
            issues.append("LOAD virtual address and file offset differ modulo 16 KB")
    relro_ranges = sorted((address, address + memsize)
                          for kind, _, address, memsize, _, _ in segments
                          if kind == 0x6474E552 and memsize)
    # Bionic rounds RELRO protection to whole runtime pages. A partial final
    # page is safe when the extra bytes are padding; reject only protection of
    # writable LOAD bytes outside the declared RELRO ranges. See Android's
    # _phdr_table_set_gnu_relro_prot in linker/linker_phdr.cpp.
    mutable_ranges = []
    for _, _, address, memsize, _, flags in loads:
        if not flags & 2:  # PF_W
            continue
        cursor, load_end = address, address + memsize
        for start, end in relro_ranges:
            if end <= cursor:
                continue
            if start >= load_end:
                break
            if cursor < start:
                mutable_ranges.append((cursor, start))
            cursor = max(cursor, end)
        if cursor < load_end:
            mutable_ranges.append((cursor, load_end))
    for start, end in relro_ranges:
        page_start = start - start % PAGE_SIZE
        page_end = (end + PAGE_SIZE - 1) // PAGE_SIZE * PAGE_SIZE
        for mutable_start, mutable_end in mutable_ranges:
            overlap_start = max(page_start, mutable_start)
            overlap_end = min(page_end, mutable_end)
            if overlap_start < overlap_end:
                issues.append("16 KB GNU_RELRO protection overlaps writable LOAD "
                              f"bytes outside RELRO at {overlap_start:#x}..{overlap_end:#x}")
    return bits, issues


def inspect_path(path, all_abis=False):
    checked = 0
    failures = []
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive, path.open("rb") as raw:
            for entry in archive.infolist():
                if not entry.filename.endswith(".so"):
                    continue
                data = archive.read(entry)
                bits, issues = elf_issues(data)
                if bits != 64 and not all_abis:
                    continue
                checked += 1
                if path.suffix == ".apk" and entry.compress_type == zipfile.ZIP_STORED:
                    raw.seek(entry.header_offset)
                    header = raw.read(30)
                    if header[:4] != b"PK\x03\x04":
                        raise ValueError("Invalid ZIP local header")
                    name_length, extra_length = struct.unpack_from("<HH", header, 26)
                    offset = entry.header_offset + 30 + name_length + extra_length
                    if offset % PAGE_SIZE:
                        issues.append(f"uncompressed APK entry offset {offset:#x} is not 16 KB aligned")
                for issue in issues:
                    failures.append(f"{entry.filename}: {issue}")
    else:
        bits, issues = elf_issues(path.read_bytes())
        if bits == 64 or all_abis:
            checked = 1
            failures.extend(f"{path.name}: {issue}" for issue in issues)
    return checked, failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--all-abis", action="store_true", help="Check 32-bit libraries too")
    args = parser.parse_args()
    try:
        checked, failures = inspect_path(args.artifact, args.all_abis)
    except (OSError, ValueError, struct.error, zipfile.BadZipFile) as error:
        parser.exit(1, f"Cannot validate {args.artifact}: {error}\n")
    if not checked:
        parser.exit(1, "No matching native libraries found.\n")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        parser.exit(1, f"FAIL: {len(failures)} alignment issue(s) in {checked} libraries.\n")
    print(f"PASS: {checked} native libraries have 16 KB ELF alignment" +
          (" and compatible APK ZIP offsets." if args.artifact.suffix == ".apk" else "."))
    if args.artifact.suffix == ".aab":
        print("Also validate APKs generated from this bundle to check installation ZIP alignment.")


if __name__ == "__main__":
    main()
