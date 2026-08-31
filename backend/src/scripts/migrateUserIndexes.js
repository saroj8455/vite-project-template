import { connectDatabase } from '../config/database.js';
import { User } from '../models/User.js';

await connectDatabase();
let indexes = [];
try {
  indexes = await User.collection.indexes();
} catch (error) {
  if (error.code !== 26) throw error;
}
const existing = indexes.find((index) => index.name === 'dummyJsonId_1');

if (existing && !existing.sparse) {
  await User.collection.dropIndex('dummyJsonId_1');
  console.log('Replaced the dummyJsonId index with a sparse unique index.');
}

await User.collection.createIndex({ dummyJsonId: 1 }, { unique: true, sparse: true });
console.log('User indexes are ready for local registration.');
process.exit(0);
