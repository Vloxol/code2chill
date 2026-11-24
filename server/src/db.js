import mongoose from 'mongoose';

export const isDbReady = () => mongoose.connection.readyState === 1;

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[db] MONGO_URI not set. Serving bundled sample content from memory.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[db] connected to MongoDB');
    return true;
  } catch (err) {
    console.warn(`[db] could not connect (${err.message}). Serving bundled sample content from memory.`);
    return false;
  }
}
