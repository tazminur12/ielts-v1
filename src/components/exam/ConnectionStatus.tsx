"use client";

import { Wifi, WifiOff, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface ConnectionStatusProps {
  isOnline: boolean;
  lastSaved?: Date;
}

export default function ConnectionStatus({ isOnline, lastSaved }: ConnectionStatusProps) {
  const [secondsSinceLastSave, setSecondsSinceLastSave] = useState(0);

  useEffect(() => {
    if (!lastSaved) return;

    const updateSeconds = () => {
      const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      setSecondsSinceLastSave(diff);
    };

    updateSeconds();
    const id = setInterval(updateSeconds, 1000);
    return () => clearInterval(id);
  }, [lastSaved]);

  const getStatusColor = () => {
    if (!isOnline) return "bg-red-100 border-red-300";
    if (secondsSinceLastSave > 60) return "bg-amber-100 border-amber-300";
    return "bg-emerald-50 border-emerald-200";
  };

  const getDotColor = () => {
    if (!isOnline) return "bg-red-500 animate-pulse";
    if (secondsSinceLastSave > 60) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${getStatusColor()}`}>
      <div className={`w-2 h-2 rounded-full ${getDotColor()}`} />
      
      {!isOnline ? (
        <div className="flex items-center gap-1.5">
          <WifiOff size={12} className="text-red-600" />
          <span className="text-red-700 font-semibold">Offline — saving locally</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Wifi size={12} className="text-emerald-600" />
          <span className="text-emerald-700 font-medium">Online</span>
          <span className="text-emerald-600 opacity-75 flex items-center gap-0.5">
            <Clock size={10} />
            Last saved: {secondsSinceLastSave < 10 ? "just now" : `${secondsSinceLastSave}s ago`}
          </span>
        </div>
      )}
    </div>
  );
}
