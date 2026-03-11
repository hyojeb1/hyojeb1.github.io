import type { PhrasingContent, Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

function toPostUrl(rawTarget: string): string {
  const normalized = rawTarget
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/i, '')
    .replace(/^\/+|\/+$/g, '')
  return `/posts/${normalized}`
}

function parseWikiLink(value: string) {
  const [target, alias] = value.split('|').map((part) => part.trim())
  return {
    target,
    alias: alias || target,
  }
}

function buildInlineNodes(text: string): PhrasingContent[] {
  const nodes: PhrasingContent[] = []
  const tokenRegex = /(\[\[[^\]]+\]\])|(==[^=\n][^\n]*?==)/g
  let start = 0

  for (const match of text.matchAll(tokenRegex)) {
    const full = match[0]
    const index = match.index ?? 0

    if (index > start) {
      nodes.push({ type: 'text', value: text.slice(start, index) })
    }

    if (full.startsWith('[[') && full.endsWith(']]')) {
      const content = full.slice(2, -2)
      const { target, alias } = parseWikiLink(content)
      if (target) {
        nodes.push({
          type: 'link',
          url: toPostUrl(target),
          children: [{ type: 'text', value: alias }],
        })
      } else {
        nodes.push({ type: 'text', value: full })
      }
    } else if (full.startsWith('==') && full.endsWith('==')) {
      const markedText = full.slice(2, -2)
      nodes.push({
        type: 'strong',
        data: { hName: 'mark' },
        children: [{ type: 'text', value: markedText }],
      } as PhrasingContent)
    }

    start = index + full.length
  }

  if (start < text.length) {
    nodes.push({ type: 'text', value: text.slice(start) })
  }

  return nodes
}

export const remarkObsidianWikilinkHighlight: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node: any) => {
    if (!node?.children || !Array.isArray(node.children)) return

    const transformed: PhrasingContent[] = []
    let changed = false

    node.children.forEach((child: any) => {
      if (child.type === 'text' && /\[\[[^\]]+\]\]|==[^=\n][^\n]*?==/.test(child.value)) {
        transformed.push(...buildInlineNodes(child.value))
        changed = true
      } else {
        transformed.push(child)
      }
    })

    if (changed) {
      node.children = transformed
    }
  })
}

export default remarkObsidianWikilinkHighlight
