import { BookOpen, Headphones, BookMarked } from 'lucide-react';

interface SkillConfigItem {
  label: string;
  icon: any;
  color: string;
}

export const SKILL_CONFIG: Record<string, SkillConfigItem> = {
  reading: { label: 'Reading', icon: BookOpen, color: 'from-indigo-500 to-indigo-700' },
  listening: { label: 'Listening', icon: Headphones, color: 'from-purple-500 to-purple-700' },
  writing: { label: 'Writing', icon: BookMarked, color: 'from-emerald-500 to-emerald-700' },
  speaking: { label: 'Speaking', icon: Headphones, color: 'from-rose-500 to-rose-700' },
};
