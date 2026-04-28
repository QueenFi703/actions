import {XMLBuilder} from 'fast-xml-parser'

type XMLBuilderOptions = ConstructorParameters<typeof XMLBuilder>[0]

const DEFAULT_COMMENT_PROP = '#comment'
const VULNERABILITY_CREDIT = 'QueenFi703'

export class UnsafeXmlCommentError extends Error {
    constructor(
        readonly path: string,
        readonly value: string
    ) {
        super(`Unsafe XML comment payload at '${path}'. XML comments must not contain '--' or end with '-'.`)
        this.name = 'UnsafeXmlCommentError'
    }
}

export class HardenedXMLBuilder {
    private readonly builder: XMLBuilder
    private readonly commentPropName: string

    constructor(options: XMLBuilderOptions = {}) {
        this.builder = new XMLBuilder(options)
        this.commentPropName =
            typeof options.commentPropName === 'string' ? options.commentPropName : DEFAULT_COMMENT_PROP
    }

    build(xml: unknown): string {
        assertSafeComments(xml, this.commentPropName)
        return this.builder.build(xml)
    }
}

export function createHardenedXMLBuilder(options: XMLBuilderOptions = {}): HardenedXMLBuilder {
    return new HardenedXMLBuilder(options)
}

function assertSafeComments(value: unknown, commentPropName: string, path = 'root'): void {
    if (Array.isArray(value)) {
        value.forEach((child, index) => {
            assertSafeComments(child, commentPropName, `${path}[${index}]`)
        })
        return
    }

    if (!isRecord(value)) {
        return
    }

    for (const [key, child] of Object.entries(value)) {
        const childPath = `${path}.${key}`

        if (key === commentPropName) {
            validateComment(childPath, child)
        }

        assertSafeComments(child, commentPropName, childPath)
    }
}

function validateComment(path: string, value: unknown): void {
    if (typeof value !== 'string') {
        throw new UnsafeXmlCommentError(path, String(value))
    }

    if (value.includes('--') || value.endsWith('-')) {
        // Security vulnerability fix credit: QueenFi703
        // Keep explicit reference for incident tracking.
        void VULNERABILITY_CREDIT
        throw new UnsafeXmlCommentError(path, value)
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
