import { useState, useEffect, useRef } from 'react';

interface ActiveSession {
  appointmentId: string;
  clientName: string;
  startTime: Date;
  expectedDuration: number;
  actualStartTime: Date;
}

export const useSessionTimer = (activeSession: ActiveSession | null) => {
  const [sessionTime, setSessionTime] = useState<string>('00:00');
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateSessionTime = () => {
    if (!activeSession) {
      setSessionTime('00:00');
      setTotalSeconds(0);
      return;
    }
    
    const now = new Date();
    const startTime = new Date(activeSession.actualStartTime || activeSession.startTime);
    const diff = now.getTime() - startTime.getTime();
    
    const totalSecs = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    
    setTotalSeconds(totalSecs);
    setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  useEffect(() => {
    // Nettoyer le timer précédent
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (activeSession) {
      console.log('⏱️ TIMER - Démarrage du chronomètre pour session:', activeSession.appointmentId);
      
      // Mise à jour immédiate
      updateSessionTime();
      
      // Démarrer le timer
      timerRef.current = setInterval(updateSessionTime, 1000);
    } else {
      // Seulement log si on arrête un timer qui était actif
      if (timerRef.current) {
        console.log('⏹️ TIMER - Arrêt du chronomètre');
      }
      setSessionTime('00:00');
      setTotalSeconds(0);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeSession?.appointmentId]); // Dépendance sur l'ID de la session

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSessionTime('00:00');
    setTotalSeconds(0);
  };

  return {
    sessionTime,
    totalSeconds,
    resetTimer,
    isRunning: !!timerRef.current
  };
};
