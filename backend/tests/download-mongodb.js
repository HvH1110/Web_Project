// Runs before the tests (npm's pretest). Test files start in parallel, and on a
// machine with no MongoDB binary yet they all try to download it and fail on the
// library's lock file. Not a test: the name keeps `node --test` from running it.
import { MongoBinary } from 'mongodb-memory-server-core';

await MongoBinary.getPath();
