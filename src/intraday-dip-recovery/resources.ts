// The resource contract (PROTOCOL.md §13; standard §6). Every concurrently running research process of the study runs
// in transient systemd user units inside ONE parent slice with MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0 (the
// user's ceilings, not targets); heavy units run one at a time. The worker count, the GC cadence and the pressure
// threshold were chosen from the pilot bench (results/pilot/PILOT.md) before the freeze.
export const resources = {
  slice: 'diprecovery.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: 12,
  inflightPerWorker: 2,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: 1024,
  gcArrayBufferBytes: 256 * 2 ** 20,
  pressureBytes: 32 * 2 ** 30, // the job cgroup's memory.current at which dispatching stops (well below MemoryHigh)
  monitorSeconds: 10,
  batch: 4096 // tasks handed to the pool at once (bounded queue)
};
