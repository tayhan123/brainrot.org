import React from "react";

export function CuteRobotAvatar({ className = "w-10 h-10 animate-float" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="25" width="70" height="55" rx="25" fill="#7D69EC" stroke="#1E1B4B" strokeWidth="4" />
      <rect x="22" y="32" width="56" height="41" rx="16" fill="white" stroke="#1E1B4B" strokeWidth="4" />
      {/* Eyes */}
      <circle cx="38" cy="50" r="8" fill="#1E1B4B" />
      <circle cx="62" cy="50" r="8" fill="#1E1B4B" />
      {/* Highlights */}
      <circle cx="36" cy="48" r="2.5" fill="white" />
      <circle cx="60" cy="48" r="2.5" fill="white" />
      {/* Cheeks */}
      <circle cx="28" cy="58" r="4" fill="#FFAAAA" fillOpacity="0.8" />
      <circle cx="72" cy="58" r="4" fill="#FFAAAA" fillOpacity="0.8" />
      {/* Cute Smile */}
      <path d="M 44 60 Q 50 65 56 60" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Antenna */}
      <line x1="50" y1="25" x2="50" y2="12" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="10" r="6" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="3.5" />
      {/* Ears / Side lights */}
      <rect x="8" y="42" width="7" height="20" rx="3.5" fill="#FF9A9E" stroke="#1E1B4B" strokeWidth="3" />
      <rect x="85" y="42" width="7" height="20" rx="3.5" fill="#FF9A9E" stroke="#1E1B4B" strokeWidth="3" />
    </svg>
  );
}

export function StudentAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#FFD6A5" stroke="#1E1B4B" strokeWidth="4" />
      {/* Hair */}
      <path d="M 12 40 C 22 15, 78 15, 88 40 C 85 30, 15 30, 12 40 Z" fill="#4B3F72" />
      <circle cx="36" cy="52" r="6" fill="#1E1B4B" />
      <circle cx="64" cy="52" r="6" fill="#1E1B4B" />
      <circle cx="34" cy="50" r="1.8" fill="white" />
      <circle cx="62" cy="50" r="1.8" fill="white" />
      {/* Blushing cheeks */}
      <circle cx="26" cy="59" r="4" fill="#FFADAD" />
      <circle cx="74" cy="59" r="4" fill="#FFADAD" />
      {/* Smile */}
      <path d="M 42 63 Q 50 69 58 63" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function OwlAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#FCEADE" stroke="#1E1B4B" strokeWidth="4" />
      {/* Tufts */}
      <path d="M 20 25 L 35 15 L 42 28 Z" fill="#D3A588" stroke="#1E1B4B" strokeWidth="3" />
      <path d="M 80 25 L 65 15 L 58 28 Z" fill="#D3A588" stroke="#1E1B4B" strokeWidth="3" />
      {/* Eyes */}
      <circle cx="38" cy="46" r="14" fill="white" stroke="#1E1B4B" strokeWidth="3" />
      <circle cx="62" cy="46" r="14" fill="white" stroke="#1E1B4B" strokeWidth="3" />
      <circle cx="38" cy="46" r="6" fill="#1E1B4B" />
      <circle cx="62" cy="46" r="6" fill="#1E1B4B" />
      <circle cx="36" cy="44" r="1.8" fill="white" />
      <circle cx="60" cy="44" r="1.8" fill="white" />
      {/* Glasses connector bridge */}
      <path d="M 44 46 L 56 46" stroke="#1E1B4B" strokeWidth="3.5" />
      {/* Beak */}
      <path d="M 50 52 L 45 60 L 55 60 Z" fill="#F59E0B" stroke="#1E1B4B" strokeWidth="3" />
      {/* Blush */}
      <circle cx="20" cy="56" r="3.5" fill="#FFC9C9" />
      <circle cx="80" cy="56" r="3.5" fill="#FFC9C9" />
    </svg>
  );
}

export function CatAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#E2E8F0" stroke="#1E1B4B" strokeWidth="4" />
      {/* Ears */}
      <path d="M 16 35 L 12 12 L 35 24 Z" fill="#CBD5E1" stroke="#1E1B4B" strokeWidth="3" strokeLinejoin="round" />
      <path d="M 84 35 L 88 12 L 65 24 Z" fill="#CBD5E1" stroke="#1E1B4B" strokeWidth="3" strokeLinejoin="round" />
      {/* Wizard Hat */}
      <path d="M 28 26 L 50 -2 L 72 26 Z" fill="#7D69EC" stroke="#1E1B4B" strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="24" rx="26" ry="6" fill="#1E1B4B" />
      {/* Eyes */}
      <circle cx="36" cy="54" r="6" fill="#1E1B4B" />
      <circle cx="64" cy="54" r="6" fill="#1E1B4B" />
      <circle cx="34" cy="52" r="1.5" fill="white" />
      <circle cx="62" cy="52" r="1.5" fill="white" />
      {/* Cat whiskers smile */}
      <path d="M 50 60 Q 47 63 44 60" stroke="#1E1B4B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 50 60 Q 53 63 56 60" stroke="#1E1B4B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* External whiskers */}
      <line x1="20" y1="58" x2="10" y2="56" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="62" x2="9" y2="62" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="58" x2="90" y2="56" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="62" x2="91" y2="62" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export type AvatarType = "student" | "robot" | "owl" | "cat";

interface StudyAvatarProps {
  type: AvatarType;
  className?: string;
}

export default function StudyAvatar({ type, className }: StudyAvatarProps) {
  switch (type) {
    case "robot":
      return <CuteRobotAvatar className={className} />;
    case "owl":
      return <OwlAvatar className={className} />;
    case "cat":
      return <CatAvatar className={className} />;
    case "student":
    default:
      return <StudentAvatar className={className} />;
  }
}
