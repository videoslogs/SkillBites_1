

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type SubscriptionTier = 'free' | 'starter' | 'pro';

export type ProgramType = '1-day' | '7-days';

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  lastActive?: string;
  streak: number;
  lastLessonDate?: string;
  history?: string[]; // Array of date strings representing activity
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'FlameIcon' | 'AwardIcon' | 'CheckCircleIcon' | 'SparklesIcon' | 'RepeatIcon' | 'CalendarIcon' | 'MessageSquareIcon' | 'ZapIcon' | 'ShareIcon';
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  streak: number;
  badges: Badge[];
  xp: number;
  level: number;
  difficulty: Difficulty;
  completionDates?: string[];
}

export type LessonType = 'text_and_exercise' | 'voice_practice' | 'quick_drill';

export interface Lesson {
  id: string;
  day: number;
  title: string;
  description?: string;
  duration: number; // in minutes
  type: LessonType;
  content?: string[]; // Array of paragraphs for text_and_exercise
  exercise?: {
    title: string;
    description: string;
  };
  voicePrompt?: string; // For voice_practice lessons or drills
  selfCheck: {
    question: string;
    options: string[];
    correctAnswer: string;
  };
  
  // New Gamification & Real World Fields
  realWorldExamples?: string[]; 
  practicalTask?: string; // Calculation or Workout
  gamifiedQuiz?: QuizQuestion[]; // For "next level" progression

  isCompleted: boolean;
  notes?: string;
  currentStep?: number;
  difficultyRating?: 'easy' | 'good' | 'hard';
}

export interface Plan {
  id: string;
  goalId: string;
  title?: string; // Added title
  programType?: ProgramType; // Added program type
  lessons: Lesson[];
}

export interface FeedPost {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  goalTitle: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

export interface AppSettings {
    remindersEnabled: boolean;
    reminderTime: string;
    theme: 'light' | 'dark';
}