

import { User, FeedPost, Testimonial, Badge, Lesson } from './types';

export const DUMMY_USER: User = {
  id: 'user1',
  email: 'hello@skillbites.ai',
  name: 'Guest',
  subscriptionTier: 'pro',
  streak: 0,
  history: [],
};

export const DUMMY_FEED_POSTS: FeedPost[] = [
    { id: 'post1', userName: 'Sarah J.', userAvatar: 'https://picsum.photos/id/237/100/100', content: "Day 3 complete! The 'Mirror and Nod' exercise felt a bit weird at first, but it really helped me stay focused and engaged. Small steps!", goalTitle: 'Become confident in meetings', timestamp: '2h ago' },
    { id: 'post2', userName: 'Mike T.', userAvatar: 'https://picsum.photos/id/238/100/100', content: "Just started my journey to 'Learn Public Speaking'. The first lesson was eye-opening. Looking forward to Day 2.", goalTitle: 'Learn Public Speaking', timestamp: '8h ago' },
    { id: 'post3', userName: 'Chen L.', userAvatar: 'https://picsum.photos/id/239/100/100', content: "Finished my 7-day plan on 'Managing Stress'. Feeling so much calmer. The daily check-ins were the best part.", goalTitle: 'Managing Stress', timestamp: '1d ago' },
];

export const DUMMY_TESTIMONIALS: Testimonial[] = [
    { id: 't1', name: 'Emily R.', role: 'Product Manager', quote: 'SkillBites is a game-changer. The 10-minute lessons fit perfectly into my busy schedule and I saw a real improvement in my confidence within a week.', avatar: 'https://picsum.photos/id/1027/100/100' },
    { id: 't2', name: 'David L.', role: 'Software Engineer', quote: 'I used to hate presentations. After two weeks of SkillBites, I actually feel prepared and even a little excited to share my work. The exercises are practical and effective.', avatar: 'https://picsum.photos/id/1011/100/100' },
    { id: 't3', name: 'Maria G.', role: 'Freelance Designer', quote: 'The perfect tool for personal growth. It helped me set a goal and stick to it with actionable, bite-sized steps. Highly recommend!', avatar: 'https://picsum.photos/id/1012/100/100' },
];

export const ALL_DUMMY_BADGES: Badge[] = [
    { id: 'badge1', name: 'First Step', description: 'Complete your first lesson.', icon: 'CheckCircleIcon' },
    { id: 'badge2', name: 'On Fire', description: 'Maintain a 3-day streak.', icon: 'FlameIcon' },
    { id: 'badge3', name: 'Goal Getter', description: 'Complete your first 7-day plan.', icon: 'AwardIcon' },
    { id: 'badge4', name: 'Consistent', description: 'Maintain a 5-day streak.', icon: 'FlameIcon' },
    { id: 'badge5', name: 'Weekend Pro', description: 'Complete a lesson on a weekend.', icon: 'SparklesIcon' },
    { id: 'badge6', name: 'Drill Sergeant', description: 'Complete 3 quick drills.', icon: 'RepeatIcon' },
    { id: 'badge7', name: 'Perfect Week', description: 'Complete lessons for 7 days in a row.', icon: 'CalendarIcon' },
    { id: 'badge8', name: 'Reflective', description: 'Use the AI Reflection feedback feature.', icon: 'MessageSquareIcon' },
    { id: 'badge9', name: 'Quick Learner', description: 'Complete a drill in under 2 minutes.', icon: 'ZapIcon' },
];

export const DUMMY_DRILLS: Lesson[] = [
    { 
        id: 'drill1', 
        day: 0, 
        title: 'One-Minute Pitch', 
        duration: 2, 
        description: 'Practice delivering a concise and powerful pitch about yourself or a project.',
        type: 'quick_drill', 
        exercise: { 
            title: 'Practice Your Pitch', 
            description: 'Take one minute to describe what you do or a project you are passionate about. Record yourself and listen back for clarity and confidence.' 
        }, 
        selfCheck: { 
            question: 'Which of these is a key element of a one-minute pitch?',
            options: ['Talking as fast as possible', 'Focusing on a single key message', 'Listing every detail of the project'],
            correctAnswer: 'Focusing on a single key message'
        }, 
        isCompleted: false 
    },
    { 
        id: 'drill2', 
        day: 0, 
        title: 'Power Pose', 
        duration: 1, 
        description: 'A quick exercise to boost your confidence before a meeting or presentation.',
        type: 'quick_drill', 
        exercise: { 
            title: 'Strike a Pose', 
            description: 'Stand in a "power pose" (e.g., hands on hips, chest out) for 60 seconds. This has been shown to boost feelings of confidence.' 
        }, 
        selfCheck: { 
            question: 'How long should you hold a power pose to feel the benefits?',
            options: ['10 seconds', '2 minutes', '30 minutes'],
            correctAnswer: '2 minutes'
        }, 
        isCompleted: false 
    },
    { 
        id: 'drill3', 
        day: 0, 
        title: 'Tongue Twisters', 
        duration: 2, 
        description: 'A fun drill to warm up your voice and improve diction for clearer speech.',
        voicePrompt: 'Red lorry, yellow lorry. She sells seashells by the seashore.',
        type: 'quick_drill', 
        exercise: {
            title: 'Improve Diction',
            description: 'Repeat the following tongue twisters three times, focusing on enunciating each word clearly.'
        },
        selfCheck: { 
            question: 'What is the main goal of this tongue twister drill?',
            options: ['To memorize the phrase', 'To speak as loud as possible', 'To improve diction and clarity'],
            correctAnswer: 'To improve diction and clarity'
        }, 
        isCompleted: false 
    },
];

export const DUMMY_BREATHING_DRILL: Lesson = {
    id: 'drill-breathing',
    day: 0,
    title: 'Box Breathing',
    duration: 2,
    description: 'A simple, powerful technique to regain focus and calm your nervous system.',
    type: 'quick_drill',
    exercise: {
        title: '4-4-4-4 Pattern',
        description: 'Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s. Repeat.'
    },
    selfCheck: {
        question: 'How do you feel after this exercise?',
        options: ['Calmer', 'Same', 'More Anxious'],
        correctAnswer: 'Calmer'
    },
    isCompleted: false
};