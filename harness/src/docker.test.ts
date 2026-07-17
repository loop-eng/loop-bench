import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sandbox, createSandbox, getBaseImage } from "./docker.js";
import type { TaskDefinition } from "./types.js";

const MOCK_TASK: TaskDefinition = {
  id: "bug-fix-001",
  name: "Test task for Docker sandbox",
  category: "bug-fix",
  difficulty: "easy",
  language: "typescript",
  description: "A test task for verifying sandbox behavior in unit tests.",
  goal: "Fix the bug so all tests pass and the code compiles cleanly.",
  repo: {
    base_image: "node",
    setup_command: "npm install",
    test_command: "npm test",
    build_command: "npx tsc --noEmit",
  },
  ground_truth: {
    patch_file: "ground-truth/fix.patch",
    files_changed: ["src/index.ts"],
    lines_changed: 3,
  },
  rubric: [
    { criterion: "Fix is correct and minimal", weight: 0.5, check: "test" },
    { criterion: "All existing tests pass after fix", weight: 0.5, check: "test" },
  ],
  constraints: {
    max_iterations: 20,
    max_cost_usd: 5.0,
    timeout_minutes: 10,
  },
};

function makeMockDocker() {
  const mockExecInspect = vi.fn().mockResolvedValue({ ExitCode: 0 });
  const mockStream = {
    on: vi.fn((event: string, cb: (data?: Buffer) => void) => {
      if (event === "data") {
        setTimeout(() => cb(Buffer.from("test output")), 0);
      }
      if (event === "end") {
        setTimeout(() => cb(), 10);
      }
      return mockStream;
    }),
    destroy: vi.fn(),
  };
  const mockExecStart = vi.fn(
    (_opts: unknown, cb: (err: null, stream: typeof mockStream) => void) => {
      cb(null, mockStream);
    },
  );
  const mockExec = vi.fn().mockResolvedValue({
    start: mockExecStart,
    inspect: mockExecInspect,
  });
  const mockContainer = {
    id: "abc123def456",
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    exec: mockExec,
    getArchive: vi.fn(),
    putArchive: vi.fn(),
  };
  const mockDocker = {
    createContainer: vi.fn().mockResolvedValue(mockContainer),
    buildImage: vi.fn(),
  };

  return { mockDocker, mockContainer, mockExec, mockExecInspect, mockStream };
}

describe("Sandbox", () => {
  describe("constructor", () => {
    it("accepts required options", () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks/bug-fix/test",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      expect(sandbox.task.id).toBe("bug-fix-001");
    });

    it("uses default cpu and memory limits", () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      expect(sandbox.getOutputDir()).toBe("/tmp/output");
    });
  });

  describe("create", () => {
    it("creates a container with correct image and binds", async () => {
      const { mockDocker } = makeMockDocker();
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks/test",
        outputDir: "/tmp/test-output",
        docker: mockDocker as never,
      });

      const id = await sandbox.create();
      expect(id).toBe("abc123def456");
      expect(mockDocker.createContainer).toHaveBeenCalledOnce();

      const createArgs = mockDocker.createContainer.mock.calls[0]![0] as Record<string, unknown>;
      expect(createArgs.Image).toBe("node:20-slim");
      expect(createArgs.WorkingDir).toBe("/workspace");
    });

    it("applies resource limits", async () => {
      const { mockDocker } = makeMockDocker();
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks/test",
        outputDir: "/tmp/test-output",
        cpuLimit: 4,
        memoryLimitMb: 4096,
        docker: mockDocker as never,
      });

      await sandbox.create();
      const args = mockDocker.createContainer.mock.calls[0]![0] as {
        HostConfig: { NanoCpus: number; Memory: number };
      };
      expect(args.HostConfig.NanoCpus).toBe(4e9);
      expect(args.HostConfig.Memory).toBe(4096 * 1024 * 1024);
    });
  });

  describe("start", () => {
    it("throws if container not created", async () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      await expect(sandbox.start()).rejects.toThrow("not created");
    });

    it("starts the container", async () => {
      const { mockDocker, mockContainer } = makeMockDocker();
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: mockDocker as never,
      });
      await sandbox.create();
      await sandbox.start();
      expect(mockContainer.start).toHaveBeenCalledOnce();
    });
  });

  describe("exec", () => {
    it("throws if container not created", async () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      await expect(sandbox.exec("echo hello")).rejects.toThrow("not created");
    });

    it("executes command and returns result", async () => {
      const { mockDocker } = makeMockDocker();
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: mockDocker as never,
      });
      await sandbox.create();
      const result = await sandbox.exec("echo hello");
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("test output");
      expect(result.timedOut).toBe(false);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns exit code 124 on timeout", async () => {
      const mockExecInspect = vi.fn().mockResolvedValue({ ExitCode: 0 });
      const mockStream = {
        on: vi.fn((_event: string, _cb: () => void) => mockStream),
        destroy: vi.fn(),
      };
      const mockExecStart = vi.fn(
        (_opts: unknown, cb: (err: null, stream: typeof mockStream) => void) => {
          cb(null, mockStream);
        },
      );
      const mockExec = vi.fn().mockResolvedValue({
        start: mockExecStart,
        inspect: mockExecInspect,
      });
      const mockContainer = {
        id: "timeout-test",
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        exec: mockExec,
      };
      const mockDocker = {
        createContainer: vi.fn().mockResolvedValue(mockContainer),
      };

      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: mockDocker as never,
      });
      await sandbox.create();
      const result = await sandbox.exec("sleep 999", 50);
      expect(result.exitCode).toBe(124);
      expect(result.timedOut).toBe(true);
      expect(result.stderr).toContain("[TIMEOUT]");
    });
  });

  describe("cleanup", () => {
    it("stops and removes container", async () => {
      const { mockDocker, mockContainer } = makeMockDocker();
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: mockDocker as never,
      });
      await sandbox.create();
      await sandbox.cleanup();
      expect(mockContainer.stop).toHaveBeenCalledOnce();
      expect(mockContainer.remove).toHaveBeenCalledOnce();
      expect(sandbox.getContainerId()).toBeNull();
    });

    it("handles cleanup when no container exists", async () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      await expect(sandbox.cleanup()).resolves.toBeUndefined();
    });
  });

  describe("path helpers", () => {
    it("returns correct LTF container path", () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      expect(sandbox.getLtfContainerPath()).toBe("/output/bug-fix-001.ltf.jsonl");
    });

    it("returns correct host LTF path", () => {
      const sandbox = new Sandbox({
        task: MOCK_TASK,
        taskDir: "/tmp/tasks",
        outputDir: "/tmp/output",
        docker: {} as never,
      });
      expect(sandbox.getHostLtfPath()).toBe("/tmp/output/bug-fix-001.ltf.jsonl");
    });
  });
});

describe("createSandbox", () => {
  it("returns a Sandbox instance", () => {
    const sandbox = createSandbox({
      task: MOCK_TASK,
      taskDir: "/tmp/tasks",
      outputDir: "/tmp/output",
      docker: {} as never,
    });
    expect(sandbox).toBeInstanceOf(Sandbox);
  });
});

describe("getBaseImage", () => {
  it("returns node image", () => {
    expect(getBaseImage("node")).toBe("node:20-slim");
  });
  it("returns python image", () => {
    expect(getBaseImage("python")).toBe("python:3.12-slim");
  });
  it("returns go image", () => {
    expect(getBaseImage("go")).toBe("golang:1.24-bookworm");
  });
});
