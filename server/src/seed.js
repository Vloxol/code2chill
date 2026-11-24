import 'dotenv/config';
import mongoose from 'mongoose';
import { content } from './content.js';
import { Crew, Port, Project } from './models.js';

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('Set MONGO_URI in server/.env before seeding.');
  process.exit(1);
}

await mongoose.connect(uri);
await Promise.all([Crew.deleteMany({}), Port.deleteMany({}), Project.deleteMany({})]);
await Crew.insertMany(content.crew.map((c, order) => ({ ...c, order })));
await Port.insertMany(content.ports.map((p, order) => ({ ...p, order })));
await Project.insertMany(content.projects.map((p, order) => ({ ...p, order })));
console.log(`Seeded ${content.crew.length} crew, ${content.ports.length} ports, ${content.projects.length} projects.`);
await mongoose.disconnect();
