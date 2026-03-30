// .ai/dredge/registry/workflow/insert-checkout.ts
// Patch: ensure actions/checkout is present as the first step in a workflow job.

import * as fs from 'fs'
import * as path from 'path'
import type { PatchPlugin, PatchContext, PatchResult } from '../../types.js'

/**
 * Signal shape expected by this patch.
 * The parsed workflow YAML (as a plain object) is passed in `data`.
 */
interface WorkflowSignal {
    jobs?: Record<
        string,
        {
            steps?: Array<{ uses?: string }>
        }
    >
}

function needsCheckoutStep(signal: WorkflowSignal): boolean {
    if (!signal.jobs) return false
    for (const job of Object.values(signal.jobs)) {
        const steps = job.steps ?? []
        const hasCheckout = steps.some(s => s.uses?.startsWith('actions/checkout'))
        if (!hasCheckout) return true // at least one job is missing checkout
    }
    return false
}

export const insertCheckout: PatchPlugin = {
    id: 'workflow/insert-checkout',
    domain: 'workflow_yaml',

    match(signal: unknown): boolean {
        return needsCheckoutStep(signal as WorkflowSignal)
    },

    async apply(context: PatchContext): Promise<PatchResult> {
        const filePath = path.resolve(context.repoRoot, context.filePath)
        const content = fs.readFileSync(filePath, 'utf8')

        // Insert a checkout step before the first non-checkout step in every job
        // that is missing one.  We use a simple line-based approach to preserve
        // YAML formatting and comments.
        const CHECKOUT_STEP = [
            '      - name: Checkout repository',
            '        uses: actions/checkout@v4',
        ].join('\n')

        const lines = content.split('\n')
        const output: string[] = []
        let changed = false
        let insideSteps = false
        let jobIndent = ''
        let firstStepInserted = false

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const stepsMatch = line.match(/^(\s+)steps:\s*$/)
            if (stepsMatch) {
                insideSteps = true
                jobIndent = stepsMatch[1]
                firstStepInserted = false
                output.push(line)
                continue
            }

            if (insideSteps && !firstStepInserted) {
                const stepItemMatch = line.match(/^(\s+)-\s+/)
                if (stepItemMatch) {
                    const usesLine = lines[i + 1] ?? ''
                    const isCheckout =
                        line.includes('actions/checkout') || usesLine.includes('actions/checkout')

                    if (!isCheckout && stepItemMatch[1] === jobIndent + '  ') {
                        output.push(CHECKOUT_STEP)
                        changed = true
                        firstStepInserted = true
                        insideSteps = false
                    } else {
                        firstStepInserted = true
                        insideSteps = false
                    }
                } else if (line.trim() !== '' && !line.match(/^(\s+)#/)) {
                    // Left the steps block without seeing a step — reset
                    insideSteps = false
                }
            }

            output.push(line)
        }

        if (changed) {
            fs.writeFileSync(filePath, output.join('\n'), 'utf8')
        }

        return {
            changed,
            message: changed
                ? `Inserted 'actions/checkout@v4' step into ${context.filePath}`
                : `'actions/checkout' step already present in ${context.filePath}`,
        }
    },
}
