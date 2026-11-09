export type LanguageId = 'en' | 'es' | 'fr' | 'ja';

export type ChallengeType =
  | 'select'
  | 'translate'
  | 'assist'
  | 'match'
  | 'listenTap'
  | 'speak'
  | 'dialogue'
  | 'completeReverseTranslation';

export interface SelectOption {
  id: string;
  label: string;
  translation: string;
  emoji: string;
  audioText?: string;
}

export interface MatchPair {
  id: string;
  source: string;
  target: string;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  targetLanguageText?: string;
  characterAvatar?: string;
  characterName?: string;
  wordHints?: Record<string, string>;
  // For 'select'
  selectOptions?: SelectOption[];
  correctOptionId?: string;
  // For 'translate' & 'listenTap'
  wordBank?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  // For 'assist' / 'dialogue' / 'completeReverseTranslation'
  choices?: string[];
  dialogueContext?: {
    speakerA: string;
    avatarA: string;
    lineA: string;
    speakerB: string;
    avatarB: string;
  };
  blankPrefix?: string;
  blankSuffix?: string;
  explanation?: string;
  // For 'match'
  pairs?: MatchPair[];
}

export type PathNodeType = 'skill' | 'chest' | 'story' | 'unit_review' | 'unit_test';

export interface PathNode {
  id: string;
  unitNumber: number;
  levelNumber: number;
  type: PathNodeType;
  title: string;
  subtitle: string;
  icon: string;
  totalCrownSteps: number;
  offsetX: number; // Sinusoidal X offset in px (-70..+70)
  storyId?: string;
  chestRewardGems?: number;
  challenges: Challenge[];
}

export interface GuidebookTip {
  phrase: string;
  translation: string;
  pronunciation?: string;
}

export interface GuidebookGrammarNote {
  title: string;
  explanation: string;
  examples: { target: string; pt: string }[];
}

export interface PathUnit {
  unitNumber: number;
  sectionNumber: number;
  title: string;
  description: string;
  themeColor: string;
  themeLipColor: string;
  mascotId: string;
  mascotName: string;
  mascotEmoji: string;
  guidebookTips: GuidebookTip[];
  grammarNotes: GuidebookGrammarNote[];
  nodes: PathNode[];
}

export interface StoryLine {
  id: string;
  speaker: string;
  avatar: string;
  text: string;
  translation: string;
  question?: {
    prompt: string;
    options: string[];
    correctIndex: number;
  };
}

export interface StoryItem {
  id: string;
  setNumber: number;
  title: string;
  titlePt: string;
  icon: string;
  color: string;
  xpReward: number;
  lines: StoryLine[];
}

export interface PhoneticItem {
  id: string;
  symbol: string;
  romanization: string;
  exampleWord: string;
  exampleMeaning: string;
  category: 'vowel' | 'consonant' | 'hiragana' | 'katakana';
}

export interface CourseData {
  id: LanguageId;
  name: string;
  flag: string;
  learnersCount: string;
  speechLang: string;
  sections: {
    sectionNumber: number;
    cefrLevel: string;
    title: string;
    subtitle: string;
    mascotEmoji: string;
    color: string;
  }[];
  units: PathUnit[];
  stories: StoryItem[];
  phonetics: PhoneticItem[];
  vocabulary: {
    word: string;
    translation: string;
    category: string;
    strength: number;
  }[];
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarEmoji: string;
  authProvider: 'google' | 'email' | 'guest';
  joinedDate: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  icon: string;
  target: number;
  progress: number;
  rewardGems: number;
  claimed: boolean;
}

export interface ShopItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  priceGems: number;
  category: 'hearts' | 'powerups' | 'cosmetics';
}

export interface MistakeRecord {
  id: string;
  courseId: LanguageId;
  challenge: Challenge;
  timestamp: string;
}

export interface CourseProgress {
  completedSteps: Record<string, number>; // nodeId -> steps completed
  legendaryNodes: Record<string, boolean>; // nodeId -> is legendary
  claimedChests: Record<string, boolean>; // nodeId -> chest opened
  completedStories: Record<string, boolean>; // storyId -> completed
  masteredPhonetics: Record<string, boolean>; // phoneticId -> practiced
  xp: number;
}

export interface AppPersistedState {
  user: UserAccount | null;
  activeCourseId: LanguageId;
  streakDays: number;
  streakFreezeCount: number;
  doubleOrNothingActive: boolean;
  gems: number;
  hearts: number;
  maxHearts: number;
  isSuperDuolingo: boolean;
  xpBoostUntil: number | null;
  dailyGoalXp: number;
  todayXp: number;
  weeklyXp: number;
  soundEffectsEnabled: boolean;
  speakingExercisesEnabled: boolean;
  listeningExercisesEnabled: boolean;
  darkMode: boolean;
  courseProgress: Record<LanguageId, CourseProgress>;
  mistakes: MistakeRecord[];
  quests: DailyQuest[];
  ownedShopItems: string[];
}
