// .ai/dredge/registry/node/setup-node.ts
// Patch: add or align the .nvmrc / .node-version file to the project's engine requirement.

import * as fs from 'fs'
import * as path from 'path'
import type { PatchPlugin, PatchContext, PatchResult } from '../../types.js'

const NVMRC = '.nvmrc'
const NODE_VERSION_FILE = '.node-version'

/**
 * Signal shape expected by this patch.
 * The parsed `package.json` is passed in `data`.
 */
interface PackageJsonSignal {
    engines?: { node?: string }
    /** True when neither .nvmrc nor .node-version are present. */
    missingVersionFile?: boolean
}

function needsSetup(signal: PackageJsonSignal): boolean {
    return signal.missingVersionFile === true
}

/**
 * Extracts the minimum numeric version from an engines.node semver range.
 * e.g. ">=24.0.0" → "24", "^18" → "18", "20" → "20"
 */
function extractMinVersion(range: string): string {
    const match = range.match(/(\d+)/)
    return match ? match[1] : '20'
}

export const setupNode: PatchPlugin = {
    id: 'node/setup-node',
    domain: 'node_config',

    match(signal: unknown): boolean {
        return needsSetup(signal as PackageJsonSignal)
    },

    async apply(context: PatchContext): Promise<PatchResult> {
        const root = context.repoRoot
        const nvmrcPath = path.resolve(root, NVMRC)
        const nodeVersionPath = path.resolve(root, NODE_VERSION_FILE)

        if (fs.existsSync(nvmrcPath) || fs.existsSync(nodeVersionPath)) {
            return {
                changed: false,
                message: 'Node version file already present',
            }
        }

        // Try to read the minimum version from package.json engines field
        let version = '20'
        const pkgPath = path.resolve(root, context.filePath)
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJsonSignal
                const enginesNode = pkg.engines?.node
                if (enginesNode) {
                    version = extractMinVersion(enginesNode)
                }
            } catch {
                // Fall through to default version
            }
        }

        fs.writeFileSync(nvmrcPath, `${version}\n`, 'utf8')

        return {
            changed: true,
            message: `Created ${NVMRC} with Node.js version ${version}`,
        }
    },
}
