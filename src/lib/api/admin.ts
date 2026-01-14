import api from "@/lib/api";
import type { Student, Fee } from "@/types";

// ========== STUDENTS ==========

export const getAllStudents = async (): Promise<Student[]> => {
  const { data } = await api.get("/students");
  return data;
};

export const createStudent = async (studentData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  coachId?: number;
}) => {
  const { data } = await api.post("/students", studentData);
  return data;
};

export const updateStudent = async (studentId: number, updates: Partial<Student>) => {
  const { data } = await api.put(`/students/${studentId}`, updates);
  return data;
};

export const deleteStudent = async (studentId: number) => {
  const { data } = await api.delete(`/students/${studentId}`);
  return data;
};

// ========== COACHES ==========

export const getAllCoaches = async () => {
  const { data } = await api.get("/coaches");
  return data;
};

export const createCoach = async (coachData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) => {
  const { data } = await api.post("/coaches", coachData);
  return data;
};

export const updateCoach = async (coachId: number, updates: any) => {
  const { data } = await api.put(`/coaches/${coachId}`, updates);
  return data;
};

export const deleteCoach = async (coachId: number) => {
  const { data } = await api.delete(`/coaches/${coachId}`);
  return data;
};

// ========== FEES ==========

export const getAllFees = async (): Promise<Fee[]> => {
  const { data } = await api.get("/fee");
  return data;
};

export const createFee = async (feeData: {
  studentId: number;
  amount: number;
  description: string;
  dueDate: string;
}) => {
  const { data } = await api.post("/fee", feeData);
  return data;
};

export const updateFee = async (feeId: number, updates: Partial<Fee>) => {
  const { data } = await api.put(`/fee/${feeId}`, updates);
  return data;
};

export const deleteFee = async (feeId: number) => {
  const { data } = await api.delete(`/fee/${feeId}`);
  return data;
};

// ========== PAYMENTS ==========

export const getAllPayments = async () => {
  const { data } = await api.get("/payments");
  return data;
};

// ========== STATS ==========

export const getAdminStats = async () => {
  const { data } = await api.get("/admin/stats");
  return data;
};

