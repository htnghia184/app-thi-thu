import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(
  initialMinutes: number,
  onTimeUp: () => void,
) {
  const [timeRemaining, setTimeRemaining] = useState<number>(initialMinutes * 60);
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsActive(false);
      onTimeUp();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeRemaining, onTimeUp]);

  const reset = useCallback(() => {
    const initialSeconds = initialMinutes * 60;
    setTimeRemaining(initialSeconds);
    setIsActive(true);
  }, [initialMinutes]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return {
    minutes,
    seconds,
    reset,
  };
}
