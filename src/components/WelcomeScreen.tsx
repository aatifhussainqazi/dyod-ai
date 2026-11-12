import React from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  ClipboardList,
  Layers,
  Sprout,
  ArrowRight,
} from 'lucide-react';

interface WelcomeScreenProps {
  onSelectQuestion: (question: string) => void;
}

const EXAMPLE_QUESTIONS = [
  {
    icon: Layers,
    title: 'The 8 Academic Baskets',
    prompt: 'What are the 8 academic baskets in the DYOD programme at IUST?',
    desc: 'Explore the multidisciplinary baskets, course distributions, and elective domains.',
    badge: 'Curriculum',
  },
  {
    icon: ClipboardList,
    title: 'Term-End Project Evaluation',
    prompt: 'Explain the evaluation strategy, phases, and rubric for the DYOD term-end project at IUST.',
    desc: 'Review the official viva voce, deliverable phases, and scoring criteria.',
    badge: 'Assessment',
  },
  {
    icon: Sprout,
    title: 'Seed Paper Practical Methodology',
    prompt: 'Explain the step-by-step practical methodology for making seed paper from university waste paper.',
    desc: 'From paper shredding, soaking, blending, to deckle sheet formation and drying.',
    badge: 'Practical',
  },
  {
    icon: GraduationCap,
    title: 'Credits & Early Exit Options',
    prompt: 'What are the credit categorizations and early exit options in the DYOD curriculum?',
    desc: 'Understand certificates, diplomas, bachelor degrees, and credit thresholds.',
    badge: 'Structure',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectQuestion }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center animate-in fade-in duration-300">
      {/* Brand Icon Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Dedicated Academic Companion • IUST Awantipora
      </div>

      <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
        Let's understand <span className="bg-gradient-to-r from-sky-400 to-dyod-400 bg-clip-text text-transparent">DYOD</span> together.
      </h1>

      <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed mb-8">
        Ask questions about your approved DYOD study materials, understand difficult concepts,
        revise topics, and explore your coursework with grounded citations.
      </p>

      {/* Suggested Question Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {EXAMPLE_QUESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(item.prompt)}
              className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/40 transition-all text-left group shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                    {item.badge}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-slate-100 group-hover:text-sky-300 transition-colors mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-sky-400 group-hover:translate-x-1 transition-transform">
                <span>Ask assistant</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
