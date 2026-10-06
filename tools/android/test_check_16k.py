"""Regression coverage for the APK release gate; no Android toolchain required."""

import runpy
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

CHECKER = runpy.run_path(str(Path(__file__).with_name("check-16k.py")))
LOAD, RELRO = 1, 0x6474E552


def segment(kind, start, end, flags=6, alignment=0x4000, offset=None):
    return (kind, flags, start if offset is None else offset,
            start, start, end - start, end - start, alignment)


def elf(segments, bits=64):
    """Encode real program-header fields for small, synthetic layout fixtures."""
    header_size, ph_size = (64, 56) if bits == 64 else (52, 32)
    data = bytearray(header_size)
    data[:7] = b"\x7fELF" + bytes([2 if bits == 64 else 1, 1, 1])
    if bits == 64:
        struct.pack_into("<Q", data, 32, header_size)
        struct.pack_into("<HH", data, 54, ph_size, len(segments))
        data.extend(b"".join(struct.pack("<IIQQQQQQ", *s) for s in segments))
    else:
        struct.pack_into("<I", data, 28, header_size)
        struct.pack_into("<HH", data, 42, ph_size, len(segments))
        for kind, flags, offset, address, physical, filesz, memsz, alignment in segments:
            data.extend(struct.pack("<IIIIIIII", kind, offset, address, physical,
                                    filesz, memsz, flags, alignment))
    return bytes(data)


class ElfLayoutTests(unittest.TestCase):
    def test_unaligned_relro_end_with_padding_is_safe(self):
        # fbjni's layout: RELRO fills one LOAD; mutable bytes start on a later page.
        data = elf([
            segment(LOAD, 0, 0x29C90, flags=5),
            segment(LOAD, 0x2DC90, 0x2F000),
            segment(LOAD, 0x32A40, 0x33808),
            segment(RELRO, 0x2DC90, 0x2F000, flags=4, alignment=1),
        ])
        self.assertEqual(CHECKER["elf_issues"](data), (64, []))

    def test_relro_rounding_over_mutable_suffix_is_rejected(self):
        # Conceal 1.1.3 ARM64: LOAD alignment alone passes, but .data shares a page.
        data = elf([
            segment(LOAD, 0, 0x35348, flags=5, alignment=0x10000),
            segment(LOAD, 0x461F0, 0x518B8, alignment=0x10000, offset=0x361F0),
            segment(RELRO, 0x461F0, 0x51000, flags=4, alignment=1),
        ])
        issues = CHECKER["elf_issues"](data)[1]
        self.assertEqual(len(issues), 1)
        self.assertIn("0x51000..0x518b8", issues[0])

    def test_relro_rounding_over_mutable_prefix_is_rejected(self):
        data = elf([segment(LOAD, 0x4000, 0x8000),
                    segment(RELRO, 0x4800, 0x8000, flags=4, alignment=1)])
        self.assertIn("0x4000..0x4800", CHECKER["elf_issues"](data)[1][0])

    def test_adjacent_relro_regions_do_not_count_as_mutable_bytes(self):
        data = elf([segment(LOAD, 0x4000, 0x8000),
                    segment(RELRO, 0x4000, 0x4800, flags=4, alignment=1),
                    segment(RELRO, 0x4800, 0x8000, flags=4, alignment=1)])
        self.assertEqual(CHECKER["elf_issues"](data)[1], [])

    def test_4k_load_alignment_is_rejected(self):
        data = elf([segment(LOAD, 0, 0x2000, alignment=0x1000)])
        self.assertIn("LOAD alignment is 0x1000", CHECKER["elf_issues"](data)[1][0])

    def test_incongruent_load_offset_is_rejected(self):
        data = elf([segment(LOAD, 0x4000, 0x8000, offset=0x1000)])
        self.assertIn("differ modulo 16 KB", CHECKER["elf_issues"](data)[1][0])

    def test_32bit_program_header_flags_are_parsed(self):
        data = elf([segment(LOAD, 0x4000, 0x8000),
                    segment(RELRO, 0x4000, 0x5000, flags=4, alignment=1)], bits=32)
        bits, issues = CHECKER["elf_issues"](data)
        self.assertEqual(bits, 32)
        self.assertIn("0x5000..0x8000", issues[0])


class ApkZipTests(unittest.TestCase):
    def inspect_apk(self, aligned, compressed=False):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.apk"
            entry = zipfile.ZipInfo("lib/arm64-v8a/libfixture.so")
            entry.compress_type = zipfile.ZIP_DEFLATED if compressed else zipfile.ZIP_STORED
            if aligned:
                padding = 16384 - 30 - len(entry.filename.encode())
                entry.extra = struct.pack("<HH", 0xCAFE, padding - 4) + bytes(padding - 4)
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr(entry, elf([segment(LOAD, 0, 0x4000)]))
            return CHECKER["inspect_path"](path)

    def test_aligned_uncompressed_apk_is_accepted(self):
        self.assertEqual(self.inspect_apk(aligned=True), (1, []))

    def test_unaligned_uncompressed_apk_is_rejected(self):
        checked, issues = self.inspect_apk(aligned=False)
        self.assertEqual(checked, 1)
        self.assertIn("uncompressed APK entry offset", issues[0])

    def test_compressed_libraries_do_not_need_zip_alignment(self):
        self.assertEqual(self.inspect_apk(aligned=False, compressed=True), (1, []))


if __name__ == "__main__":
    unittest.main()
