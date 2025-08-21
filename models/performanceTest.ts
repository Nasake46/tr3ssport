export type TestFamily =
  | 'cardio'
  | 'mobilite_souplesse'
  | 'force_tonicite'
  | 'fonctionnels'
  | 'posture_stabilite';

export type UnitType =
  | 'none'            // pas d'unité (valeur brute)
  | 'distance'        // km, m, etc.
  | 'mass'            // kg, g, etc.
  | 'capacity'        // capacités/volumes
  | 'time'            // h, min, s
  | 'area'            // m², etc.
  | 'percent'         // %
  | 'degree'          // °
  | 'frequency'       // nb / temps
  | 'speed'           // m/s, km/h, etc.
  | 'power';          // watt

export interface PerformanceTest {
  id: string;
  appointmentId: string;
  userId: string;        // utilisateur (client) auquel le test est attaché
  coachId: string;       // coach qui a saisi le test
  family: TestFamily;
  testName: string;
  unitType: UnitType;
  unitLabel?: string;    // ex: 'kg', 'km/h', '%', 'sec'
  valueNumber?: number;  // valeur numérique (facultatif)
  valueText?: string;    // alternative libre (format temps "mm:ss", etc.)
  testDate: Date;        // date du test
  createdAt: Date;
}

export interface CreatePerformanceTestInput {
  appointmentId: string;
  userId: string;
  coachId: string;
  family: TestFamily;
  testName: string;
  unitType: UnitType;
  unitLabel?: string;
  valueNumber?: number;
  valueText?: string;
  testDate: Date;
}
