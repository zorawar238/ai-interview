import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const destinationHref = user ? '/dashboard' : '/login'
  const primaryCtaText = user ? 'Go to Dashboard →' : 'Start Practicing Free →'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <span className="font-mono font-bold text-lg text-white">/&gt;</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                DevInterview<span className="text-indigo-400">.ai</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono -mt-1">Local & Private</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#rubric" className="hover:text-white transition-colors">
              Evaluation Rubric
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/zorawar238/ai-interview"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>

            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32">
          {/* Ambient Background Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent blur-[120px] pointer-events-none -z-10" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">100% Local AI with Ollama</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Zero Cloud Costs & No Data Leakage</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
              Master Technical Interviews with{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
                Adaptive Local AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed">
              Practice realistic coding challenges, system design, and role-specific architecture scenarios.
              Get instant rubric scores, granular feedback, and progressive hints—powered by your local machine.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href={destinationHref}
                id="hero-start-cta"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2"
              >
                {primaryCtaText}
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 font-medium text-zinc-300 hover:text-white transition-all text-sm flex items-center justify-center gap-2"
              >
                See How It Works ↓
              </a>
            </div>

            {/* Live Interactive Preview / Mock Terminal */}
            <div className="pt-10 max-w-4xl mx-auto text-left">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/80">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-xs font-mono text-zinc-400">
                      interview-workspace :: typescript-v5 :: llama3.2-adaptive
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sandbox Active
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 hidden sm:inline-block">
                      Live Workspace Preview
                    </span>
                  </div>
                </div>

                {/* Workspace Action Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/60 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-zinc-800/80 text-white font-medium flex items-center gap-1.5">
                      <span>💻</span> solution.ts
                    </span>
                    <span className="px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer">
                      <span>🎙️</span> Architecture Notes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700/60 text-[11px] flex items-center gap-1">
                      <span>🔊</span> Read Aloud
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-[11px] flex items-center gap-1">
                      <span>💬</span> AI Interviewer
                    </span>
                  </div>
                </div>

                {/* Simulated Interview Interaction */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Question */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono">
                        Question 1 • Algorithms & Data Structures
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                        Difficulty: Medium
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-medium text-zinc-200 leading-relaxed">
                      &ldquo;Implement an LRU Cache with $O(1)$ average time complexity for both <code className="text-indigo-300 font-mono">get(key)</code> and <code className="text-indigo-300 font-mono">put(key, value)</code> operations. Explain memory bounds and eviction policies.&rdquo;
                    </p>
                  </div>

                  {/* Monaco Code Snippet */}
                  <div className="rounded-xl bg-zinc-950/90 border border-zinc-800/80 p-4 font-mono text-xs text-zinc-300 space-y-1 overflow-x-auto">
                    <div className="text-zinc-500">// TypeScript Solution with Doubly-Linked List & Hash Map</div>
                    <div><span className="text-purple-400">class</span> <span className="text-yellow-300">LRUCache</span> {'{'}</div>
                    <div className="pl-4"><span className="text-purple-400">private</span> capacity: <span className="text-blue-400">number</span>;</div>
                    <div className="pl-4"><span className="text-purple-400">private</span> map = <span className="text-purple-400">new</span> <span className="text-yellow-300">Map</span>&lt;<span className="text-blue-400">number</span>, <span className="text-yellow-300">Node</span>&gt;();</div>
                    <div className="pl-4"><span className="text-blue-400">get</span>(key: <span className="text-blue-400">number</span>): <span className="text-blue-400">number</span> {'{'} <span className="text-zinc-500">/* O(1) node elevation */</span> {'}'}</div>
                    <div>{'}'}</div>
                  </div>

                  {/* Sandbox Run Output */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">▶ Run Code</span>
                      <span className="text-zinc-600">|</span>
                      <span className="text-zinc-300">All 4 test cases passed</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>Execution Time: <span className="text-zinc-300">38ms</span></span>
                      <span>Exit Code: <span className="text-emerald-400 font-bold">0</span></span>
                    </div>
                  </div>

                  {/* Candidate Speech Dictation Bubble */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-3">
                    <span className="text-base">🎙️</span>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-zinc-300 flex items-center gap-2">
                        <span>Dictated Architectural Reasoning</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono">Web Speech STT</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">
                        &ldquo;I used a doubly linked list coupled with a hash map so we can remove and insert nodes at the head in $O(1)$ time without shifting arrays.&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* AI Evaluator Output */}
                  <div className="p-4 sm:p-5 rounded-xl bg-indigo-950/30 border border-indigo-900/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        Automated AI Rubric Assessment
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Score: 95 / 100 • Exceptional
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-200 border border-indigo-700/60">
                          ⚡ Level Up → Hard
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      &ldquo;Exceptional solution. Correctly identified both the hash map lookup and doubly-linked list node elevation trade-offs with defensive capacity bounds.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Features Grid */}
        <section id="features" className="py-20 border-t border-zinc-900 bg-zinc-950/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold font-mono">
                Engineered for Rigorous Practice
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Everything you need to interview with complete confidence
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base">
                Built from the ground up for software engineers who want realistic, objective practice instead of generic trivia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 text-lg">
                  ⚡
                </div>
                <h3 className="text-lg font-semibold text-white">Local Ollama AI Inference</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Run powerful open-weight LLMs (like Llama 3.2) locally with GPU acceleration. Enjoy ₹0 cost, zero API quotas, deterministic fallback, and total code privacy.
                </p>
              </div>

              {/* Feature 2: Monaco Editor & Sandbox */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 text-lg">
                  💻
                </div>
                <h3 className="text-lg font-semibold text-white">Monaco Editor & Isolated Sandbox</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Write code with VS Code keybindings and run TypeScript, Python 3, and SQLite directly in a process-isolated sandbox with strict 5s timeouts.
                </p>
              </div>

              {/* Feature 3: Web Speech Voice Engine */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 text-lg">
                  🎙️
                </div>
                <h3 className="text-lg font-semibold text-white">Multimodal Voice Engine</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Dictate architectural thoughts hands-free via in-browser Web Speech recognition, and listen to the AI interviewer articulate problems aloud via speech synthesis.
                </p>
              </div>

              {/* Feature 4: Socratic AI Streaming */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 text-lg">
                  💬
                </div>
                <h3 className="text-lg font-semibold text-white">Live Socratic AI Dialogue</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Chat with an AI Principal Engineer who streams real-time progressive hints, probes your assumptions, and guides you without giving away solutions.
                </p>
              </div>

              {/* Feature 5: Adaptive Calibration */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 text-lg">
                  📈
                </div>
                <h3 className="text-lg font-semibold text-white">Adaptive Difficulty Engine</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Dynamic multi-turn difficulty adjustments: scores &ge; 80% level up to harder challenges, while &lt; 60% deploys targeted scaffolding to test fundamentals.
                </p>
              </div>

              {/* Feature 6: Report Export & PDF */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 text-lg">
                  📊
                </div>
                <h3 className="text-lg font-semibold text-white">Analytics Dashboard & PDF Export</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Inspect mathematical SVG performance trendlines, topic mastery matrices, download complete Markdown summaries, or print ink-friendly PDFs.
                </p>
              </div>

              {/* Feature 7: Postgres RLS */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 text-lg">
                  🛡️
                </div>
                <h3 className="text-lg font-semibold text-white">PostgreSQL Row-Level Security</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Every interview session, question, answer, and evaluation is isolated using Postgres RLS policies evaluated directly at the database engine.
                </p>
              </div>

              {/* Feature 8: Zod Schema Validation */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-800/60 flex items-center justify-center text-violet-400 text-lg">
                  🎯
                </div>
                <h3 className="text-lg font-semibold text-white">Zod Schema Validation</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Zero hallucinated formatting. Questions, hints, rubrics, and feedback are strictly validated via Zod schemas and Vercel AI SDK structured generation.
                </p>
              </div>

              {/* Feature 9: Automated Regression Tests */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-orange-950/80 border border-orange-800/60 flex items-center justify-center text-orange-400 text-lg">
                  🧪
                </div>
                <h3 className="text-lg font-semibold text-white">Automated Regression Suite</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Guaranteed reliability with 31 automated Vitest tests covering adaptive mathematics, sandbox boundary caps, and runtime schema validation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works Section */}
        <section id="how-it-works" className="py-20 border-t border-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold font-mono">
                The Interview Lifecycle
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                How It Works in 3 Simple Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center font-mono">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white">Configure Your Target Role</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Choose your role (e.g. Full-Stack Engineer), seniority level (Junior to Senior), difficulty rating, and focus topics.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center font-mono">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white">Practice Realistic Scenarios</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Our local AI model generates focused, practical engineering problems with rubrics and progressive hints designed to challenge your thinking.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center font-mono">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white">Review Detailed Feedback</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Inspect comprehensive scores, breakdown of strengths, missed edge cases, and ideal solution concepts to accelerate your growth.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. System Architecture Showcase */}
        <section id="architecture" className="py-20 border-t border-zinc-900 bg-zinc-950/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold font-mono">
                Transparent Engineering
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Designed to Be Explained in Technical Interviews
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base">
                This platform is an open-architecture project. Every engineering decision is documented in our repository decision log.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                  Decision 001
                </span>
                <h3 className="text-base font-semibold text-white">Next.js 16 App Router</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Modular monolith architecture. Server Components execute database queries and AI prompts securely on the server with zero client credential exposure.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                  Decision 002
                </span>
                <h3 className="text-base font-semibold text-white">PostgreSQL & Row-Level Security</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Relational schema with cascading foreign keys and indexes. Uses cached <code className="text-zinc-300 font-mono">(SELECT auth.uid())</code> scalar subqueries for 10x faster RLS scans.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                  Decision 004
                </span>
                <h3 className="text-base font-semibold text-white">OpenAI /v1 Compatibility</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interfaces with local Ollama using official <code className="text-zinc-300 font-mono">@ai-sdk/openai</code> for strict <code className="text-zinc-300 font-mono">LanguageModelV4</code> type safety without unmaintained third-party packages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Evaluation Rubric Tier Showcase */}
        <section id="rubric" className="py-20 border-t border-zinc-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold font-mono">
                Evaluation Standards
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Objective Assessment Tiers
              </h2>
              <p className="text-zinc-400 text-sm">
                Answers are evaluated against standardized rubric tiers to give you clear signals on your readiness.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-emerald-900/40 space-y-2">
                <div className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                  85 – 100 PTS
                </div>
                <h4 className="text-base font-semibold text-white">Exceptional</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Accurate core solution, deep grasp of edge cases, trade-offs, and production engineering practices.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-indigo-900/40 space-y-2">
                <div className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">
                  70 – 84 PTS
                </div>
                <h4 className="text-base font-semibold text-white">Strong Pass</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sound conceptual understanding and correct answer with minor omissions in optimizations or edge cases.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-amber-900/40 space-y-2">
                <div className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  55 – 69 PTS
                </div>
                <h4 className="text-base font-semibold text-white">Borderline</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Partial correctness with conceptual gaps or unaddressed constraints that warrant targeted follow-up.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-red-900/40 space-y-2">
                <div className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">
                  &lt; 55 PTS
                </div>
                <h4 className="text-base font-semibold text-white">Needs Improvement</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Significant misunderstandings or missed fundamental requirements requiring foundational revision.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Call To Action Banner */}
        <section className="py-20 border-t border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Ace Your Next Interview?
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Create an account or launch directly from your dashboard to begin practicing with your private local AI interviewer.
            </p>
            <div className="pt-2">
              <Link
                href={destinationHref}
                id="footer-start-cta"
                className="inline-flex px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-xl shadow-indigo-600/30 hover:-translate-y-0.5 transition-all text-sm"
              >
                {primaryCtaText}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">DevInterview.ai</span>
            <span>•</span>
            <span>Open Source AI Coding Interview Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/zorawar238/ai-interview"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors"
            >
              GitHub Repository
            </a>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Candidate Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
