import {describe, expect, it} from '@jest/globals'

import {HardenedXMLBuilder, UnsafeXmlCommentError} from '../../../src/security/hardened-xml-builder'

describe('HardenedXMLBuilder', () => {
    it('builds XML when comments are safe', () => {
        const builder = new HardenedXMLBuilder({
            commentPropName: '#comment',
            format: true,
            suppressEmptyNode: true
        })

        const output = builder.build({
            root: {
                '#comment': 'safe comment',
                data: 'legitimate content'
            }
        })

        expect(output).toContain('safe comment')
        expect(output).toContain('<data>legitimate content</data>')
    })

    it('rejects comment breakouts by default', () => {
        const builder = new HardenedXMLBuilder({
            commentPropName: '#comment',
            format: true,
            suppressEmptyNode: true
        })

        const target = () =>
            builder.build({
                root: {
                    '#comment': "--><script>alert('XSS')</script><!--",
                    data: 'legitimate content'
                }
            })

        expect(target).toThrow(UnsafeXmlCommentError)
        expect(target).toThrow("Unsafe XML comment payload at 'root.root.#comment'.")
    })

    it('supports custom comment property names', () => {
        const builder = new HardenedXMLBuilder({
            commentPropName: '$comment'
        })

        const target = () =>
            builder.build({
                root: {
                    $comment: 'unsafe -- comment'
                }
            })

        expect(target).toThrow(UnsafeXmlCommentError)
        expect(target).toThrow("Unsafe XML comment payload at 'root.root.$comment'.")
    })
})
