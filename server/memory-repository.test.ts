import { createMemoryRepository } from "./memory-repository";
import { describeLibraryRepositoryContract } from "./repository-contract";

describeLibraryRepositoryContract("in-memory", createMemoryRepository);
