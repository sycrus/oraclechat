/** Spoken replies for video calls: split a streamed reply into sentences and read their emotion tags. */

export const EXPRESSIONS = ["happy", "relaxed", "surprised", "sad", "neutral"] as const
export type Expression = (typeof EXPRESSIONS)[number]

export interface SpokenSentence {
  text: string
  expression: Expression
}

const KNOWN_TAG = /\[(?:happy|relaxed|surprised|sad|neutral)\]\s*/gi
const LEADING_TAG = /^\[([a-z]+)\]\s*/i
/** A leading `[word]` at the start of the text, a line, or a sentence. */
const SENTENCE_START_TAG = /(^|[.!?…]["'”’)\]]*\s+|\n)\[[a-z]+\]\s*/gi
/** End of a sentence: closing punctuation (plus quotes or brackets) followed by whitespace, or a newline. */
const BOUNDARY = /[.!?…]+["'”’)\]]*(?=\s)|\n/

/** Removes emotion tags from a whole reply, keeping its markdown and line breaks. */
export function stripTags(text: string): string {
  return text.replace(SENTENCE_START_TAG, "$1").replace(KNOWN_TAG, "").trim()
}

function toSentence(raw: string): SpokenSentence | undefined {
  let text = raw.trim()
  let expression: Expression = "neutral"
  const tag = LEADING_TAG.exec(text)
  if (tag) {
    const word = tag[1]!.toLowerCase()
    if ((EXPRESSIONS as readonly string[]).includes(word)) expression = word as Expression
    text = text.slice(tag[0].length)
  }
  text = text.replace(KNOWN_TAG, "").replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim()
  return /[\p{L}\p{N}]/u.test(text) ? { text, expression } : undefined
}

export class SpokenSplitter {
  private buffer = ""

  /** Adds a streamed chunk and returns the sentences it completed. */
  push(chunk: string): SpokenSentence[] {
    this.buffer += chunk
    const sentences: SpokenSentence[] = []
    for (let match = BOUNDARY.exec(this.buffer); match; match = BOUNDARY.exec(this.buffer)) {
      const end = match.index + match[0].length
      const sentence = toSentence(this.buffer.slice(0, end))
      if (sentence) sentences.push(sentence)
      this.buffer = this.buffer.slice(end).replace(/^\s+/, "")
    }
    return sentences
  }

  /** Returns whatever is left once the reply has finished. */
  end(): SpokenSentence[] {
    const sentence = toSentence(this.buffer)
    this.buffer = ""
    return sentence ? [sentence] : []
  }
}
