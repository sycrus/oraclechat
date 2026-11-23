const MAX = 80

/** A one-line, plain-text preview of a message for the chat list: Markdown markup removed, cut to 80 characters. */
export function previewText(content: string): string {
  const plain = content
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/gm, "")
    .replace(/(\*\*|__|\*|_|`|~~)/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return plain.length > MAX ? `${plain.slice(0, MAX - 1)}…` : plain
}
