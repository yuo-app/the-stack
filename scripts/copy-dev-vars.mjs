/* eslint-disable no-console */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const devVarsPath = path.join(root, '.dev.vars')
const outputPath = path.join(root, '.output')
const outputDevVarsPath = path.join(outputPath, '.dev.vars')

try {
  await fs.access(devVarsPath)

  try {
    await fs.mkdir(outputPath, { recursive: true })
    await fs.copyFile(devVarsPath, outputDevVarsPath)
    console.log('Copied .dev.vars to .output/')
  }
  catch (err) {
    console.error('Error copying .dev.vars:', err)
    process.exit(1)
  }
}
catch {
  console.log('.dev.vars not found in project root, skipping copy.')
}
