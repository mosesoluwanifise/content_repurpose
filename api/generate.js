import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// --- Transcript fetcher ---

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function parseXmlCaptions(xml) {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickTrack(tracks) {
  return (
    tracks.find(t => t.languageCode === 'en' && !t.kind) ||
    tracks.find(t => t.languageCode === 'en') ||
    tracks.find(t => t.languageCode?.startsWith('en')) ||
    tracks[0]
  )
}

// --- Transcript fetcher ---

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function parseXmlCaptions(xml) {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseJson3Captions(json3) {
  if (!json3?.events) return ''
  return json3.events
    .flatMap(e => e.segs ?? [])
    .map(s => s.utf8 ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cap(text) {
  return text.length > 12000 ? text.slice(0, 12000) + '...' : text
}

// Wraps a fetch attempt with a per-request AbortController timeout
function withTimeout(fetchPromise, ms = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetchPromise(controller.signal).finally(() => clearTimeout(timer))
}

async function tryTimedtext(videoId, signal) {
  for (const lang of ['en', 'en-US']) {
    try {
      const r = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`,
        { signal, headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
      )
      if (!r.ok) continue
      const j = await r.json()
      const text = parseJson3Captions(j)
      if (text.length > 50) return text
    } catch {}
  }
  return null
}

async function tryInnerTube(videoId, signal) {
  const r = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '19.09.37',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30, hl: 'en', gl: 'US' },
      },
    }),
  })
  const player = await r.json()
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  if (!tracks?.length) return null
  const track = pickTrack(tracks)
  if (!track?.baseUrl) return null
  const xmlRes = await fetch(track.baseUrl, { signal })
  const xml = await xmlRes.text()
  const text = parseXmlCaptions(xml)
  return text.length > 50 ? text : null
}

async function tryTVHTML5(videoId, signal) {
  const r = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en', gl: 'US' },
        thirdParty: { embedUrl: 'https://www.youtube.com/' },
      },
    }),
  })
  const player = await r.json()
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  if (!tracks?.length) return null
  const track = pickTrack(tracks)
  if (!track?.baseUrl) return null
  const xmlRes = await fetch(track.baseUrl + '&fmt=json3', { signal })
  const j = await xmlRes.json()
  const text = parseJson3Captions(j)
  return text.length > 50 ? text : null
}

async function fetchTranscript(url) {
  const videoId = extractVideoId(url)
  if (!videoId) return null

  // Run all methods in parallel — 5s timeout each — take the first non-null success
  const attempt = (fn) =>
    withTimeout(fn, 5000)
      .then(v => { if (!v) throw new Error('empty'); return v })

  try {
    const text = await Promise.any([
      attempt(sig => tryTimedtext(videoId, sig)),
      attempt(sig => tryInnerTube(videoId, sig)),
      attempt(sig => tryTVHTML5(videoId, sig)),
    ])
    console.log('[Transcript] Parallel fetch succeeded')
    return cap(text)
  } catch {
    console.log('[Transcript] All parallel methods failed for', videoId)
    return null
  }
}

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

Base ALL content strictly on this transcript. Do not invent or add anything not in it. If a field lacks enough content, write "[Insufficient transcript content]".

<transcript>
${transcript}
</transcript>

Video URL: ${url}

Step 1 — Silently analyse the speaker's voice:
- Vocabulary: simple or elevated? Scripture? Slang? Rhetorical questions?
- Rhythm: short punchy lines or long flowing sentences? Repetition for emphasis?
- Audience address: direct "you", collective "we", or third-person teaching?
- Recurring phrases, metaphors, rhetorical devices
- Emotional register: passionate, urgent, pastoral, encouraging, confrontational?

Step 2 — Write FINAL, publication-ready content that:
- Mirrors the speaker's voice so intimately that someone familiar with them recognises it instantly
- Sounds written by a real person — vary sentence length, use contractions naturally (don't, it's, you'll, we've)
- Is ${toneDesc} in tone
- Contains zero AI clichés: no "delve", "game-changer", "leverage", "cutting-edge", "crucial", "groundbreaking", "unleash", "elevate", "foster", "it's important to note", "in conclusion"
- Uses active voice; reads aloud naturally${blogOn ? "\n- Blog: editorial standalone style, not social media" : ''}${longformOn ? "\n- Long-form: flowing Facebook prose, no markdown headers, blank lines between sections" : ''}

Tasks:
1. Identify the single most important key message as one clear sentence.
2. Generate only the requested content formats, each reinforcing that key message.

Return ONLY a valid JSON object. No markdown fences, no preamble:

{
  "keyMessage": "The video's single most important insight as one complete sentence.",
  ${fields}
}`
}

// --- JSON extractor (strips markdown fences if model wraps output) ---

function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const text = fenced ? fenced[1] : raw
  return JSON.parse(text.trim())
}

// --- Humanizer removed: voice + humanization now built into the generation prompt ---

// --- Vercel Serverless Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set')
    return res.status(500).json({ error: 'Server configuration error' })
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(url.trim(), tone, activeFormats, transcript) }],
    })
    const raw = response.content[0]?.text ?? ''

    let result
    try {
      result = extractJson(raw)
    } catch {
      throw new Error('Unexpected response format from model.')
    }

    res.json(result)
  } catch (err) {
    const message = err?.message ?? String(err)
    console.error('[API Error]', message)
    res.status(500).json({ error: message })
  }
}
