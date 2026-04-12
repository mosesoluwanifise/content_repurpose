import Anthropic from '@anthropic-ai/sdk'
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// --- Validation ---

const VALID_TONES   = new Set(['Conversational', 'Professional', 'Witty', 'Inspiring'])
const VALID_FORMATS = new Set(['teaser', 'takeaways', 'quote', 'longform', 'blog'])
const YT_RE = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/

function validateInput(url, tone, activeFormats) {
  if (!url || typeof url !== 'string' || !YT_RE.test(url.trim())) return 'Invalid YouTube URL.'
  if (!VALID_TONES.has(tone)) return 'Invalid tone.'
  if (!Array.isArray(activeFormats) || activeFormats.length === 0) return 'At least one format must be selected.'
  if (!activeFormats.every(f => VALID_FORMATS.has(f))) return 'Invalid format.'
  return null
}

// --- Transcript fetcher ---

async function fetchTranscript(url) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url)
    const text = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim()
    return text.length > 12000 ? text.slice(0, 12000) + '...' : text
  } catch {
    return null
  }
}

// --- Prompt builder ---

function buildPrompt(url, tone, activeFormats, transcript) {
  const toneDesc = {
    Conversational: 'conversational and relatable',
    Professional:   'professional and authoritative',
    Witty:          'witty and playful',
    Inspiring:      'inspiring and motivational',
  }[tone]

  const blogOn     = activeFormats.includes('blog')
  const longformOn = activeFormats.includes('longform')

  const fieldDefs = {
    teaser: `"teaser": "A short, scroll-stopping Facebook post of 3-5 sentences. Open with a bold statement, provocative question, or striking fact that creates a knowledge gap. Do NOT give away the answer or summarise — the goal is pure curiosity and intrigue. Close with one direct CTA sentence and the full YouTube URL on its own line."`,

    takeaways: `"takeaways": "A structured Facebook post. Start with one strong hook sentence that frames why these points matter. Then list 4-5 emoji-bulleted takeaways — each one a complete, standalone insight (not just a topic label). Every bullet should deliver real value on its own. Finish with one motivating closing sentence and the YouTube URL on its own line."`,

    quote: `"quote": "A quote-style Facebook post. Open with the single most powerful, quotable sentence from the transcript exactly as the speaker said it, placed on its own line inside quotation marks. Follow with 2-3 sentences unpacking why this matters or how listeners can apply it. End with the YouTube URL on its own line. Total body text (excluding the quote itself) should be under 200 words."`,

    longform: `"longform": "A 400-600 word Facebook-native long-form post written in the speaker's voice. Structure: (1) A 1-2 sentence hook that earns the scroll — bold, specific, and personal. (2) 2-3 teaching or story beats, each 3-4 sentences, developing the key message with substance and nuance. (3) A personal application paragraph — what should the reader think, feel, or do differently after this? Make it concrete and personal. (4) A brief closing sentence and CTA followed by the YouTube URL on its own line. Use blank line breaks between sections. NO markdown headers. Write for Facebook, not a blog — conversational flow, no bullet points in this format."`,

    blog: `"blog": "A 500-700 word editorial blog article. Opening paragraph that draws the reader in (no heading). Then 2-3 sections each with a ## heading followed by substantive paragraphs. Close with a CTA paragraph and the YouTube URL. Editorial standalone voice — clearly distinct from social media. Use \\n newlines between paragraphs. Preserve all ## heading markers exactly."`,
  }

  const fields = activeFormats.map(k => fieldDefs[k]).join(',\n  ')

  return `You are a professional content repurposing expert who specialises in capturing a speaker's authentic voice.

Below is the full transcript of the video. Base ALL content strictly on this transcript - do not invent, assume, or add anything not explicitly present in it. If the transcript lacks enough information for a field, write "[Insufficient transcript content]" for that field value.

<transcript>
${transcript}
</transcript>

Video URL: ${url}

Before writing, silently analyse the speaker's voice by observing:
- Their characteristic vocabulary and word choices (do they use simple words or elevated diction? Slang? Scripture references? Rhetorical questions?)
- Their sentence rhythm and energy (short punchy declarations? Long flowing patterns? Repetition for emphasis?)
- How they address their audience (direct "you", collective "we", or third-person teaching?)
- Any recurring phrases, metaphors, or rhetorical devices they lean on
- The emotional register: passionate, calm, urgent, pastoral, confrontational, encouraging?

Then apply that voice profile when writing every piece of content below, so that someone familiar with this speaker would immediately recognise the style. The chosen delivery tone is ${toneDesc} — honour both the speaker's voice AND this tone together.

Tasks:
1. Identify the single most important key message of this video as one clear, complete sentence.
2. Generate only the content formats listed below, each grounded in and reinforcing that key message.
3. Mirror the speaker's authentic voice and vocabulary throughout every field.${blogOn ? "\n4. For the blog post: write in an editorial standalone style that still carries the speaker's voice — not social media hype." : ''}${longformOn ? "\n4. For the long-form post: write for Facebook specifically — flowing prose, personal and direct, no markdown headers. Use blank lines between sections." : ''}

Return ONLY a valid JSON object. No markdown code fences, no preamble, no explanation:

{
  "keyMessage": "The video single most important insight as one complete sentence.",
  ${fields}
}`
}

