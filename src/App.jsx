import { useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const TONES = ['Conversational', 'Professional', 'Witty', 'Inspiring']

const FORMATS = [
  { key: 'teaser',    label: 'Teaser'          },
  { key: 'takeaways', label: 'Key Takeaways'   },
  { key: 'quote',     label: 'Quote Post'      },
  { key: 'longform',  label: 'Long-Form Post'  },
  { key: 'blog',      label: 'Blog Post'       },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/.test(
    url.trim()
  )
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function readTime(words) {
  return `${Math.max(1, Math.ceil(words / 200))} min read`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LongformCard({ content, copied, onCopy }) {
  const wc = wordCount(content)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2.5 flex items-center gap-2 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">Long-Form Post</span>
        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
          Facebook
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-gray-400 text-xs">{wc} words · {readTime(wc)}</span>
        <CopyButton copied={copied} onCopy={onCopy} />
      </div>
    </div>
  )
}

function BlogContent({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return null
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="text-base font-bold text-gray-900 mt-5 mb-1.5">
              {line.slice(3)}
            </h2>
          )
        return (
          <p key={i} className="text-gray-700 text-sm leading-relaxed mb-2.5">
            {line}
          </p>
        )
      })}
    </div>
  )
}

function CopyButton({ copied, onCopy }) {
  return (
    <button
      onClick={onCopy}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 ${
        copied
          ? 'bg-green-100 text-green-700'
          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

function PostCard({ title, tag, content, footer, onCopy, copied }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2.5 flex items-center gap-2 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        {tag && (
          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-medium">
            {tag}
          </span>
        )}
      </div>
      <div className="px-5 py-4">
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-gray-400 text-xs">{footer}</span>
        <CopyButton copied={copied} onCopy={onCopy} />
      </div>
    </div>
  )
}

function BlogCard({ content, copied, onCopy }) {
  const wc = wordCount(content)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2.5 flex items-center gap-2 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">Blog Post</span>
        <span className="text-xs bg-violet-50 text-violet-500 px-2 py-0.5 rounded-full font-medium">
          Article
        </span>
      </div>
      <div className="px-5 py-5">
        <BlogContent text={content} />
      </div>
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-gray-400 text-xs">
          {wc} words · {readTime(wc)}
        </span>
        <CopyButton copied={copied} onCopy={onCopy} />
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [url,      setUrl]      = useState('')
  const [tone,     setTone]     = useState('Conversational')
  const [formats,  setFormats]  = useState({ teaser: true, takeaways: true, quote: true, longform: false, blog: true })
  const [loading,  setLoading]  = useState(false)
  const [urlError, setUrlError] = useState('')
  const [apiError, setApiError] = useState('')
  const [transcriptMissing, setTranscriptMissing] = useState(false)
  const [results,  setResults]  = useState(null)
  const [copied,   setCopied]   = useState({})

  const activeKeys = Object.entries(formats).filter(([, v]) => v).map(([k]) => k)
  const blogOn = formats.blog
  const longformOn = formats.longform

  // ── Format toggle ────────────────────────────────────────────────────────────
  function toggleFormat(key) {
    if (formats[key] && activeKeys.length === 1) return
    setFormats(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Copy ─────────────────────────────────────────────────────────────────────
  async function handleCopy(key, text) {
    await navigator.clipboard.writeText(text)
    setCopied(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000)
  }

  // ── Generate ─────────────────────────────────────────────────────────────────
  async function generate() {
    setUrlError('')
    setApiError('')
    setTranscriptMissing(false)

    if (!url.trim()) {
      setUrlError('Please paste a YouTube URL.')
      return
    }
    if (!isValidYouTubeUrl(url)) {
      setUrlError("That doesn't look like a valid YouTube URL. Expected: youtube.com/watch?v=... or youtu.be/...")
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), tone, activeFormats: activeKeys }),
      })

      let data
      const text = await response.text()
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(response.status === 504 || response.status === 502
          ? 'The request timed out. Try selecting fewer formats or a shorter video.'
          : `Server error (${response.status}). Please try again.`
        )
      }

      if (data.transcriptMissing) {
        setTranscriptMissing(true)
        return
      }
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
      setResults(data)
    } catch (err) {
      console.error('[Generation error]', err)
      setApiError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading message ──────────────────────────────────────────────────────────
  const loadingMessage = 'Generating posts… this may take a few seconds.'

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ── */}
      <header className="bg-gradient-to-br from-blue-600 to-violet-700 text-white px-4 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          YouTube → Facebook Post Generator
        </h1>
        <p className="text-blue-100 text-lg max-w-xl mx-auto">
          Turn any YouTube video into ready-to-publish Facebook posts and blog articles in seconds.
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-5">

        {/* ── URL Input ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            YouTube URL
          </label>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setUrlError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) generate() }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              urlError ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {urlError && (
            <p className="mt-1.5 text-sm text-red-600">{urlError}</p>
          )}
        </section>

        {/* ── Format Toggles ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Output Formats</p>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map(f => (
              <button
                key={f.key}
                onClick={() => toggleFormat(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                  formats[f.key]
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2.5">
            All formats active by default except Long-Form. At least one must remain selected.
            {(blogOn || longformOn) && (
              <span className="ml-1 text-violet-400">Long articles add ~15s to generation.</span>
            )}
          </p>
        </section>

        {/* ── Tone ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Tone</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map(t => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                  tone === t
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* ── Generate Button ── */}
        <button
          onClick={generate}
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all ${
            loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-200'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2.5">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {loadingMessage}
            </span>
          ) : (
            'Generate'
          )}
        </button>

        {/* ── Transcript Missing ── */}
        {transcriptMissing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm mb-1">Transcript unavailable</p>
              <p className="text-yellow-700 text-sm leading-relaxed">
                No captions could be retrieved for this video. This can happen when captions are disabled,
                the video is private, age-restricted, or very new.
              </p>
              <p className="text-yellow-600 text-sm mt-2">Please try a different video or check that captions are enabled on this one.</p>
            </div>
          </div>
        )}

        {/* ── API Error ── */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm">
            <p className="text-red-700">
              <span className="font-semibold">Error: </span>{apiError}
            </p>
            <p className="text-red-500 mt-1">Please try again.</p>
          </div>
        )}

        {/* ── Results ── */}
        {results && (
          <div className="space-y-4 pt-1">

            {/* Key Message */}
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
              <div>
                <p className="text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
                  Key Message
                </p>
                <p className="text-gray-900 font-medium leading-snug">{results.keyMessage}</p>
              </div>
            </div>

            {formats.teaser && results.teaser && (
              <PostCard
                title="Teaser"
                tag="Facebook"
                content={results.teaser}
                footer={`${results.teaser.length} characters`}
                onCopy={() => handleCopy('teaser', results.teaser)}
                copied={!!copied.teaser}
              />
            )}

            {formats.takeaways && results.takeaways && (
              <PostCard
                title="Key Takeaways"
                tag="Facebook"
                content={results.takeaways}
                footer={`${results.takeaways.length} characters`}
                onCopy={() => handleCopy('takeaways', results.takeaways)}
                copied={!!copied.takeaways}
              />
            )}

            {formats.quote && results.quote && (
              <PostCard
                title="Quote Post"
                tag="Facebook"
                content={results.quote}
                footer={`${results.quote.length} characters`}
                onCopy={() => handleCopy('quote', results.quote)}
                copied={!!copied.quote}
              />
            )}

            {formats.longform && results.longform && (
              <LongformCard
                content={results.longform}
                copied={!!copied.longform}
                onCopy={() => handleCopy('longform', results.longform)}
              />
            )}

            {formats.blog && results.blog && (
              <BlogCard
                content={results.blog}
                copied={!!copied.blog}
                onCopy={() => handleCopy('blog', results.blog)}
              />
            )}

          </div>
        )}

      </main>
    </div>
  )
}

