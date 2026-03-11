import type { Blockquote, Paragraph, Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const calloutToAdmonition: Record<string, string> = {
  note: 'note',
  info: 'note',
  abstract: 'note',
  summary: 'note',
  tldr: 'note',
  tip: 'tip',
  hint: 'tip',
  important: 'important',
  success: 'important',
  check: 'important',
  done: 'important',
  question: 'caution',
  help: 'caution',
  faq: 'caution',
  warning: 'warning',
  caution: 'caution',
  attention: 'warning',
  failure: 'warning',
  danger: 'warning',
  bug: 'warning',
}

function extractCalloutMeta(paragraph: Paragraph) {
  const first = paragraph.children[0]
  if (!first || first.type !== 'text') return null

  const match = first.value.match(/^\[!([a-zA-Z]+)\][+-]?\s*(.*)$/)
  if (!match) return null

  const calloutType = match[1].toLowerCase()
  const title = match[2]?.trim() || calloutType

  first.value = first.value.replace(/^\[![a-zA-Z]+\][+-]?\s*/, '')
  if (first.value.length === 0) {
    paragraph.children.shift()
  }

  return { calloutType, title }
}

export const remarkObsidianCallout: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node, index, parent) => {
    if (!parent || index === undefined || node.type !== 'blockquote') return

    const blockquote = node as Blockquote
    const firstChild = blockquote.children[0]
    if (!firstChild || firstChild.type !== 'paragraph') return

    const meta = extractCalloutMeta(firstChild)
    if (!meta) return

    const mappedType = calloutToAdmonition[meta.calloutType] || 'note'

    const titleParagraph: Paragraph = {
      type: 'paragraph',
      data: { directiveLabel: true },
      children: [{ type: 'text', value: meta.title }],
    }

    const children = [...blockquote.children]
    if (firstChild.children.length === 0) {
      children.shift()
    }

    parent.children[index] = {
      type: 'containerDirective',
      name: mappedType,
      children: [titleParagraph, ...children],
    } as any
  })
}

export default remarkObsidianCallout
