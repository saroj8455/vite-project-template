import bcrypt from 'bcrypt';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { listDummyJsonUsers } from '../services/dummyJson.js';

await connectDatabase();
const { users: seedUsers } = await listDummyJsonUsers(10);

const operations = await Promise.all(seedUsers.map(async (user) => ({
  updateOne: {
    filter: { dummyJsonId: user.id },
    update: {
      $set: {
        dummyJsonId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image || '',
        passwordHash: await bcrypt.hash(user.password, 12),
        emailVerified: true,
        role: user.role === 'admin' ? 'admin' : 'user',
        lastSyncedAt: new Date(),
      },
    },
    upsert: true,
  },
}))); 

if (operations.length) await User.bulkWrite(operations);
console.log(`Seeded ${operations.length} DummyJSON users with bcrypt password hashes.`);
process.exit(0);