// --- JSON extractor (strips markdown fences if model wraps output) ---

function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const text = fenced ? fenced[1] : raw
  return JSON.parse(text.trim())
}

// --- Humanizer ---

async function humanizeContent(generated, transcriptExcerpt) {
  const fieldsToHumanize = Object.entries(generated).filter(([k]) => k !== 'keyMessage')
  if (fieldsToHumanize.length === 0) return generated

  const inputJson = JSON.stringify(Object.fromEntries(fieldsToHumanize), null, 2)

  const voiceContext = transcriptExcerpt
    ? `\n\nSPEAKER VOICE REFERENCE — use this excerpt from the original transcript to calibrate the speaker's vocabulary, rhythm, and rhetorical patterns. Mirror those patterns in your rewrite:\n<voice_sample>\n${transcriptExcerpt}\n</voice_sample>`
    : ''

  const prompt = `You are a professional editor who makes AI-generated content sound like it was written by the speaker themselves.${voiceContext}

Rewrite every field in the JSON below so the text:
- Sounds like it came directly from this speaker's mouth or pen — use their vocabulary, rhythm, and rhetorical style
- Varies sentence length naturally - mix short punchy sentences with longer flowing ones
- Removes AI cliches: "delve", "it's important to note", "in conclusion", "game-changer", "leverage", "cutting-edge", "crucial", "elevate", "foster", "groundbreaking", "unleash"
- Uses contractions naturally where the speaker would (don't, it's, you'll, we've, that's)
- Has natural rhythm - reads aloud comfortably in the speaker's voice
- Avoids passive voice where active is more direct

Strict rules - do NOT break these:
- Preserve every YouTube URL exactly as written
- Preserve all emoji characters in their original positions
- Preserve all ## heading markers in the blog field
- Preserve all newlines in the blog field
- Do NOT change meaning, add new facts, or remove any key information
- Keep roughly the same length for each field

Input JSON:
${inputJson}

Return ONLY a valid JSON object with the exact same field names, with humanized values. No markdown fences, no explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = message.content[0]?.text ?? ''
  try {
    const humanized = extractJson(raw)
    return { ...generated, ...humanized }
  } catch {
    console.warn('[Humanizer] Could not parse humanized output - returning original')
    return generated
  }
}

// --- Vercel Serverless Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, tone, activeFormats } = req.body

  const validationError = validateInput(url, tone, activeFormats)
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const transcript = await fetchTranscript(url.trim())

    if (!transcript) {
      console.warn('[Transcript] Could not fetch transcript for', url)
      return res.status(422).json({
        transcriptMissing: true,
        error: 'No transcript could be retrieved for this video. It may have captions disabled, be private, or be age-restricted. Please try a different video.',
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(url.trim(), tone, activeFormats, transcript) }],
    })
    const raw = response.content[0]?.text ?? ''

    let generated
    try {
      generated = extractJson(raw)
    } catch {
      throw new Error('Unexpected response format from model.')
    }

    const voiceSample = transcript.length > 1500
      ? transcript.slice(Math.floor(transcript.length / 4), Math.floor(transcript.length / 4) + 1500)
      : transcript
    const humanized = await humanizeContent(generated, voiceSample)

    res.json(humanized)
  } catch (err) {
    const message = err?.message ?? String(err)
    console.error('[API Error]', message)
    res.status(500).json({ error: message })
  }
}
