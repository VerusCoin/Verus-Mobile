import {
  spacesLeadOrTrail,
  removeSpaces
} from '../../stringUtils'

const STRING = 'Lopado­temacho­selacho­galeo­kranio­leipsano­drim­hypo­trimmato­silphio­parao­melito­katakechy­meno­kichl­epi­kossypho­phatto­perister­alektryon­opte­kephallio­kigklo­peleio­lagoio­siraio­baphe­tragano­pterygon'
const SENTENCE = ' is a fictional dish mentioned in Aristophanes\' comedy Assemblywomen '
const SENTENCE_SPACELESS = 'isafictionaldishmentionedinAristophanes\'comedyAssemblywomen'

describe('The set of string utility functions', () => {
  it('detects leading space', () => {
    expect(spacesLeadOrTrail(' ' + STRING)).toBe(true)
  })

  it('detects trailing space', () => {
    expect(spacesLeadOrTrail(STRING + ' ')).toBe(true)
  })

  it('detects trailing and leading space', () => {
    expect(spacesLeadOrTrail(' ' + STRING + ' ')).toBe(true)
  })

  it('identifies no trailing or leading space', () => {
    expect(spacesLeadOrTrail(STRING)).toBe(false)
  })

  it('removes space from string', () => {
    expect(removeSpaces(SENTENCE)).toBe(SENTENCE_SPACELESS)
  })
})