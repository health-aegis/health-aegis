import { Schema, model, Types } from 'mongoose';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'caregiver' | 'admin';
  assignedCaregiverId?: Types.ObjectId | string;
  createdAt?: Date;
}

const UserSchema = new Schema<IUser>({
  name:  { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:  { type: String, enum: ['patient', 'caregiver', 'admin'], default: 'patient' },
  assignedCaregiverId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const UserModel = model<IUser>('User', UserSchema);
