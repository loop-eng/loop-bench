import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export function shellExec(
  command: string,
  cwd: string,
  timeoutMs = 60_000,
): ShellResult {
  const start = Date.now();
  try {
    const stdout = execSync(command, {
      cwd,
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      stdout: stdout ?? "",
      stderr: "",
      exitCode: 0,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: e.status ?? 1,
      durationMs: Date.now() - start,
    };
  }
}

export function readFile(repoPath: string, filePath: string): string {
  const fullPath = join(repoPath, filePath);
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf-8");
}

export function writeFile(
  repoPath: string,
  filePath: string,
  content: string,
): void {
  writeFileSync(join(repoPath, filePath), content);
}

export function listSourceFiles(
  repoPath: string,
  extensions = [".ts", ".js", ".py", ".go"],
): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    if (dir.includes("node_modules") || dir.includes(".git") || dir.includes("__pycache__")) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        results.push(relative(repoPath, full));
      }
    }
  }

  walk(repoPath);
  return results.sort();
}

export function getRepoContext(repoPath: string, maxFiles = 10): string {
  const files = listSourceFiles(repoPath);
  const parts: string[] = [];

  for (const file of files.slice(0, maxFiles)) {
    const content = readFile(repoPath, file);
    if (content.length > 5000) {
      parts.push(`--- ${file} (truncated) ---\n${content.slice(0, 5000)}\n...`);
    } else {
      parts.push(`--- ${file} ---\n${content}`);
    }
  }

  if (files.length > maxFiles) {
    parts.push(`\n(${files.length - maxFiles} more files not shown)`);
  }

  return parts.join("\n\n");
}

export function runTests(
  repoPath: string,
  testCommand: string,
  timeoutMs = 60_000,
): ShellResult {
  return shellExec(testCommand, repoPath, timeoutMs);
}

export function getDiff(repoPath: string): string {
  const result = shellExec("git diff --no-color 2>/dev/null || echo ''", repoPath, 10_000);
  return result.stdout.trim();
}

export function getChangedFiles(repoPath: string): string[] {
  const result = shellExec(
    "git diff --name-only 2>/dev/null || echo ''",
    repoPath,
    10_000,
  );
  return result.stdout
    .trim()
    .split("\n")
    .filter((f) => f.length > 0);
}
