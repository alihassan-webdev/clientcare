import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface SLACountdownProps {
  deadline: string;
  compact?: boolean;
}

export const SLACountdown = ({ deadline, compact = false }: SLACountdownProps) => {
  const [display, setDisplay] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setIsOverdue(true);
        const abs = Math.abs(diff);
        const h = Math.floor(abs / 3_600_000);
        const m = Math.floor((abs % 3_600_000) / 60_000);
        setDisplay(`${h}h ${m}m overdue`);
      } else {
        setIsOverdue(false);
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1_000);
        setDisplay(`${h}h ${m}m ${s}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
        {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {display}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isOverdue ? 'bg-priority-critical-subtle text-destructive' : 'bg-accent text-accent-foreground'}`}>
      {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      <span>{isOverdue ? 'OVERDUE: ' : 'SLA: '}{display}</span>
    </div>
  );
};
