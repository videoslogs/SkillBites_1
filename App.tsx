
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { GoogleGenAI, Type } from "@google/genai";
import { User, Goal, Plan, Lesson, Badge, AppSettings, SubscriptionTier, Difficulty, QuizQuestion, ProgramType } from './types';
import { DUMMY_USER, ALL_DUMMY_BADGES, DUMMY_DRILLS, DUMMY_TESTIMONIALS, DUMMY_BREATHING_DRILL } from './constants';
import { Logo, CoffeeIcon, ChevronRightIcon, CheckCircleIcon, CircleIcon, FlameIcon, TargetIcon, ClockIcon, PauseIcon, XIcon, SettingsIcon, DownloadIcon, PlusCircleIcon, MicIcon, StopCircleIcon, RefreshCwIcon, RepeatIcon, AwardIcon, SparklesIcon, TwitterIcon, LinkedinIcon, BellIcon, InfoIcon, ZapIcon, AlertTriangleIcon, Volume2Icon, SearchIcon, ArrowLeftIcon, LockIcon, HomeIcon, CalendarIcon, MessageSquareIcon, SunIcon, MoonIcon, Share2Icon, PlayIcon, BookOpenIcon } from './components/Icons';

// --- Utilities ---
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// --- Data Sanitization Utilities ---
const sanitizeGoal = (data: any): Goal | null => {
    if (!data || typeof data !== 'object') return null;
    if (!data.title) return null; 

    return {
        id: data.id || `goal-${Date.now()}`,
        title: String(data.title),
        description: data.description || '',
        progress: Number(data.progress) || 0,
        streak: Number(data.streak) || 0,
        badges: Array.isArray(data.badges) ? data.badges : [],
        xp: Number(data.xp) || 0,
        level: Number(data.level) || 1,
        difficulty: (['Beginner', 'Intermediate', 'Advanced'] as const).includes(data.difficulty) ? data.difficulty : 'Beginner',
        completionDates: Array.isArray(data.completionDates) ? data.completionDates : []
    };
};

const sanitizeUser = (data: any): User => {
    return {
        id: data.id || DUMMY_USER.id,
        email: data.email || DUMMY_USER.email,
        name: data.name || DUMMY_USER.name,
        subscriptionTier: data.subscriptionTier || 'pro',
        streak: Number(data.streak) || 0,
        lastLessonDate: data.lastLessonDate,
        lastActive: data.lastActive,
        history: Array.isArray(data.history) ? data.history : []
    };
};

const sanitizePlan = (data: any): Plan | null => {
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.lessons)) return null;
    
    const sanitizedLessons = data.lessons.map((l: any, index: number) => ({
        id: l.id || `lesson-${Date.now()}-${index}`,
        day: Number(l.day) || (index + 1),
        title: l.title || `Day ${index + 1}`,
        description: l.description || '',
        duration: Number(l.duration) || 10,
        type: (['text_and_exercise', 'voice_practice', 'quick_drill'] as const).includes(l.type) ? l.type : 'text_and_exercise',
        content: Array.isArray(l.content) ? l.content : [],
        exercise: l.exercise ? { title: l.exercise.title || 'Exercise', description: l.exercise.description || '' } : undefined,
        voicePrompt: l.voicePrompt || undefined,
        selfCheck: l.selfCheck && l.selfCheck.question ? {
            question: l.selfCheck.question,
            options: Array.isArray(l.selfCheck.options) && l.selfCheck.options.length > 0 ? l.selfCheck.options : ['Completed'],
            correctAnswer: l.selfCheck.correctAnswer || 'Completed'
        } : { 
            question: 'Did you complete this lesson?',
            options: ['Yes', 'No'],
            correctAnswer: 'Yes'
        },
        // New Fields Sanitization
        realWorldExamples: Array.isArray(l.realWorldExamples) ? l.realWorldExamples : [],
        practicalTask: l.practicalTask || '',
        gamifiedQuiz: Array.isArray(l.gamifiedQuiz) ? l.gamifiedQuiz : [],
        
        isCompleted: Boolean(l.isCompleted),
        notes: l.notes || '',
        currentStep: Number(l.currentStep) || 0,
        difficultyRating: l.difficultyRating || undefined
    }));

    return {
        id: data.id || `plan-${Date.now()}`,
        goalId: data.goalId || 'unknown',
        title: data.title || 'My Plan',
        programType: data.programType || '7-days',
        lessons: sanitizedLessons
    };
};

// --- Hooks ---
const useStickyState = <T,>(defaultValue: T, key: string, sanitizer?: (data: any) => T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      if (stickyValue !== null) {
        const parsed = JSON.parse(stickyValue);
        if (sanitizer) {
            return sanitizer(parsed);
        }
        return parsed;
      }
      return defaultValue;
    } catch (e) {
      console.error(`Error reading from localStorage key "${key}":`, e);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing to localStorage key "${key}":`, e);
    }
  }, [key, value]);

  return [value, setValue];
};

const useFocusOnMount = () => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
        }
        window.scrollTo(0, 0);
    }, []);
    return ref;
};

// --- Components ---

const LoadingOverlay = ({ messages = ["Loading..."] }: { messages?: string[] }) => {
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex(prev => (prev + 1) % messages.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div role="status" aria-live="polite" className="fixed inset-0 bg-white/90 dark:bg-[#0B1121]/90 z-50 flex flex-col items-center justify-center backdrop-blur-xl animate-[fade-up_0.3s]">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-slate-300 dark:border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                     <Logo className="w-10 h-10 text-teal-500 animate-pulse-slow" />
                </div>
            </div>
            <p key={msgIndex} className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-200 animate-[slide-in-fade_0.5s] text-center max-w-md px-4">
                {messages[msgIndex]}
            </p>
        </div>
    );
};

const TextToSpeech = ({ text, label, className = '' }: { text: string, label?: string, className?: string }) => {
    const [speaking, setSpeaking] = useState(false);
    const [paused, setPaused] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (speaking && !paused) {
            window.speechSynthesis.pause();
            setPaused(true);
            return;
        }

        if (paused) {
            window.speechSynthesis.resume();
            setPaused(false);
            return;
        }

        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English")) || 
                             voices.find(v => v.name.includes("Samantha")) ||
                             voices.find(v => v.lang.startsWith("en"));
                             
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            setSpeaking(false);
            setPaused(false);
        };
        
        utterance.onerror = () => {
             setSpeaking(false);
             setPaused(false);
        }

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
    };
    
    const handleStop = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.speechSynthesis.cancel();
        setSpeaking(false);
        setPaused(false);
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
             <button 
                onClick={handlePlay}
                aria-label={speaking ? (paused ? "Resume reading" : "Pause reading") : "Read aloud"}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-bold tracking-wide border focus:ring-2 focus:ring-teal-500 focus:outline-none ${speaking && !paused 
                    ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800' 
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                title={speaking ? "Pause" : "Read aloud"}
            >
                {speaking && !paused ? <PauseIcon className="w-4 h-4" /> : <Volume2Icon className="w-4 h-4" />}
                {label && <span>{label}</span>}
            </button>
            {(speaking || paused) && (
                 <button 
                    onClick={handleStop}
                    aria-label="Stop reading"
                    className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
                    title="Stop"
                >
                    <div className="w-2.5 h-2.5 bg-current rounded-sm" />
                </button>
            )}
        </div>
    );
};

const Button = ({ onClick, children, className = '', variant = 'primary', disabled = false, type = 'button', ariaLabel, tabIndex }: { onClick?: () => void; children?: React.ReactNode; className?: string; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit' | 'reset'; ariaLabel?: string; tabIndex?: number }) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-xl font-bold font-heading tracking-wide transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0B1121] disabled:opacity-50 disabled:cursor-not-allowed gap-2 active:scale-[0.98] hover:scale-[1.02] px-6 py-3 whitespace-nowrap';
    const variantClasses = {
        primary: 'bg-teal-400 text-slate-900 shadow-lg shadow-teal-500/20 hover:bg-teal-300 hover:shadow-teal-500/30 hover:-translate-y-0.5 focus:ring-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-900 border border-transparent',
        secondary: 'bg-white text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750 shadow-sm hover:-translate-y-0.5',
        ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 border border-transparent',
    };
    return (
        <button type={type} onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`} disabled={disabled} aria-label={ariaLabel} tabIndex={tabIndex}>
            {children}
        </button>
    );
};

