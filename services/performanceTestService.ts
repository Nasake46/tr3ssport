import { firestore } from '@/firebase';
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { CreatePerformanceTestInput, PerformanceTest } from '@/models/performanceTest';

const COLLECTION = 'performanceTests';

export const createPerformanceTest = async (input: CreatePerformanceTestInput): Promise<string> => {
  const payload = {
    appointmentId: input.appointmentId,
    userId: input.userId,
    coachId: input.coachId,
    family: input.family,
    testName: input.testName,
    unitType: input.unitType,
    unitLabel: input.unitLabel || '',
    valueNumber: input.valueNumber ?? null,
    valueText: input.valueText || '',
    testDate: Timestamp.fromDate(input.testDate),
    createdAt: Timestamp.now(),
  };

  const ref = await addDoc(collection(firestore, COLLECTION), payload);
  return ref.id;
};

export const getPerformanceTestsForUser = async (userId: string): Promise<PerformanceTest[]> => {
  const q = query(collection(firestore, COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      appointmentId: data.appointmentId,
      userId: data.userId,
      coachId: data.coachId,
      family: data.family,
      testName: data.testName,
      unitType: data.unitType,
      unitLabel: data.unitLabel || undefined,
      valueNumber: data.valueNumber ?? undefined,
      valueText: data.valueText || undefined,
      testDate: data.testDate?.toDate?.() || new Date(),
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as PerformanceTest;
  });
  // Trier côté client (plus récent d'abord)
  items.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());
  return items;
};

export const getPerformanceTestsForAppointment = async (appointmentId: string): Promise<PerformanceTest[]> => {
  const q = query(collection(firestore, COLLECTION), where('appointmentId', '==', appointmentId));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      appointmentId: data.appointmentId,
      userId: data.userId,
      coachId: data.coachId,
      family: data.family,
      testName: data.testName,
      unitType: data.unitType,
      unitLabel: data.unitLabel || undefined,
      valueNumber: data.valueNumber ?? undefined,
      valueText: data.valueText || undefined,
      testDate: data.testDate?.toDate?.() || new Date(),
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as PerformanceTest;
  });
  items.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());
  return items;
};
