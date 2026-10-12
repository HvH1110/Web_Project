import mongoose from 'mongoose';

// Schemas for the crawler-owned collections (docs/DATA.md). The backend only
// reads them: it never creates the collection or its indexes, and any write
// through these models throws instead of touching crawler data.
const WRITE_HOOKS = [
  'save',
  'insertMany',
  'bulkWrite',
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
];

export function readOnlySchema(definition, options) {
  const schema = new mongoose.Schema(definition, {
    autoCreate: false,
    autoIndex: false,
    versionKey: false,
    ...options,
  });
  schema.pre(WRITE_HOOKS, { document: true, query: true }, function () {
    throw new Error(`${options.collection} is read-only in the backend (owned by the crawler)`);
  });
  return schema;
}