interface CardProps {
    children?: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
    <div 
        onClick={onClick} 
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className={`bg-white/90 dark:bg-[#161f32]/90 backdrop-blur-xl rounded-2xl transition-all duration-300 p-4 border border-slate-200 dark:border-slate-700 shadow-[0_0_10px_rgba(0,0,0,0.05)] hover:shadow-[0_0_20px_rgba(20,184,166,0.25)] hover:border-teal-500/50 dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_0_25px_rgba(20,184,166,0.4)] dark:hover:border-teal-400/60 ${onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-teal-500' : ''} ${className}`}
    >
        {children}
    </div>
);

const BuyCoffeeFloating = () => (
    <a 
        href="https://www.paypal.com/donate/?hosted_button_id=J29BARJS29AZN" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center justify-center gap-2 bg-[#FFDD00] hover:bg-[#F4D03F] text-slate-900 px-3 py-2 sm:px-4 sm:py-3 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] font-bold font-heading transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm border-2 border-slate-900 animate-[pop_0.5s_1s_backwards] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
        title="Support the developer"
        aria-label="Buy me a coffee (Support the developer)"
    >
        <CoffeeIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Buy me a coffee</span>
    </a>
);

const GlobalSearch = ({ onClose, plan, onNavigate }: { onClose: () => void; plan: Plan | null; onNavigate: (view: string, id: string, type?: string, data?: any) => void }) => {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Trap focus effect
    useEffect(() => {
        inputRef.current?.focus();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const filteredLessons = plan?.lessons.filter(l => l.title.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())) || [];
    const filteredDrills = DUMMY_DRILLS.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-sm" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Search content"
        >
            <div className="bg-white dark:bg-[#161f32] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-[fade-up_0.2s]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <SearchIcon className="w-5 h-5 text-slate-400" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Search lessons or drills..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white text-lg placeholder:text-slate-400"
                        aria-label="Search query"
                    />
                    <button onClick={onClose} aria-label="Close search" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"><XIcon className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="overflow-y-auto p-2">
                    {!search && <p className="text-center text-slate-500 py-8">Type to search...</p>}
                    {search && (
                        <div className="space-y-2">
                            {filteredLessons.length > 0 && (
                                <div>
                                    <h3 className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Lessons</h3>
                                    {filteredLessons.map(l => (
                                        <button key={l.id} onClick={() => onNavigate('lesson', l.id)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl flex items-center gap-3 transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50 focus:ring-2 focus:ring-teal-500">
                                            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">{l.day}</div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{l.title}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-xs">{l.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {filteredDrills.length > 0 && (
                                <div>
                                    <h3 className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Drills</h3>
                                    {filteredDrills.map(d => (
                                        <button key={d.id} onClick={() => onNavigate('lesson', d.id, 'drill', d)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl flex items-center gap-3 transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50 focus:ring-2 focus:ring-teal-500">
                                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center"><ZapIcon className="w-4 h-4" /></div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{d.title}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-xs">{d.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {filteredLessons.length === 0 && filteredDrills.length === 0 && (
                                <p className="text-center text-slate-500 py-8">No results found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LegalModal = ({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }) => {
    // Focus trap for accessibility
    const modalRef = useFocusOnMount();
    
    return (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-[fade-up_0.3s]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-title"
        >
            <div 
                ref={modalRef}
                tabIndex={-1}
                className="bg-white dark:bg-[#161f32] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700 outline-none animate-[pop_0.4s_cubic-bezier(0.16,1,0.3,1)]"
            >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 id="legal-title" className="text-2xl font-bold font-heading text-slate-900 dark:text-white">Privacy & Terms</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"><XIcon className="w-6 h-6 text-slate-500" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-8" tabIndex={0}>
                     <section>
                        <h3 className="text-lg font-bold font-heading mb-2 text-slate-800 dark:text-slate-200">About SkillBites AI</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                            SkillBites AI is a free personal growth tool that uses artificial intelligence to generate micro-learning plans. Our mission is to democratize coaching by providing accessible, bite-sized learning for everyone.
                        </p>
                    </section>
        
                    <section>
                        <h3 className="text-lg font-bold font-heading mb-2 text-slate-800 dark:text-slate-200">Data Storage & Privacy</h3>
                        <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-2">
                            <p><strong>Local Storage:</strong> We utilize your browser's LocalStorage to save your progress, plan, and settings directly on your device. We do not maintain a central database of your personal activity.</p>
                            <p><strong>Google Gemini API:</strong> Your goal inputs are sent to Google's Gemini API to generate content. This data usage is governed by Google's API terms. We do not sell your personal data.</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold font-heading mb-2 text-slate-800 dark:text-slate-200">GDPR Compliance</h3>
                        <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-2">
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Access:</strong> You have full access to your data within the app.</li>
                                <li><strong>Rectification:</strong> You can reset or change your goal at any time.</li>
                                <li><strong>Erasure:</strong> Clearing your browser cache or using the "Reset Progress" button permanently deletes your data from this device.</li>
                            </ul>
                        </div>
                    </section>
                    
                    <section>
                         <h3 className="text-lg font-bold font-heading mb-2 text-slate-800 dark:text-slate-200">Cookies</h3>
                         <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                            We use essential local storage (cookies) to ensure the app functions correctly, such as remembering your learning plan and theme preference. By continuing to use the app, you consent to this usage.
                         </p>
                    </section>
                </div>
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                    <Button onClick={onClose} variant="ghost" className="text-sm">Decline</Button>
                    <Button onClick={onAccept} className="text-sm px-8 shadow-none">Accept & Continue</Button>
                </div>
            </div>
        </div>
    );
};

const Certificate = ({ plan, userName }: { plan: Plan; userName: string }) => {
    const handleShare = async () => {
        const text = `I just completed the "${plan.title}" program on SkillBites AI! 🎓✨ #SkillBites #PersonalGrowth`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My SkillBites Certificate',
                    text: text,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Error sharing', err);
            }
        } else {
            navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        }
    };

    return (
        <div className="relative p-1 rounded-2xl bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 shadow-xl mt-8 animate-[pop_0.6s]">
            <div className="bg-white dark:bg-[#161f32] p-8 rounded-xl border-4 border-double border-yellow-500/50 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-300 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-300 rounded-full blur-3xl opacity-20"></div>

                <AwardIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Certificate of Completion</h3>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 dark:text-white mb-6">
                    {userName || "Guest Learner"}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-2">has successfully completed the program</p>
                <h4 className="text-xl md:text-2xl font-bold text-teal-600 dark:text-teal-400 mb-6 font-heading">"{plan.title}"</h4>
                
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-8 font-mono">
                    <span>{new Date().toLocaleDateString()}</span>
                    <span>•</span>
                    <span>SkillBites AI</span>
                </div>

                <div className="flex justify-center">
                     <Button onClick={handleShare} className="bg-yellow-500 hover:bg-yellow-400 text-white shadow-yellow-500/20 w-full sm:w-auto">
                        <Share2Icon className="w-4 h-4" /> Share Achievement
                     </Button>
                </div>
            </div>
        </div>
    );
};

const Footer = ({ onNavigate }: { onNavigate: (view: string) => void }) => {
    return (
        <div className="w-full bg-white dark:bg-[#161f32] border-t border-slate-200 dark:border-slate-800 py-8 px-4 mt-8" role="contentinfo">
            <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-8">
                 <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                     <button onClick={() => onNavigate('home')} className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 cursor-pointer">Home</button>
                     <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
                     <button onClick={() => onNavigate('legal')} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 cursor-pointer">Legal & Cookies</button>
                 </div>
                 <div className="text-xs text-slate-400 text-center space-y-2">
                    <p>SkillBites AI © {new Date().getFullYear()}. All rights reserved. Locally stored, privacy first.</p>
                    <p className="opacity-70">This is an AI model and it can make mistakes. Please verify important information.</p>
                 </div>
            </div>
        </div>
    );
}

const ProgressBar = ({ current, total }: { current: number, total: number }) => {
    const percentage = Math.round((current / total) * 100);
    return (
        <div className="w-full mt-4">
             <div className="flex justify-between text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                <span>Progress</span>
                <span>{percentage}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)] transition-all duration-1000 ease-out" 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

const StreakCalendar = ({ history }: { history: string[] }) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    return (
        <div className="flex flex-col gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Activity History (Last 7 Days)
            </h4>
            <div className="flex justify-between items-center gap-2">
                {days.map((date, idx) => {
                    const dateStr = date.toDateString();
                    const isActive = history.includes(dateStr);
                    const isToday = dateStr === new Date().toDateString();
                    
                    return (
                        <div key={idx} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                ${isActive 
                                    ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-500/30' 
                                    : isToday
                                        ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-400 border-dashed'
                                        : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-300'
                                }`}>
                                {isActive ? <CheckCircleIcon className="w-5 h-5" /> : date.getDate()}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                        </div>
                    );
                })}
            </div>
            {history.length > 0 && <p className="text-xs text-slate-400 mt-2 text-center">Keep it up! Consistency is key.</p>}
        </div>
    );
};

const LandingPage = ({ onStart }: { onStart: (name: string) => void }) => {
    const [name, setName] = useState('');
    return (
        <div className="relative flex flex-col min-h-screen items-center justify-center text-center px-4 sm:px-6 lg:px-8 animate-[fade-up_0.8s] py-12 sm:py-20 overflow-x-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[300px] sm:h-[500px] bg-gradient-to-b from-teal-500/10 to-transparent blur-[80px] sm:blur-[120px] rounded-full pointer-events-none"></div>
            <div className="relative z-10 max-w-5xl mx-auto space-y-8 sm:space-y-12 pt-6 sm:pt-10">
                <div className="space-y-6 sm:space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs sm:text-sm font-semibold shadow-sm animate-[pop_0.6s_0.2s_backwards]">
                        <SparklesIcon className="w-4 h-4" />
                        <span>AI-Powered Personal Growth (Free Forever)</span>
                    </div>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-heading tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                        Master Real-World Skills<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500 block mt-2 pb-2">in 10 Minutes a Day</span>
                    </h1>
                    <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                        Stop procrastinating. Start achieving. SkillBites AI generates personalized daily coaching sessions to help you build habits and master any goal.
                    </p>
                </div>
                
                <div className="flex flex-col items-center justify-center gap-4 w-full max-w-md mx-auto">
                     <label htmlFor="name-input" className="sr-only">Your Name</label>
                     <input id="name-input" type="text" placeholder="What's your first name?" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 sm:px-6 sm:py-4 rounded-xl bg-white dark:bg-[#0B1121] border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-lg shadow-slate-200/50 dark:shadow-none text-center text-lg font-medium transition-all focus:scale-[1.02]"/>
                    <Button onClick={() => onStart(name)} disabled={!name.trim()} className="px-8 py-3 sm:py-4 text-lg w-full shadow-teal-500/25 hover:shadow-teal-500/40">
                        Start Your Journey <ChevronRightIcon className="w-5 h-5" />
                    </Button>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">No account required. Free for everyone.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-8 sm:pt-12 text-left">
                     <div className="bg-white/60 dark:bg-[#161f32]/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow hover:scale-[1.02] duration-300">
                        <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4">
                            <TargetIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-2">1. Define Your Goal</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Tell our AI what you want to achieve. It instantly creates a custom micro-learning plan tailored to your level.</p>
                    </div>
                    <div className="bg-white/60 dark:bg-[#161f32]/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow hover:scale-[1.02] duration-300">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                            <ZapIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-2">2. Byte-Sized Actions</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Choose a 1-day crash course or a 7-day habit builder. Just bite-sized lessons that fit your busy schedule.</p>
                    </div>
                    <div className="bg-white/60 dark:bg-[#161f32]/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow hover:scale-[1.02] duration-300">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-2">3. Get AI Feedback</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Practice speaking or reflect on your progress, and get instant, personalized coaching from our AI.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NewGoal = ({ onGeneratePlan, isLoading }: { onGeneratePlan: (goal: string, difficulty: Difficulty, type: ProgramType, duration: string) => void; isLoading: boolean; }) => {
    const [goal, setGoal] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
    const [programType, setProgramType] = useState<ProgramType>('7-days');
    const [duration, setDuration] = useState<string>('15 mins');

    const POPULAR_GOALS = ["Public Speaking Confidence", "Learn Python Basics", "Manage Stress & Anxiety", "Basics of Photography", "Effective Leadership", "Healthy Cooking Habits"];
    const [suggestions, setSuggestions] = useState(POPULAR_GOALS);
    const [isInspiring, setIsInspiring] = useState(false);
    
    const handleInspireMe = async () => {
        setIsInspiring(true);
        setTimeout(() => { setSuggestions(["Master Chess Tactics", "Learn to Meditate", "Budgeting 101", "Basic First Aid", "Creative Writing", "Digital Marketing Basics"].sort(() => 0.5 - Math.random())); setIsInspiring(false); }, 800);
    };

    const timeOptions = programType === '1-day' 
        ? ['30 mins', '1 hour', '2 hours', '4 hours'] 
        : ['5 mins/day', '10 mins/day', '15 mins/day', '20 mins/day'];

    useEffect(() => {
        // Reset default duration when switching types
        setDuration(programType === '1-day' ? '1 hour' : '15 mins/day');
    }, [programType]);

    return (
        <div className="max-w-3xl mx-auto py-4 sm:py-8 animate-[slide-in-fade_0.5s]">
             <div className="mb-8 sm:mb-12 text-center"><div className="inline-block p-4 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 mb-6 shadow-sm"><TargetIcon className="w-10 h-10" /></div><h1 className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-slate-900 dark:text-slate-100 mb-4">What do you want to achieve?</h1><p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">Define your goal, and our AI will craft a personalized curriculum just for you.</p></div>
            <form onSubmit={(e) => { e.preventDefault(); onGeneratePlan(goal, difficulty, programType, duration); }} className="space-y-6 sm:space-y-8 bg-white dark:bg-[#161f32] p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
                 
                 <div className="space-y-4">
                    <label htmlFor="goal-input" className="block text-sm font-bold font-heading text-slate-700 dark:text-slate-300 uppercase tracking-wider">I want to learn...</label>
                    <div className="relative">
                        <textarea 
                            id="goal-input"
                            rows={2} 
                            value={goal} 
                            onChange={(e) => setGoal(e.target.value)} 
                            className="w-full p-4 text-lg sm:text-xl font-medium bg-slate-50 dark:bg-[#0B1121] rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:ring-0 transition-all resize-none placeholder:text-slate-400 animate-glow-border" 
                            placeholder="e.g., 'Confidently present my project to stakeholders'" 
                        />
                    </div>
                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suggestions</span><button type="button" onClick={handleInspireMe} className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-1">{isInspiring ? <span className="animate-spin">✨</span> : <SparklesIcon className="w-3 h-3"/>} Inspire Me</button></div>
                    <div className="flex flex-wrap gap-2 mt-2">{suggestions.map(g => (<button key={g} type="button" onClick={() => setGoal(g)} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-teal-100 hover:text-teal-700 dark:hover:bg-teal-900/40 dark:hover:text-teal-300 transition-all border border-slate-200 dark:border-slate-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500">+ {g}</button>))}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <span className="block text-sm font-bold font-heading text-slate-700 dark:text-slate-300 uppercase tracking-wider">Program Type</span>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button type="button" onClick={() => setProgramType('1-day')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${programType === '1-day' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-500'}`}>1 Day Deep Dive</button>
                            <button type="button" onClick={() => setProgramType('7-days')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${programType === '7-days' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-500'}`}>7 Day Habit</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <span className="block text-sm font-bold font-heading text-slate-700 dark:text-slate-300 uppercase tracking-wider">Time Commitment</span>
                         <div className="flex flex-wrap gap-2">
                            {timeOptions.map(opt => (
                                <button 
                                    key={opt} 
                                    type="button" 
                                    onClick={() => setDuration(opt)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${duration === opt ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500 text-teal-700 dark:text-teal-300' : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                <div className="space-y-4"><span className="block text-sm font-bold font-heading text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Experience Level</span><div className="grid grid-cols-3 gap-3 sm:gap-4">{(['Beginner', 'Intermediate', 'Advanced'] as Difficulty[]).map(level => (<button key={level} type="button" onClick={() => setDifficulty(level)} className={`py-3 sm:py-4 px-2 sm:px-4 rounded-xl border-2 font-bold font-heading transition-all duration-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500 ${difficulty === level ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-900 dark:text-teal-300 shadow-md shadow-teal-500/10' : 'border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'}`}>{level}</button>))}</div></div>
                <Button type="submit" className="w-full py-4 sm:py-5 text-lg shadow-xl shadow-teal-500/20 font-bold" disabled={!goal || isLoading}>{isLoading ? 'Generating Plan...' : 'Generate My Learning Plan'}</Button>
            </form>
        </div>
    );
};

// Drill Mode Component
const DrillMode = ({ lesson, onComplete, onBack }: { lesson: Lesson; onComplete: () => void; onBack: () => void }) => {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(lesson.duration * 60);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        let interval: number;
        if (isActive && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsFinished(true);
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 animate-[fade-up_0.5s]">
            <div className="w-full flex justify-start mb-4">
                 <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2">
                    <ArrowLeftIcon className="w-4 h-4" /> End Drill
                </button>
            </div>

            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold font-heading mb-2">{lesson.title}</h2>
                <p className="text-slate-500 dark:text-slate-400">{lesson.description}</p>
            </div>

            <div className="relative mb-12">
                <div className={`w-64 h-64 rounded-full border-8 flex items-center justify-center text-6xl font-mono font-bold transition-all duration-1000 ${isActive ? 'border-teal-500 shadow-[0_0_50px_rgba(20,184,166,0.3)] animate-pulse-slow' : 'border-slate-200 dark:border-slate-700'}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="flex gap-4">
                {!isFinished ? (
                    <Button onClick={() => setIsActive(!isActive)} variant={isActive ? 'secondary' : 'primary'} className="w-40 text-lg">
                        {isActive ? <><PauseIcon /> Pause</> : <><PlayIcon /> Start</>}
                    </Button>
                ) : (
                    <Button onClick={onComplete} className="w-40 text-lg animate-[pop_0.5s]">
                        <CheckCircleIcon /> Complete
                    </Button>
                )}
            </div>
            
            {lesson.exercise && (
                <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl max-w-lg w-full text-center">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{lesson.exercise.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300">{lesson.exercise.description}</p>
                </div>
            )}
        </div>
    );
};

// Interactive Quiz Component for Gamification
const QuizSection = ({ quiz, onComplete }: { quiz: QuizQuestion[]; onComplete: () => void }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [completed, setCompleted] = useState(false);
    const quizRef = useRef<HTMLDivElement>(null);

    // Scroll to quiz on mount or question change
    useEffect(() => {
        if(quizRef.current) {
            // Optional: scroll into view gently if needed
            // quizRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentQuestion]);

    const handleAnswer = (option: string) => {
        if (selectedOption) return; // Prevent double clicks
        setSelectedOption(option);
        
        const correct = option === quiz[currentQuestion].correctAnswer;
        setIsCorrect(correct);

        if (correct) {
            setTimeout(() => {
                if (currentQuestion < quiz.length - 1) {
                    setCurrentQuestion(prev => prev + 1);
                    setSelectedOption(null);
                    setIsCorrect(null);
                } else {
                    setCompleted(true);
                    onComplete();
                }
            }, 1500);
        } else {
             setTimeout(() => {
                setSelectedOption(null);
                setIsCorrect(null);
             }, 1500);
        }
    };

    if (completed) {
        return (
            <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 animate-[pop_0.5s]">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-300 mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold font-heading text-green-800 dark:text-green-300 mb-2">Level Complete!</h3>
                <p className="text-green-700 dark:text-green-400">You've mastered this concept. Proceed to the next step!</p>
            </div>
        );
    }

    const q = quiz[currentQuestion];

    return (
        <Card className="border-l-4 border-l-yellow-400" onClick={() => {}}>
             <div ref={quizRef} className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold font-heading flex items-center gap-2">
                    <ZapIcon className="w-5 h-5 text-yellow-500" />
                    Knowledge Check
                </h3>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">
                    Question {currentQuestion + 1}/{quiz.length}
                </span>
             </div>
             
             <p className="text-lg font-medium text-slate-800 dark:text-white mb-6" id="question-text">{q.question}</p>
             
             <div className="space-y-3" role="group" aria-labelledby="question-text">
                 {q.options.map((opt, idx) => (
                     <button
                        key={idx}
                        onClick={() => handleAnswer(opt)}
                        disabled={selectedOption !== null}
                        className={`w-full p-4 rounded-xl text-left transition-all duration-300 border-2 relative focus:outline-none focus:ring-2 focus:ring-offset-2
                            ${selectedOption === opt 
                                ? isCorrect 
                                    ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-500' 
                                    : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-500'
                                : 'bg-white dark:bg-[#0B1121] border-slate-200 dark:border-slate-700 hover:border-teal-400'
                            }
                        `}
                     >
                         <span className="font-bold mr-2 opacity-50">{String.fromCharCode(65 + idx)}.</span> {opt}
                         {selectedOption === opt && isCorrect && <CheckCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />}
                         {selectedOption === opt && isCorrect === false && <XIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />}
                     </button>
                 ))}
             </div>
        </Card>
    );
};

const LessonView = ({ lesson, onComplete, onBack, onUpdateLesson, user }: { lesson: Lesson; onComplete: () => void; onBack: () => void; onUpdateLesson: (id: string, updates: Partial<Lesson>) => void; user: User }) => {
    const [quizPassed, setQuizPassed] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const topRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if(topRef.current) {
            topRef.current.focus();
            window.scrollTo(0,0);
        }
    }, [lesson.id]);

    // If there is no quiz, consider it passed for completion purposes, but standard lessons should have one.
    const hasQuiz = lesson.gamifiedQuiz && lesson.gamifiedQuiz.length > 0;

    const handleLessonComplete = () => {
        setShowCelebration(true);
    };

    const handleContinue = () => {
        onComplete();
    };

    if (showCelebration) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-[fade-up_0.5s]" role="alertdialog" aria-modal="true" aria-labelledby="congrats-title">
                <div className="bg-white dark:bg-[#161f32] p-8 rounded-2xl max-w-sm w-full text-center border-4 border-yellow-400 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 animate-[moveBackground_2s_linear_infinite] bg-[length:40px_40px]"></div>
                    <AwardIcon className="w-24 h-24 text-yellow-500 mx-auto mb-6 animate-[pop_0.6s]" />
                    <h2 id="congrats-title" className="text-3xl font-bold font-heading text-slate-900 dark:text-white mb-2">Lesson Complete!</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">You've mastered this concept. Proceed to the next step!</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 flex items-center justify-center gap-3">
                         <div className="text-orange-500 flex items-center gap-1 font-bold text-xl">
                             <FlameIcon className="w-6 h-6 fill-current" />
                             <span>{user.streak + (user.lastLessonDate !== new Date().toDateString() ? 1 : 0)} Day Streak!</span>
                         </div>
                    </div>

                    <Button onClick={handleContinue} className="w-full">Continue Journey <ChevronRightIcon className="w-4 h-4" /></Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-6 animate-[slide-in-fade_0.5s] pb-32" ref={topRef} tabIndex={-1}>
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2">
                <ArrowLeftIcon className="w-4 h-4" /> Back to Plan
            </button>
            
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full text-sm font-bold uppercase tracking-wider">{lesson.day > 0 ? `Step ${lesson.day}` : 'Drill'}</span>
                    <span className="text-slate-400 text-sm flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {lesson.duration} min</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-heading text-slate-900 dark:text-white mb-4">{lesson.title}</h1>
                {lesson.description && <p className="text-lg text-slate-600 dark:text-slate-300 italic border-l-4 border-teal-500 pl-4">{lesson.description}</p>}
            </div>

            <div className="space-y-8">
                 {lesson.content && lesson.content.map((paragraph, i) => (
                    <div key={i} className="group relative">
                        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">{paragraph}</p>
                        <div className="absolute -right-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                            <TextToSpeech text={paragraph} />
                        </div>
                    </div>
                 ))}
                 
                 {/* Real World Examples */}
                 {lesson.realWorldExamples && lesson.realWorldExamples.length > 0 && (
                     <div className="grid md:grid-cols-2 gap-4">
                         {lesson.realWorldExamples.map((ex, i) => (
                             <div key={i} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                 <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2"><InfoIcon className="w-4 h-4"/> Real World Context</h4>
                                 <p className="text-sm text-blue-900 dark:text-blue-200">{ex}</p>
                             </div>
                         ))}
                     </div>
                 )}

                 {/* Practical Workout / Calculation */}
                 {lesson.practicalTask && (
                     <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-[#2d1b4e] dark:to-[#0f172a] border-l-4 border-l-purple-500 overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-4 opacity-5"><ZapIcon className="w-24 h-24" /></div>
                        <h3 className="text-xl font-bold font-heading text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                            <ZapIcon className="w-5 h-5" /> Challenge: Workout & Calculation
                        </h3>
                        <p className="text-slate-700 dark:text-slate-300 mb-4 font-medium">{lesson.practicalTask}</p>
                    </Card>
                 )}

                 {/* Original Exercise Display (Optional overlap with practical task but kept for structure) */}
                 {lesson.exercise && !lesson.practicalTask && (
                    <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-[#1e293b] dark:to-[#0f172a] border-l-4 border-l-teal-500 overflow-hidden relative">
                        <h3 className="text-xl font-bold font-heading text-teal-700 dark:text-teal-400 mb-3 flex items-center gap-2">
                            <TargetIcon className="w-5 h-5" /> Active Practice
                        </h3>
                        <p className="text-slate-700 dark:text-slate-300 mb-4">{lesson.exercise.description}</p>
                    </Card>
                 )}
                 
                 {/* Lesson Notes Feature */}
                 <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-200 dark:border-yellow-800/50">
                    <h3 className="text-lg font-bold font-heading text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <MessageSquareIcon className="w-5 h-5" /> Lesson Notes
                    </h3>
                    <label htmlFor="notes-textarea" className="sr-only">Lesson notes</label>
                    <textarea
                        id="notes-textarea"
                        value={lesson.notes || ''}
                        onChange={(e) => onUpdateLesson(lesson.id, { notes: e.target.value })}
                        placeholder="Write down your key takeaways or thoughts here..."
                        className="w-full min-h-[100px] p-3 rounded-xl bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none text-slate-800 dark:text-slate-200 text-sm"
                    />
                 </div>

                 {/* Difficulty Rating */}
                 <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                     <span className="font-bold text-slate-600 dark:text-slate-400 text-sm">How was this lesson?</span>
                     <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdateLesson(lesson.id, { difficultyRating: 'easy' })} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${lesson.difficultyRating === 'easy' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' : 'bg-white dark:bg-[#0B1121] border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                        >
                            Easy
                        </button>
                        <button 
                            onClick={() => onUpdateLesson(lesson.id, { difficultyRating: 'good' })} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${lesson.difficultyRating === 'good' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' : 'bg-white dark:bg-[#0B1121] border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                        >
                            Good
                        </button>
                        <button 
                            onClick={() => onUpdateLesson(lesson.id, { difficultyRating: 'hard' })} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${lesson.difficultyRating === 'hard' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' : 'bg-white dark:bg-[#0B1121] border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                        >
                            Hard
                        </button>
                     </div>
                 </div>

                 {/* Gamified Quiz Section */}
                 {hasQuiz ? (
                     <div className="pt-8">
                         <h2 className="text-2xl font-bold font-heading mb-6 text-center">Unlock Next Level</h2>
                         <QuizSection quiz={lesson.gamifiedQuiz!} onComplete={() => setQuizPassed(true)} />
                         {quizPassed && (
                             <div className="mt-8 flex justify-center animate-[fade-up_0.5s]">
                                <Button onClick={handleLessonComplete} className="w-full sm:w-auto px-12 py-4 text-lg shadow-xl shadow-teal-500/20">
                                    <CheckCircleIcon /> Mark Lesson Complete
                                </Button>
                             </div>
                         )}
                     </div>
                 ) : (
                     <div className="pt-8 flex justify-center">
                        <Button onClick={handleLessonComplete} className="w-full sm:w-auto px-12 py-4 text-lg shadow-xl shadow-teal-500/20">
                            <CheckCircleIcon /> Mark as Complete
                        </Button>
                     </div>
                 )}
            </div>

            {/* Skip Button */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-sm font-normal">
                    Skip & End Lesson (Return to Plan)
                </Button>
            </div>
        </div>
    );
};

const PlanView = ({ plan, onSelectLesson, onReset, onNextLevel, userName, user }: { plan: Plan; onSelectLesson: (l: Lesson) => void; onReset: () => void; onNextLevel: () => void; userName: string; user: User }) => {
    const allCompleted = plan.lessons.every(l => l.isCompleted);
    const nextLesson = plan.lessons.find(l => !l.isCompleted);
    const completedCount = plan.lessons.filter(l => l.isCompleted).length;
    const borderColors = [
        'border-red-400 dark:border-red-600',
        'border-orange-400 dark:border-orange-600',
        'border-amber-400 dark:border-amber-600',
        'border-green-400 dark:border-green-600',
        'border-cyan-400 dark:border-cyan-600',
        'border-blue-400 dark:border-blue-600',
        'border-indigo-400 dark:border-indigo-600',
        'border-purple-400 dark:border-purple-600'
    ];

    return (
        <div className="max-w-5xl mx-auto py-8 animate-[fade-up_0.5s]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-3xl font-bold font-heading text-slate-900 dark:text-white mb-1">{plan.title || 'My Personal Plan'}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-slate-500 mt-2">
                        <div className="flex items-center gap-1">
                            <TargetIcon className="w-4 h-4" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{plan.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                             <FlameIcon className="w-4 h-4 fill-current" />
                             <span>{user.streak} Day Streak</span>
                        </div>
                    </div>
                    <ProgressBar current={completedCount} total={plan.lessons.length} />
                </div>
                {/* Streak Visualization */}
                <div className="w-full md:w-auto mt-4 md:mt-0">
                    <StreakCalendar history={user.history || []} />
                </div>
            </div>

            {/* Daily Plan Summary - Shows the next actionable step */}
            {!allCompleted && nextLesson && (
                <div 
                    className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden group cursor-pointer focus-within:ring-2 focus-within:ring-teal-500" 
                    onClick={() => onSelectLesson(nextLesson)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') onSelectLesson(nextLesson); }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-teal-300 font-bold text-sm uppercase tracking-wider">
                            <SparklesIcon className="w-4 h-4" /> Today's Focus
                        </div>
                        <h3 className="text-2xl font-bold font-heading mb-2">{nextLesson.title}</h3>
                        <p className="text-slate-300 mb-6 max-w-2xl line-clamp-2">{nextLesson.description}</p>
                        <Button className="bg-white text-slate-900 hover:bg-slate-100 border-none shadow-none" tabIndex={-1}>
                            Start Today's Lesson <ChevronRightIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plan.lessons.map((lesson, idx) => {
                    const isLocked = idx > 0 && !plan.lessons[idx - 1].isCompleted;
                    const colorClass = borderColors[idx % borderColors.length];
                    
                    return (
                        <Card 
                            key={lesson.id} 
                            onClick={() => !isLocked && onSelectLesson(lesson)}
                            className={`relative overflow-hidden group h-full flex flex-col transition-all duration-300 border-2 
                            ${isLocked 
                                ? 'opacity-60 grayscale cursor-not-allowed border-slate-200 dark:border-slate-700' 
                                : `cursor-pointer hover:-translate-y-1 ${colorClass} animate-flash-border`
                            }`}
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6xl font-bold">{idx + 1}</span>
                            </div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${lesson.isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {plan.programType === '1-day' ? `Module ${idx + 1}` : `Day ${lesson.day}`}
                                </span>
                                {lesson.isCompleted ? <CheckCircleIcon className="text-green-500 w-6 h-6" /> : isLocked ? <LockIcon className="text-slate-400 w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                            </div>
                            
                            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-2 line-clamp-2 min-h-[3.5rem] relative z-10">
                                {lesson.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-grow relative z-10">
                                {lesson.description}
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-auto relative z-10">
                                <ClockIcon className="w-3 h-3" /> {lesson.duration} min
                                <span className="mx-1">•</span>
                                {lesson.type === 'quick_drill' ? <ZapIcon className="w-3 h-3 text-purple-500" /> : <BookOpenIcon className="w-3 h-3 text-blue-500" />}
                                <span className="capitalize">{lesson.type.replace('_', ' ')}</span>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {allCompleted && (
                 <div className="mt-12 p-8 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl text-center text-white shadow-2xl animate-[pop_0.5s]">
                     <div className="mb-6 inline-flex p-4 bg-white/20 rounded-full">
                         <AwardIcon className="w-12 h-12 text-white" />
                     </div>
                     <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Course Completed!</h2>
                     <p className="text-teal-100 text-lg mb-8 max-w-xl mx-auto">You've successfully finished this plan. Here is your certificate!</p>
                     
                     <Certificate plan={plan} userName={userName} />

                     <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                         <Button onClick={onNextLevel} className="bg-white text-teal-700 hover:bg-teal-50 shadow-none border-0">
                             <SparklesIcon /> Next Level (Advanced)
                         </Button>
                         <Button onClick={() => window.alert("Final Exam Feature Coming Soon! For now, try the Next Level.")} variant="secondary" className="bg-transparent border-white text-white hover:bg-white/10">
                             Take Full Exam
                         </Button>
                     </div>
                 </div>
            )}
        </div>
    );
};

// Fix: Made children optional to resolve type error when used in conditional rendering
const MainViewContainer = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => {
    const ref = useFocusOnMount();
    return (
        <div ref={ref} tabIndex={-1} className={`outline-none ${className}`}>
            {children}
        </div>
    );
};

export default function App() {
    // Intelligent storage: useStickyState persists to localStorage. 
    // This allows users to return and pick up where they left off without a backend.
    const [user, setUser] = useStickyState<User>({ ...DUMMY_USER, subscriptionTier: 'pro', streak: 0, history: [] }, 'skillbites-user', sanitizeUser);
    const [plan, setPlan] = useStickyState<Plan | null>(null, 'skillbites-plan', sanitizePlan);
    const [hasAcceptedLegal, setHasAcceptedLegal] = useStickyState<boolean>(false, 'skillbites-legal');
    
    // Updated view state to sticky to persist user's last location
    const [view, setView] = useStickyState<'landing' | 'new-goal' | 'plan' | 'lesson' | 'drill'>('landing', 'skillbites-view-state');
    const [activeLessonId, setActiveLessonId] = useStickyState<string | null>(null, 'skillbites-active-lesson');
    
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setTheme] = useStickyState<'light' | 'dark'>('light', 'skillbites-theme');
    const [showSearch, setShowSearch] = useState(false);
    const [showLegal, setShowLegal] = useState(false);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        // Show legal modal on first visit if not accepted
        if (!hasAcceptedLegal) {
            const timer = setTimeout(() => setShowLegal(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [hasAcceptedLegal]);

    useEffect(() => {
        // Update last active on mount to track return usage
        const now = new Date().toISOString();
        setUser(prev => ({ ...prev, lastActive: now }));

        // Check if persisted view is valid, otherwise fallback
        if ((view === 'lesson' || view === 'drill') && (!activeLessonId || !plan?.lessons.find(l => l.id === activeLessonId))) {
             setView(plan ? 'plan' : 'landing');
        }

        // Standard routing if not in a deep link state
        if (view === 'landing') {
            if (user.name && user.name !== 'Guest' && !plan) {
                setView('new-goal');
            } else if (plan) {
                setView('plan');
            }
        }
    }, []);

    const handleStart = (name: string) => {
        setUser({ ...user, name, subscriptionTier: 'pro' }); // Ensure pro tier
        setView('new-goal');
    };
    
    const handleHomeClick = () => {
        // Always navigate to landing page to allow creating a new plan as requested
        setView('landing');
        setActiveLessonId(null);
        window.scrollTo(0, 0);
    };

    const handleGeneratePlan = async (goalTitle: string, difficulty: Difficulty, type: ProgramType = '7-days', durationString: string = '15 mins/day', isNextLevel: boolean = false) => {
        setIsLoading(true);
        try {
            // Safety check for API Key (common deployment issue)
            const apiKey = process.env.API_KEY; 
            if (!apiKey) {
                throw new Error("API Key is missing. Please check your Vercel environment variables.");
            }

            const ai = new GoogleGenAI({ apiKey });
            
            const numLessons = type === '1-day' ? 5 : 7;
            
            // Calculate minutes per lesson based on user selection
            let minutesPerLesson = 15;
            if (type === '1-day') {
                 let totalMinutes = 60;
                 if (durationString.includes('hour')) {
                     const hours = parseInt(durationString); // '4 hours' -> 4
                     totalMinutes = hours * 60;
                 } else {
                     totalMinutes = parseInt(durationString) || 30;
                 }
                 minutesPerLesson = Math.floor(totalMinutes / numLessons);
            } else {
                 minutesPerLesson = parseInt(durationString) || 15;
            }

            // Scale content based on duration
            let paragraphCount = Math.max(3, Math.ceil(minutesPerLesson / 3));
            let quizCount = 3;
            let exampleCount = 2;

            // If longer than 25 minutes, ramp up content significantly, but cap it to prevent timeouts/errors
            if (minutesPerLesson > 25) {
                paragraphCount = Math.min(10, Math.ceil(minutesPerLesson / 3)); // Capped at 10 paragraphs max to be safe
                quizCount = Math.min(5, Math.ceil(minutesPerLesson / 6));     // Capped at 5 questions max
                exampleCount = 3;
            }

            const durationContext = type === '1-day' 
                ? `a single day intensive crash course with total duration ${durationString} (approx ${minutesPerLesson} minutes per module)` 
                : `a 7-day habit building program with ${durationString} per day`;
            
            const structureInstruction = type === '1-day' ? `Divide the day into ${numLessons} logical modules/steps.` : `Create a 7-day plan.`;
            
            const depthInstruction = minutesPerLesson >= 30 
                ? "EXTENSIVE DEPTH. This is a deep-dive masterclass. You MUST provide detailed explanations." 
                : "Concise and actionable.";

            // Enhanced Prompt for Gamification and Real-time examples
            const prompt = `
                Create a micro-learning plan for the goal: "${goalTitle}".
                Difficulty Level: ${difficulty}.
                Program Type: ${type} (${durationContext}).
                Target duration per lesson/module: ${minutesPerLesson} minutes.
                
                ${structureInstruction}
                The plan must have exactly ${numLessons} lessons/modules.
                
                CRITICAL INSTRUCTIONS:
                1. Return VALID JSON only.
                2. Do NOT use Markdown code blocks (no \`\`\`json).
                3. Do NOT include comments in the JSON (like // ...).
                4. For each lesson:
                   - The 'duration' field MUST be exactly ${minutesPerLesson}.
                   - 'content': ${depthInstruction} Include at least ${paragraphCount} paragraphs.
                   - 'realWorldExamples': An array of ${exampleCount} distinct strings.
                   - 'practicalTask': A complex, multi-step practical exercise or calculation task.
                   - 'gamifiedQuiz': An array of exactly ${quizCount} questions. Each question must have 'options' (array of strings) and 'correctAnswer' (string).

                JSON Schema:
                {
                    "title": "${goalTitle}",
                    "difficulty": "${difficulty}",
                    "programType": "${type}",
                    "lessons": [
                        {
                            "day": 1,
                            "title": "Lesson Title",
                            "description": "Description",
                            "duration": ${minutesPerLesson},
                            "type": "text_and_exercise",
                            "content": [
                                "Paragraph 1...", 
                                "Paragraph 2...",
                                ... (provide ${paragraphCount} paragraphs)
                            ],
                            "realWorldExamples": ["Example 1", "Example 2", ...],
                            "practicalTask": "Detailed task description...",
                            "gamifiedQuiz": [
                                { "question": "Q?", "options": ["A", "B", "C"], "correctAnswer": "A" },
                                ... (provide ${quizCount} questions)
                            ]
                        }
                    ]
                }
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            let text = response.text;
            if (!text) throw new Error("No response from AI model.");
            
            // Cleanup in case markdown is still returned despite instructions
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const data = JSON.parse(text);
            
            const newPlan = sanitizePlan({ ...data, goalId: `goal-${Date.now()}` });
            if (newPlan) {
                setPlan(newPlan);
                setView('plan');
            }
        } catch (error: any) {
            console.error("Error generating plan:", error);
            // Show specific error message to user to help debug deployment issues
            alert(`Error: ${error.message || "Something went wrong generating your plan. Please check your API Key configuration."}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLessonSelect = (lesson: Lesson) => {
        setActiveLessonId(lesson.id);
        if (lesson.type === 'quick_drill') {
            setView('drill');
        } else {
            setView('lesson');
        }
    };

    const handleUpdateLesson = (id: string, updates: Partial<Lesson>) => {
        if (!plan) return;
        const updatedLessons = plan.lessons.map(l => 
            l.id === id ? { ...l, ...updates } : l
        );
        setPlan({ ...plan, lessons: updatedLessons });
    };

    const handleCompleteLesson = () => {
        if (!plan || !activeLessonId) return;
        
        // Streak Logic implementation
        const today = new Date().toDateString();
        let newStreak = user.streak;
        let newLastLessonDate = user.lastLessonDate;

        if (user.lastLessonDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (user.lastLessonDate === yesterday.toDateString()) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }
            newLastLessonDate = today;
        }

        // Update History
        const newHistory = user.history ? [...user.history] : [];
        if (!newHistory.includes(today)) {
            newHistory.push(today);
        }

        const updatedLessons = plan.lessons.map(l => 
            l.id === activeLessonId ? { ...l, isCompleted: true } : l
        );
        
        setPlan({ ...plan, lessons: updatedLessons });
        setUser({ ...user, streak: newStreak, lastLessonDate: newLastLessonDate, history: newHistory });
        setView('plan');
        setActiveLessonId(null);
    };
    
    const handleReset = () => {
         if (window.confirm("Are you sure you want to reset your progress? This will delete your current plan and history.")) {
             localStorage.removeItem('skillbites-user');
             localStorage.removeItem('skillbites-plan');
             localStorage.removeItem('skillbites-view-state');
             localStorage.removeItem('skillbites-active-lesson');
             localStorage.removeItem('skillbites-legal');
             
             // Reset State immediately
             setUser({ ...DUMMY_USER, subscriptionTier: 'pro', streak: 0, history: [] });
             setPlan(null);
             setActiveLessonId(null);
             setView('landing');
             
             // Reload to clear memory state and ensuring fresh start
             setTimeout(() => window.location.reload(), 100);
         }
    };

    const handleNextLevel = () => {
        if (!plan) return;
        handleGeneratePlan(plan.title || "Next Level Goal", "Advanced", plan.programType || '7-days', '20 mins/day', true);
    };

    const handleAcceptLegal = () => {
        setHasAcceptedLegal(true);
        setShowLegal(false);
    };

    const activeLesson = plan?.lessons.find(l => l.id === activeLessonId);

    return (
        <div className="min-h-screen bg-white dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all" role="banner">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 rounded p-1" onClick={handleHomeClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleHomeClick(); }}>
                        <Logo className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                        <span className="font-bold font-heading text-xl tracking-tight hidden sm:block">SkillBites AI</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {plan && (
                            <>
                                <button onClick={() => setShowSearch(true)} aria-label="Search" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    <SearchIcon className="w-5 h-5" />
                                </button>
                                <button onClick={handleHomeClick} aria-label="My Plan" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500" title="My Plan">
                                    <HomeIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500">
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[calc(100vh-160px)]" role="main">
                {view === 'landing' && <MainViewContainer><LandingPage onStart={handleStart} /></MainViewContainer>}
                {view === 'new-goal' && <MainViewContainer><NewGoal onGeneratePlan={handleGeneratePlan} isLoading={isLoading} /></MainViewContainer>}
                {view === 'plan' && plan && <MainViewContainer><PlanView plan={plan} onSelectLesson={handleLessonSelect} onReset={handleReset} onNextLevel={handleNextLevel} userName={user.name} user={user} /></MainViewContainer>}
                {view === 'lesson' && activeLesson && <MainViewContainer><LessonView lesson={activeLesson} onComplete={handleCompleteLesson} onBack={() => { setView('plan'); setActiveLessonId(null); }} onUpdateLesson={handleUpdateLesson} user={user} /></MainViewContainer>}
                {view === 'drill' && activeLesson && <MainViewContainer><DrillMode lesson={activeLesson} onComplete={handleCompleteLesson} onBack={() => { setView('plan'); setActiveLessonId(null); }} /></MainViewContainer>}
            </main>

            {/* Overlays */}
            {isLoading && <LoadingOverlay messages={["Analyzing your goal...", "Structuring your custom program...", "Creating interactive quizzes...", "Generating real-world examples...", "Finalizing your plan..."]} />}
            {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} plan={plan} onNavigate={(v, id) => { setActiveLessonId(id); setView(v as any); setShowSearch(false); }} />}
            {showLegal && <LegalModal onClose={() => setShowLegal(false)} onAccept={handleAcceptLegal} />}
            
            <BuyCoffeeFloating />
            
            {/* Fixed Footer Navigation */}
            <Footer onNavigate={(v) => { 
                if (v === 'home') {
                    handleHomeClick();
                } else if (v === 'reset') {
                     handleReset();
                } else if (v === 'legal') {
                    setShowLegal(true);
                }
            }} />

            <Analytics />
        </div>
    );
}
