// Public API of @workspace/world-core
export {
  CURRENT_SAVE_FORMAT_VERSION,
  WORLD_CORE_VERSION,
  createNewWorld,
} from "./createNewWorld";
export type { CreateWorldOptions } from "./createNewWorld";

export {
  createSnapshot,
  loadSnapshot,
  VersionMismatchError,
} from "./saveLoad";
export type { CreateSnapshotOptions, LoadSnapshotOptions } from "./saveLoad";

export type {
  UUID,
  ISODateString,
  SemVer,
  SnapshotMeta,
  WorldMeta,
  WorldState,
  Entity,
  Globals,
  Goal,
  NPCProfile,
  Event,
  MemoryEntry,
  Memory,
  Relationship,
  ModuleManifest,
  SaveSnapshot,
  TimeTick,
  LLMProvider,
  SnapshotMetaShallow,
  DbAdapter,
  VersionMismatchError as VersionMismatchErrorShape,
  ValidationError,
} from "./types/index";
