import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { executeCodeRequestSchema, ExecuteCodeResponse } from '@/lib/validations/execution'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

const EXECUTION_TIMEOUT_MS = 5000
const MAX_OUTPUT_BYTES = 64 * 1024 // 64 KB

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate request payload
    const body = await req.json()
    const parseResult = executeCodeRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid execution request', details: parseResult.error.format() },
        { status: 400 }
      )
    }

    const { language, code, stdin = '' } = parseResult.data

    // 3. Create isolated temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devinterview-runner-'))
    const startTime = performance.now()

    let command = ''
    let args: string[] = []
    let scriptPath = ''

    try {
      if (language === 'typescript') {
        scriptPath = path.join(tempDir, 'solution.ts')
        await fs.writeFile(scriptPath, code, 'utf-8')
        command = 'node'
        args = ['--experimental-strip-types', scriptPath]
      } else if (language === 'javascript') {
        scriptPath = path.join(tempDir, 'solution.mjs')
        await fs.writeFile(scriptPath, code, 'utf-8')
        command = 'node'
        args = [scriptPath]
      } else if (language === 'python') {
        scriptPath = path.join(tempDir, 'solution.py')
        await fs.writeFile(scriptPath, code, 'utf-8')
        command = 'python'
        args = ['-u', scriptPath]
      } else if (language === 'sql') {
        // SQL runner with in-memory SQLite and standard sample schema
        const sqlFilePath = path.join(tempDir, 'solution.sql')
        await fs.writeFile(sqlFilePath, code, 'utf-8')

        const runnerScript = `import sqlite3, sys

db = sqlite3.connect(':memory:')
cursor = db.cursor()

# Pre-populate sample interview dataset for immediate testing
cursor.execute('''
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    salary INTEGER NOT NULL
);
''')
cursor.executemany('''
INSERT INTO employees VALUES (?, ?, ?, ?)
''', [
    (1, 'Alice Johnson', 'Engineering', 125000),
    (2, 'Bob Smith', 'Marketing', 88000),
    (3, 'Charlie Brown', 'Engineering', 142000),
    (4, 'Diana Prince', 'Sales', 96000),
    (5, 'Evan Wright', 'Engineering', 115000),
    (6, 'Fiona Gallagher', 'Product', 130000)
])
db.commit()

with open(${JSON.stringify(sqlFilePath)}, 'r', encoding='utf-8') as f:
    sql_content = f.read()

# Execute each statement separated by semicolon
statements = [s.strip() for s in sql_content.strip().split(';') if s.strip()]

if not statements:
    print('No SQL statements provided to execute.')
    sys.exit(0)

for statement in statements:
    try:
        cursor.execute(statement)
        if cursor.description:
            headers = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            header_line = ' | '.join(headers)
            print(header_line)
            print('-' * max(len(header_line), 20))
            if not rows:
                print('(0 rows returned)')
            for row in rows:
                print(' | '.join(str(val) for val in row))
            print('')
        else:
            db.commit()
            print(f'Query executed successfully ({cursor.rowcount} row(s) affected).')
    except Exception as e:
        print(f'SQL Execution Error: {e}', file=sys.stderr)
        sys.exit(1)
`
        const runnerPath = path.join(tempDir, 'sql_runner.py')
        await fs.writeFile(runnerPath, runnerScript, 'utf-8')
        command = 'python'
        args = ['-u', runnerPath]
      }

      // 4. Sanitized environment (Zero app/database secrets leaked)
      const safeEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        PATH: process.env.PATH || '',
        SYSTEMROOT: process.env.SYSTEMROOT || '',
        WINDIR: process.env.WINDIR || '',
        TEMP: tempDir,
        TMP: tempDir,
      }

      // 5. Spawn child process with isolated pipe streams
      const child = spawn(command, args, {
        cwd: tempDir,
        env: safeEnv,
      })

      let stdout = ''
      let stderr = ''
      let isTimedOut = false

      if (stdin && child.stdin) {
        child.stdin.write(stdin)
        child.stdin.end()
      } else if (child.stdin) {
        child.stdin.end()
      }

      // 6. Hard execution timeout limit
      const timeoutHandle = setTimeout(() => {
        isTimedOut = true
        child.kill('SIGKILL')
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'])
        }
      }, EXECUTION_TIMEOUT_MS)

      child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_OUTPUT_BYTES) {
          stdout += chunk.toString('utf-8')
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_OUTPUT_BYTES) {
          stderr += chunk.toString('utf-8')
        }
      })

      const exitCode = await new Promise<number | null>((resolve) => {
        child.on('close', (code: number | null) => {
          clearTimeout(timeoutHandle)
          resolve(code)
        })
        child.on('error', (err: Error) => {
          clearTimeout(timeoutHandle)
          stderr += `\nSpawn error: ${err.message}`
          resolve(-1)
        })
      })

      const executionTimeMs = Math.round(performance.now() - startTime)

      if (isTimedOut) {
        const response: ExecuteCodeResponse = {
          status: 'timeout',
          stdout,
          stderr: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000} seconds. (Check for infinite loops or blocking calls)`,
          exitCode: null,
          executionTimeMs,
        }
        return NextResponse.json(response)
      }

      const response: ExecuteCodeResponse = {
        status: exitCode === 0 ? 'success' : 'error',
        stdout,
        stderr,
        exitCode,
        executionTimeMs,
      }

      return NextResponse.json(response)
    } finally {
      // 7. Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (err: unknown) {
    console.error('Code execution endpoint error:', err)
    return NextResponse.json(
      {
        status: 'error',
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Internal execution error',
        exitCode: 1,
        executionTimeMs: 0,
      },
      { status: 500 }
    )
  }
}
