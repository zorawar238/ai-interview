# Known Limitations

This document provides a transparent, technically rigorous assessment of current platform limitations, architectural trade-offs, and considerations for production cloud deployment.

---

## 1. Code Execution Sandbox Isolation

### Current Architecture: Subprocess Host Isolation
- Code execution (`src/app/api/execute/route.ts`) spawns native system binaries (`node`, `python`) in an ephemeral operating system temporary directory (`os.tmpdir()`).
- Security boundaries enforced:
  - **Stripped Environment:** Application secrets, database connection strings, and API keys are completely stripped from `process.env`.
  - **Hard Timeout:** 5,000 ms timeout forcefully terminates the process tree (`SIGKILL` / `taskkill /f /t`).
  - **Output Capping:** 64 KB memory buffer cap on stdout/stderr to protect against memory exhaustion attacks.
  - **Payload Size Bound:** 50 KB maximum code submission length.

### Limitation & Cloud Deployment Implication:
- **Host System Exposure:** Subprocesses still execute on the host kernel. While environment variables are sanitized, malicious code could attempt disk I/O, local network scanning, or CPU starvation if not containerized.
- **Production Recommendation:** For public multi-tenant SaaS deployment, code execution must be decoupled to dedicated microVM sandboxes (e.g., AWS Firecracker, Google gVisor, Piston, or Judge0) running on isolated compute nodes.

---

## 2. Browser Web Speech API Compatibility

### Current Architecture: Native Zero-Cloud Audio Engine
- Built directly on browser standards: `webkitSpeechRecognition` for speech-to-text dictation and `speechSynthesis` for text-to-speech problem reading.
- Integrated using React 19 `useSyncExternalStore` for hydration safety.

### Limitations:
| Browser / Engine | Speech-to-Text (STT) | Text-to-Speech (TTS) | Graceful Fallback |
|---|---|---|---|
| **Google Chrome (Desktop/Android)** | Full Native Support | Full Native Support | Fully Functional |
| **Microsoft Edge (Desktop)** | Full Native Support | Full Native Support | Fully Functional |
| **Mozilla Firefox** | Unsupported (`webkitSpeechRecognition` absent) | Full Native Support | Dictation buttons auto-hide; TTS works |
| **Apple Safari (Desktop)** | Limited / Inconsistent | Full Native Support | Dictation buttons auto-hide; TTS works |
| **iOS Safari (Mobile)** | Partial / Permission restricted | Full Native Support | Auto-Voice disabled by mobile autoplay policies |

---

## 3. Local Model Capacity & Inference Characteristics

### Current Architecture: Local Ollama with `llama3.2`
- Runs completely local on port `11434` with zero API costs.

### Limitations:
- **Parameter Scale:** `llama3.2` (3 Billion parameters) is optimized for low memory usage (~2.5 GB VRAM/RAM). While fast and effective for technical problem formulation and Socratic hints, it may occasionally make minor coding syntax errors on highly complex multi-threading problems compared to 70B+ frontier models.
- **Hardware Dependency:** Inference latency depends on the host machine. Systems lacking Apple Silicon or dedicated NVIDIA GPUs may observe slower token generation (1.5–3 seconds TTFT).
- **Deployment Portability:** Serverless hosts (e.g., Vercel Functions, Cloudflare Workers) cannot run local Ollama instances directly. Production deployments must either host Ollama on an independent GPU instance (e.g., AWS EC2 G4/G5, RunPod) or point the AI SDK adapter to a hosted API provider.

---

## 4. Ephemeral SQLite State

### Current Architecture: In-Memory SQLite Sample Database
- SQL interview questions execute against an ephemeral, in-memory SQLite database (`:memory:`) seeded with standard employee and department records.

### Limitations:
- **Stateless Runs:** Each execution re-creates the in-memory database from scratch. Modifications or schema changes made by candidate queries do not persist across multiple "Run Code" clicks within the same question.
