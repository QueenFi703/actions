// .ai/dredge/registry/workflow/fix-action-version.ts
// Patch: upgrade pinned action references to their latest known-good SHA/tag.

import * as fs from 'fs'
import * as path from 'path'
import type { PatchPlugin, PatchContext, PatchResult } from '../../types.js'

/**
 * A mapping from action slug to the replacement reference.
 * Extend this table as new versions ship.
 */
const KNOWN_UPGRADES: Record<string, string> = {
    'actions/checkout@v2': 'actions/checkout@v4',
    'actions/checkout@v3': 'actions/checkout@v4',
    'actions/setup-java@v2': 'actions/setup-java@v4',
    'actions/setup-java@v3': 'actions/setup-java@v4',
    'actions/setup-node@v2': 'actions/setup-node@v4',
    'actions/setup-node@v3': 'actions/setup-node@v4',
    'actions/cache@v2': 'actions/cache@v4',
    'actions/cache@v3': 'actions/cache@v4',
    'actions/upload-artifact@v2': 'actions/upload-artifact@v4',
    'actions/upload-artifact@v3': 'actions/upload-artifact@v4',
    'actions/download-artifact@v2': 'actions/download-artifact@v4',
    'actions/download-artifact@v3': 'actions/download-artifact@v4',
    'gradle/gradle-build-action@v2': 'gradle/actions/setup-gradle@v4', // renamed action
    'gradle/wrapper-validation-action@v1': 'gradle/actions/wrapper-validation@v4', // renamed action
    'gradle/wrapper-validation-action@v2': 'gradle/actions/wrapper-validation@v4', // renamed action
    'gradle/wrapper-validation-action@v3': 'gradle/actions/wrapper-validation@v4', // renamed action
}

/**
 * Signal shape expected by this patch.
 * A flat list of `uses:` references found in the workflow is passed in `data`.
 */
interface ActionVersionSignal {
    usedActions?: string[]
}

function hasOutdatedAction(signal: ActionVersionSignal): boolean {
    const used = signal.usedActions ?? []
    return used.some(ref => ref in KNOWN_UPGRADES)
}

export const fixActionVersion: PatchPlugin = {
    id: 'workflow/fix-action-version',
    domain: 'workflow_yaml',

    match(signal: unknown): boolean {
        return hasOutdatedAction(signal as ActionVersionSignal)
    },

    async apply(context: PatchContext): Promise<PatchResult> {
        const filePath = path.resolve(context.repoRoot, context.filePath)
        let content = fs.readFileSync(filePath, 'utf8')
        let changed = false
        const upgrades: string[] = []

        for (const [oldRef, newRef] of Object.entries(KNOWN_UPGRADES)) {
            if (content.includes(oldRef)) {
                content = content.split(oldRef).join(newRef)
                upgrades.push(`${oldRef} → ${newRef}`)
                changed = true
            }
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8')
        }

        return {
            changed,
            message: changed
                ? `Upgraded actions in ${context.filePath}: ${upgrades.join(', ')}`
                : `No outdated action references found in ${context.filePath}`,
        }
    },
}
