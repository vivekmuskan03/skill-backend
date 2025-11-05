import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB || 'student_profile_tracer';
  if (!uri) throw new Error('MONGO_URI missing');

  // Optional verbose query logging
  if (process.env.MONGO_DEBUG === 'true') {
    mongoose.set('debug', true);
  }

  mongoose.set('strictQuery', true);

  // Connection event listeners
  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected: db='${dbName}' host='${mongoose.connection.host}'`);
  });
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err?.message || err);
  });
  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('MongoDB disconnected');
  });

  // eslint-disable-next-line no-console
  console.log(`Connecting to MongoDB... db='${dbName}'`);
  await mongoose.connect(uri, { dbName });
}


