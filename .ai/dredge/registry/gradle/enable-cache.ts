// .ai/dredge/registry/gradle/enable-cache.ts
// Patch: ensure the Gradle build cache is enabled in gradle.properties.

import * as fs from 'fs'
import * as path from 'path'
import type { PatchPlugin, PatchContext, PatchResult } from '../../types.js'

const CACHE_ENABLED_KEY = 'org.gradle.caching'
const CACHE_ENABLED_LINE = 'org.gradle.caching=true'

/**
 * Signal shape expected by this patch.
 * The parsed contents of `gradle.properties` (as a key→value map) are passed
 * in `data`.
 */
interface GradlePropertiesSignal {
    properties?: Record<string, string>
}

function isCacheDisabledOrMissing(signal: GradlePropertiesSignal): boolean {
    const props = signal.properties ?? {}
    const value = props[CACHE_ENABLED_KEY]
    return value === undefined || value.trim().toLowerCase() !== 'true'
}

export const enableCache: PatchPlugin = {
    id: 'gradle/enable-cache',
    domain: 'gradle_config',

    match(signal: unknown): boolean {
        return isCacheDisabledOrMissing(signal as GradlePropertiesSignal)
    },

    async apply(context: PatchContext): Promise<PatchResult> {
        const filePath = path.resolve(context.repoRoot, context.filePath)

        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true })
            fs.writeFileSync(filePath, `${CACHE_ENABLED_LINE}\n`, 'utf8')
            return {
                changed: true,
                message: `Created ${context.filePath} with build cache enabled`,
            }
        }

        let content = fs.readFileSync(filePath, 'utf8')
        const lines = content.split('\n')
        let changed = false

        const existingIndex = lines.findIndex(l =>
            l.match(new RegExp(`^\\s*${CACHE_ENABLED_KEY}\\s*=`))
        )

        if (existingIndex >= 0) {
            const current = lines[existingIndex]
            // Extract the value portion (before any inline comment) and trim it
            const valueMatch = current.match(/=\s*([^#\s]*)/)
            const currentValue = valueMatch ? valueMatch[1].trim() : ''
            if (currentValue.toLowerCase() !== 'true') {
                lines[existingIndex] = CACHE_ENABLED_LINE
                content = lines.join('\n')
                changed = true
            }
        } else {
            content = content.trimEnd() + `\n${CACHE_ENABLED_LINE}\n`
            changed = true
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8')
        }

        return {
            changed,
            message: changed
                ? `Enabled Gradle build cache in ${context.filePath}`
                : `Gradle build cache already enabled in ${context.filePath}`,
        }
    },
}
