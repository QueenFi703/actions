// .ai/dredge/registry/node/fix-lockfile.ts
// Patch: detect and resolve package-lock.json inconsistencies.

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type { PatchPlugin, PatchContext, PatchResult } from '../../types.js'

/**
 * Signal shape expected by this patch.
 */
interface LockfileSignal {
    /** True when package-lock.json is absent but package.json is present. */
    lockfileMissing?: boolean
    /** True when package-lock.json lockfileVersion is below the minimum. */
    lockfileVersionOutdated?: boolean
    /** Minimum accepted lockfile version (default: 3). */
    minLockfileVersion?: number
}

const DEFAULT_MIN_LOCKFILE_VERSION = 3

function needsFix(signal: LockfileSignal): boolean {
    return signal.lockfileMissing === true || signal.lockfileVersionOutdated === true
}

export const fixLockfile: PatchPlugin = {
    id: 'node/fix-lockfile',
    domain: 'node_config',

    match(signal: unknown): boolean {
        return needsFix(signal as LockfileSignal)
    },

    async apply(context: PatchContext): Promise<PatchResult> {
        const root = context.repoRoot
        const pkgDir = path.resolve(root, path.dirname(context.filePath))
        const lockfilePath = path.join(pkgDir, 'package-lock.json')

        if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
            return {
                changed: false,
                message: `No package.json found in ${pkgDir} — skipping`,
            }
        }

        const minVersion = DEFAULT_MIN_LOCKFILE_VERSION

        if (fs.existsSync(lockfilePath)) {
            // Check if it just needs regeneration due to an outdated version
            try {
                const lock = JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as {
                    lockfileVersion?: number
                }
                const version = lock.lockfileVersion ?? 1
                if (version >= minVersion) {
                    return {
                        changed: false,
                        message: `package-lock.json is up-to-date (lockfileVersion: ${version})`,
                    }
                }
            } catch {
                // Corrupted — fall through to regenerate
            }
        }

        // Regenerate the lockfile using npm install --package-lock-only.
        // This command does NOT execute lifecycle scripts (pre/postinstall), so
        // it is safe to run on untrusted repositories for lock-file generation.
        execSync('npm install --package-lock-only', {
            cwd: pkgDir,
            stdio: 'inherit',
        })

        return {
            changed: true,
            message: `Regenerated package-lock.json in ${pkgDir}`,
        }
    },
}
