import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const families = [
  ['besley', [['Besley[wght].ttf', 'besley.ttf']]],
  ['sourcesans3', [['SourceSans3[wght].ttf', 'source-sans-3.ttf']]],
  [
    'barlow',
    [
      ['Barlow-Regular.ttf', 'barlow-regular.ttf'],
      ['Barlow-Bold.ttf', 'barlow-bold.ttf'],
      ['Barlow-BoldItalic.ttf', 'barlow-bold-italic.ttf'],
    ],
  ],
  ['librebaskerville', [['LibreBaskerville[wght].ttf', 'libre-baskerville.ttf']]],
  ['courgette', [['Courgette-Regular.ttf', 'courgette.ttf']]],
  [
    'chakrapetch',
    [
      ['ChakraPetch-Regular.ttf', 'chakra-petch.ttf'],
      ['ChakraPetch-SemiBold.ttf', 'chakra-petch-semibold.ttf'],
    ],
  ],
  ['belleza', [['Belleza-Regular.ttf', 'belleza.ttf']]],
  ['manrope', [['Manrope[wght].ttf', 'manrope.ttf']]],
]
const dir = resolve('public/fonts/brands')
await mkdir(dir, { recursive: true })
const records = []
for (const [family, files] of families) {
  const root = `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/`
  const licenseUrl = root + 'OFL.txt',
    licenseResponse = await fetch(licenseUrl)
  if (!licenseResponse.ok) throw new Error(`Missing font license: ${family}`)
  const license = await licenseResponse.text()
  if (!/SIL OPEN FONT LICENSE/i.test(license)) throw new Error(`Unexpected license: ${family}`)
  await writeFile(resolve(dir, `${family}-OFL.txt`), license)
  for (const [original, local] of files) {
    const url = root + encodeURIComponent(original),
      response = await fetch(url)
    if (!response.ok) throw new Error(`Font download failed (${response.status}): ${url}`)
    const data = new Uint8Array(await response.arrayBuffer())
    if (!(
      (data[0] === 0 && data[1] === 1 && data[2] === 0 && data[3] === 0) ||
      new TextDecoder().decode(data.slice(0, 4)) === 'OTTO'
    ))
      throw new Error(`Invalid font binary: ${url}`)
    await writeFile(resolve(dir, local), data)
    records.push({
      family,
      file: local,
      source: url,
      license: 'SIL Open Font License 1.1',
      licenseFile: `${family}-OFL.txt`,
      bytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
    })
  }
}
await writeFile(resolve(dir, 'sources.json'), JSON.stringify(records, null, 2) + '\n')
console.log(
  `Bundled ${records.length} font files from ${families.length} OFL families (${Math.round(records.reduce((n, r) => n + r.bytes, 0) / 1024)} KB).`,
)
