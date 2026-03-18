export type OnboardingData = {
  profile: {
    fullName: string;
    role: string;
    startDate: string;
    // Extended fields (optional)
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    department?: string;
    location?: string;
    timezone?: string;
    bio?: string;
    funFact?: string;
    emoji?: string;
    interests?: string[];
  };
  preferences: {
    team: string;
    hardware: string;
    // Extended fields (optional)
    feedbackStyle?: string;
    channels?: string[];
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    productivity?: string; // Morning | Afternoon | Evening
    motivations?: string[];
    learningPref?: string;
  };
  survey: {
    experienceLevel: string;
    needs: string;
    // Extended wellness survey fields (optional)
    excitement?: number; // 1-5
    concerns?: string[];
    coping?: string;
    support?: string[];
  };
  completed: boolean;
};

const KEY = 'onboarding_state_v1';

const defaultState: OnboardingData = {
  profile: {
    fullName: '',
    role: '',
    startDate: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    department: '',
    location: '',
    timezone: 'UTC-05:00',
    bio: '',
    funFact: '',
    emoji: '',
    interests: [],
  },
  preferences: {
    team: '',
    hardware: '',
    feedbackStyle: 'Direct and specific',
    channels: [],
    startTime: '09:00',
    endTime: '17:00',
    productivity: 'Morning',
    motivations: [],
    learningPref: '',
  },
  survey: {
    experienceLevel: '',
    needs: '',
    excitement: 3,
    concerns: [],
    coping: '',
    support: [],
  },
  completed: false,
};

export function loadOnboarding(): OnboardingData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...(JSON.parse(raw) as OnboardingData) };
  } catch {
    return { ...defaultState };
  }
}

export function saveOnboarding(data: Partial<OnboardingData>) {
  const current = loadOnboarding();
  const next = { ...current, ...data } as OnboardingData;
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resetOnboarding() {
  localStorage.removeItem(KEY);
}
