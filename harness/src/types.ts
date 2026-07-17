export type TaskCategory = "bug-fix" | "feature" | "refactoring" | "multi-step";

export type Difficulty = "easy" | "medium" | "hard";

export type Language = "typescript" | "python" | "go";

export type BaseImage = "node" | "python" | "go";

export type RubricCheckType = "ast" | "grep" | "test" | "manual";

export interface RubricCriterion {
  criterion: string;
  weight: number;
  check: RubricCheckType;
}

export interface TaskRepo {
  base_image: BaseImage;
  setup_command: string;
  test_command: string;
  build_command?: string;
}

export interface GroundTruth {
  patch_file: string;
  files_changed: string[];
  lines_changed: number;
}

export interface TaskConstraints {
  max_iterations: number;
  max_cost_usd: number;
  timeout_minutes: number;
}

export interface TaskDefinition {
  id: string;
  name: string;
  category: TaskCategory;
  difficulty: Difficulty;
  language: Language;
  description: string;
  goal: string;
  repo: TaskRepo;
  ground_truth: GroundTruth;
  rubric: RubricCriterion[];
  constraints: TaskConstraints;
}

export interface LoopRunConfig {
  repoPath: string;
  goal: string;
  testCommand: string;
  buildCommand?: string;
  modelId: string;
  constraints: TaskConstraints;
  ltfOutputPath: string;
}

export interface LoopRunResult {
  claimedSuccess: boolean;
  terminationReason: string;
  iterations: number;
  costUsd: number;
  durationMs: number;
  ltfTracePath: string;
  filesChanged: string[];
}

export interface BenchmarkMetrics {
  resolved: boolean;
  iterations: number;
  costUsd: number;
  durationSeconds: number;
  convergenceRate: number;
  verificationAccuracy: number;
  driftScore: number;
  falseCompletion: boolean;
  firstEditDelay: number;
  erosionScore: number;
  verbosityScore: number;
  rubricScore: number;
  honestyScore: number;
  contextEfficiency: number;
  recoveryRate: number;
}

export interface BenchmarkResult {
  taskId: string;
  loopDesign: string;
  model: string;
  metrics: BenchmarkMetrics;
  ltfTrace: string;
  timestamp: string;
}

export interface RunSummary {
  loopDesign: string;
  model: string;
  totalTasks: number;
  resolved: number;
  passRate: number;
  avgCostPerTask: number;
  avgIterations: number;
  avgConvergenceRate: number;
  avgDriftScore: number;
  avgErosionScore: number;
  avgHonestyScore: number;
  results: BenchmarkResult[];
}
