import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const crew = new Schema({
  order: { type: Number, default: 0 },
  slot: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  title: { type: String, required: true },
  name: { type: String, required: true },
  duty: { type: String, default: '' },
});

const port = new Schema({
  order: { type: Number, default: 0 },
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  blurb: { type: String, default: '' },
  detail: { type: String, default: '' },
});

const project = new Schema({
  order: { type: Number, default: 0 },
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  blurb: { type: String, default: '' },
  detail: { type: String, default: '' },
  stack: [String],
  status: { type: String, default: '' },
  link: { type: String, default: '' },
});

const joinRequest = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, maxlength: 120 },
    year: { type: String, default: '', maxlength: 20 },
    branch: { type: String, default: '', maxlength: 60 },
    message: { type: String, default: '', maxlength: 600 },
  },
  { timestamps: true },
);

export const Crew = models.Crew || model('Crew', crew);
export const Port = models.Port || model('Port', port);
export const Project = models.Project || model('Project', project);
export const JoinRequest = models.JoinRequest || model('JoinRequest', joinRequest);
