import Docker from "dockerode";
import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import type { BaseImage, TaskDefinition } from "./types.js";

const BASE_IMAGES: Record<BaseImage, string> = {
  node: "node:20-slim",
  python: "python:3.12-slim",
  go: "golang:1.24-bookworm",
};

export interface SandboxOptions {
  task: TaskDefinition;
  taskDir: string;
  outputDir: string;
  cpuLimit?: number;
  memoryLimitMb?: number;
  docker?: Docker;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export class Sandbox {
  private docker: Docker;
  private container: Docker.Container | null = null;
  private containerId: string | null = null;
  readonly task: TaskDefinition;
  private readonly taskDir: string;
  private readonly outputDir: string;
  private readonly cpuLimit: number;
  private readonly memoryLimitMb: number;

  constructor(options: SandboxOptions) {
    this.docker = options.docker ?? new Docker();
    this.task = options.task;
    this.taskDir = resolve(options.taskDir);
    this.outputDir = resolve(options.outputDir);
    this.cpuLimit = options.cpuLimit ?? 2;
    this.memoryLimitMb = options.memoryLimitMb ?? 2048;
  }

  async create(): Promise<string> {
    const baseImage = BASE_IMAGES[this.task.repo.base_image];

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    this.container = await this.docker.createContainer({
      Image: baseImage,
      Cmd: ["sleep", "infinity"],
      WorkingDir: "/workspace",
      HostConfig: {
        Binds: [`${this.outputDir}:/output:rw`],
        NanoCpus: this.cpuLimit * 1e9,
        Memory: this.memoryLimitMb * 1024 * 1024,
        MemorySwap: this.memoryLimitMb * 1024 * 1024,
      },
      Tty: false,
    });

    this.containerId = this.container.id;
    return this.containerId;
  }

  async start(): Promise<void> {
    if (!this.container) throw new Error("Container not created — call create() first");
    await this.container.start();
  }

  async copyRepoIn(): Promise<void> {
    if (!this.containerId) throw new Error("Container not created");

    const repoDir = resolve(this.taskDir, "repo");
    if (!existsSync(repoDir)) {
      throw new Error(`Task repo not found: ${repoDir}`);
    }

    execSync(
      `docker cp "${repoDir}/." "${this.containerId}:/workspace/"`,
      { timeout: 30_000 },
    );
  }

  async exec(command: string, timeoutMs?: number): Promise<ExecResult> {
    if (!this.container) throw new Error("Container not created");

    const timeout = timeoutMs ?? this.task.constraints.timeout_minutes * 60_000;
    const startTime = Date.now();

    const exec = await this.container.exec({
      Cmd: ["sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
    });

    return new Promise<ExecResult>((resolveExec, reject) => {
      let stdout = "";
      let stderr = "";
      let settled = false;

      exec.start({ hijack: true, stdin: false }, (err, stream) => {
        if (err) return reject(err);
        if (!stream) return reject(new Error("No exec stream returned"));

        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            stream.destroy();
            resolveExec({
              exitCode: 124,
              stdout,
              stderr: stderr + "\n[TIMEOUT]",
              durationMs: Date.now() - startTime,
              timedOut: true,
            });
          }
        }, timeout);

        stream.on("data", (chunk: Buffer) => {
          stdout += chunk.toString("utf-8");
        });

        stream.on("end", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);

          exec
            .inspect()
            .then((info) => {
              resolveExec({
                exitCode: info.ExitCode ?? 1,
                stdout,
                stderr,
                durationMs: Date.now() - startTime,
                timedOut: false,
              });
            })
            .catch(reject);
        });

        stream.on("error", (streamErr: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(streamErr);
        });
      });
    });
  }

  async setup(): Promise<ExecResult> {
    return this.exec(this.task.repo.setup_command, 120_000);
  }

  async runTests(testCommand?: string): Promise<ExecResult> {
    return this.exec(testCommand ?? this.task.repo.test_command);
  }

  async runBuild(): Promise<ExecResult | null> {
    if (!this.task.repo.build_command) return null;
    return this.exec(this.task.repo.build_command, 60_000);
  }

  async getDiff(): Promise<string> {
    const result = await this.exec(
      "git diff --no-color 2>/dev/null || echo ''",
      10_000,
    );
    return result.stdout.trim();
  }

  async copyFileOut(containerPath: string, hostDir: string): Promise<void> {
    if (!this.containerId) throw new Error("Container not created");

    if (!existsSync(hostDir)) {
      mkdirSync(hostDir, { recursive: true });
    }

    execSync(
      `docker cp "${this.containerId}:${containerPath}" "${hostDir}/"`,
      { timeout: 30_000 },
    );
  }

  async copyHiddenTestsIn(testsDir: string): Promise<void> {
    if (!this.containerId) throw new Error("Container not created");

    if (!existsSync(testsDir)) return;

    execSync(
      `docker cp "${testsDir}/." "${this.containerId}:/workspace/__hidden_tests__/"`,
      { timeout: 30_000 },
    );
  }

  async stop(): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.stop({ t: 5 });
    } catch {
      // already stopped
    }
  }

  async remove(): Promise<void> {
    if (!this.container) return;
    try {
      await this.container.remove({ force: true });
    } catch {
      // already removed
    }
    this.container = null;
    this.containerId = null;
  }

  async cleanup(): Promise<void> {
    await this.stop();
    await this.remove();
  }

  getContainerId(): string | null {
    return this.containerId;
  }

  getOutputDir(): string {
    return this.outputDir;
  }

  getLtfContainerPath(): string {
    return `/output/${this.task.id}.ltf.jsonl`;
  }

  getHostLtfPath(): string {
    return resolve(this.outputDir, `${this.task.id}.ltf.jsonl`);
  }
}

export function createSandbox(options: SandboxOptions): Sandbox {
  return new Sandbox(options);
}

export function getBaseImage(base: BaseImage): string {
  return BASE_IMAGES[base];
}
