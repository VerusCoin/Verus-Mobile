"""Keep literal x between adjacent digits in every shipped Inter18pt font.

Run with Python and fontTools. This modifies bundled Inter under its existing
SIL OFL 1.1 license (Inter-OFL.txt). Names, outlines, metrics and all other
features stay unchanged, including spaced multiplication and other calt rules.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
DIGITS = {'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'}


def adjacent_digit_x(rule, lookups):
    if getattr(rule, 'Format', None) != 3:
        return False
    back = rule.BacktrackCoverage
    ahead = rule.LookAheadCoverage
    if ([c.glyphs for c in rule.InputCoverage] != [['x']] or
            len(back) not in (1, 2) or len(ahead) != 1):
        return False
    # The one-digit rule excludes leading zero. The two-digit rule includes it.
    if not all(DIGITS - {'zero'} <= set(c.glyphs) and all(
            glyph.split('.')[0] in DIGITS or glyph in {'uni01BB', 'uni01BC'}
            for glyph in c.glyphs) for c in [*back, *ahead]):
        return False
    records = rule.SubstLookupRecord
    return len(records) == 1 and records[0].SequenceIndex == 0 and any(
        getattr(subtable, 'mapping', {}).get('x') == 'multiply.case'
        for subtable in lookups[records[0].LookupListIndex].SubTable
    )


def patch(path):
    # Lazy loading preserves the raw bytes of every table except GSUB and the
    # required head.checkSumAdjustment. Do not recalculate font timestamps.
    font = TTFont(path, lazy=True, recalcTimestamp=False)
    gsub = font['GSUB'].table
    lookups = gsub.LookupList.Lookup
    indices = {index for record in gsub.FeatureList.FeatureRecord
               if record.FeatureTag == 'calt' for index in record.Feature.LookupListIndex}
    removed = 0
    for index in sorted(indices):
        lookup = lookups[index]
        if lookup.LookupType != 6:
            continue
        kept = [rule for rule in lookup.SubTable if not adjacent_digit_x(rule, lookups)]
        removed += len(lookup.SubTable) - len(kept)
        lookup.SubTable = kept
        lookup.SubTableCount = len(kept)
    if removed not in (0, 2):
        raise ValueError(f'{path}: expected the two adjacent-digit x rules, found {removed}')
    if removed:
        font.save(path)
    font.close()
    print(f'{path.relative_to(ROOT)}: removed {removed} rules')


if __name__ == '__main__':
    for folder in ('assets/fonts', 'android/app/src/main/assets/fonts'):
        for path in sorted((ROOT / folder).glob('Inter18pt-*.ttf')):
            patch(path)
