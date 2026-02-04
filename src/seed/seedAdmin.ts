import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getUsersDB } from '../db/db';
import { IUser } from '../db/schema';

export const seedAdminUser = async () => {
  const db = await getUsersDB();
  if (!db) {
    console.error('Database not initialized. Cannot seed admin user.');
    return;
  }

  const email = 'citc.ncit.edu.np';
  const password = 'helloncit';
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  let user = db.data.users.find((u) => u.email === email);

  if (!user) {
    console.log('Seeding admin user...');
    const newUser: IUser = {
      id: crypto.randomUUID(),
      name: 'CITC Admin',
      email,
      passwordHash: hashedPassword,
      role: 'admin',
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    db.data.users.push(newUser);
    await db.write();
    console.log('Admin user seeded successfully.');
  } else {
    // Ensure admin privilege and password match (as requested)
    let needsUpdate = false;

    if (user.role !== 'admin') {
        user.role = 'admin';
        needsUpdate = true;
        console.log('Updating user role to admin.');
    }

    // Verify if password matches, if not update it
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        user.passwordHash = hashedPassword;
        needsUpdate = true;
        console.log('Updating admin password.');
    }

    if (needsUpdate) {
        user.updatedAt = now;
        await db.write();
        console.log('Admin user updated.');
    } else {
        console.log('Admin user already exists and is up to date.');
    }
  }
};
