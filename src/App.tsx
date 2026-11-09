import React, { useEffect, useMemo, useState } from 'react';
import type {
  AppPersistedState,
  Challenge,
  CourseProgress,
  LanguageId,
  PathNode,
  PathUnit,
  StoryItem,
  UserAccount,
} from './types/duolingo';
import {
  ACHIEVEMENTS,
  COURSES_DATA,
  LEAGUE_COMPETITORS,
  REA_EVIDENCE_SUMMARY,
  SHOP_ITEMS,
} from './data/coursesData';
import { AuthModal } from './components/AuthModal';
import { LessonSession } from './components/LessonSession';
import { StoryModal } from './components/StoryModal';
import { GuidebookModal } from './components/GuidebookModal';
import {
  playChestSound,
  playClickSound,
  speakText,
} from './utils/sound';

type NavTab =
  | 'learn'
  | 'sections'
  | 'alphabets'
  | 'stories'
  | 'practice-hub'
  | 'leaderboard'
  | 'quests'
  | 'shop'
  | 'profile'
  | 'settings'
  | 'rea-evidence';

const STORAGE_KEY = 'duolingo_clone_rea_state_v1';

function createEmptyCourseProgress(): CourseProgress {
  return {
    completedSteps: {},
    legendaryNodes: {},
    claimedChests: {},
    completedStories: {},
    masteredPhonetics: {},
    xp: 0,
  };
}

const DEFAULT_STATE: AppPersistedState = {
  user: null,
  activeCourseId: 'en',
  streakDays: 7,
  streakFreezeCount: 1,
  doubleOrNothingActive: false,
  gems: 520,
  hearts: 5,
  maxHearts: 5,
  isSuperDuolingo: false,
  xpBoostUntil: null,
  dailyGoalXp: 30,
  todayXp: 15,
  weeklyXp: 640,
  soundEffectsEnabled: true,
  speakingExercisesEnabled: true,
  listeningExercisesEnabled: true,
  darkMode: false,
  courseProgress: {
    en: {
      completedSteps: { 'en-u1-n1': 1 },
      legendaryNodes: {},
      claimedChests: {},
      completedStories: {},
      masteredPhonetics: {},
      xp: 640,
    },
    es: createEmptyCourseProgress(),
    fr: createEmptyCourseProgress(),
    ja: createEmptyCourseProgress(),
  },
  mistakes: [],
  quests: [
    {
      id: 'q-xp',
      title: 'Ganhe 30 XP hoje',
      icon: '⚡',
      target: 30,
      progress: 15,
      rewardGems: 25,
      claimed: false,
    },
    {
      id: 'q-lessons',
      title: 'Conclua 2 lições ou histórias',
      icon: '🎯',
      target: 2,
      progress: 1,
      rewardGems: 35,
      claimed: false,
    },
    {
      id: 'q-perfect',
      title: 'Faça 90% ou mais de precisão em uma lição',
      icon: '👑',
      target: 1,
      progress: 0,
      rewardGems: 40,
      claimed: false,
    },
  ],
  ownedShopItems: ['streak-freeze'],
};

export function App() {
  const [state, setState] = useState<AppPersistedState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore storage read errors
    }
    return DEFAULT_STATE;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('learn');
  const [selectedSectionNumber, setSelectedSectionNumber] = useState<number | null>(null);
  const [openPopoverNodeId, setOpenPopoverNodeId] = useState<string | null>(null);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [guidebookUnit, setGuidebookUnit] = useState<PathUnit | null>(null);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active interactive lesson session
  const [activeLesson, setActiveLesson] = useState<{
    nodeId?: string;
    title: string;
    challenges: Challenge[];
    isPracticeMode?: boolean;
    isLegendaryAttempt?: boolean;
    restoreHeartOnComplete?: boolean;
    clearMistakesOnComplete?: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage write errors
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  }, [state.darkMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const currentCourse = COURSES_DATA[state.activeCourseId];
  const currentProgress =
    state.courseProgress[state.activeCourseId] || createEmptyCourseProgress();

  const isXpBoostActive = Boolean(state.xpBoostUntil && state.xpBoostUntil > Date.now());
  const xpMultiplier = isXpBoostActive || state.isSuperDuolingo ? 2 : 1;

  // Determine which nodes are unlocked in the current course
  const nodeUnlockMap = useMemo(() => {
    const map: Record<string, 'locked' | 'active' | 'complete' | 'legendary'> = {};
    let foundFirstIncomplete = false;

    for (const unit of currentCourse.units) {
      for (const node of unit.nodes) {
        if (node.type === 'chest') {
          const claimed = Boolean(currentProgress.claimedChests[node.id]);
          map[node.id] = claimed ? 'complete' : !foundFirstIncomplete ? 'active' : 'locked';
          continue;
        }
        if (node.type === 'story') {
          const done = Boolean(
            node.storyId && currentProgress.completedStories[node.storyId]
          );
          map[node.id] = done ? 'complete' : !foundFirstIncomplete ? 'active' : 'locked';
          continue;
        }
        if (node.type === 'unit_test') {
          const done = (currentProgress.completedSteps[node.id] || 0) >= node.totalCrownSteps;
          map[node.id] = done ? 'complete' : 'active'; // Jump tests are always clickable!
          continue;
        }

        const steps = currentProgress.completedSteps[node.id] || 0;
        const isLegend = Boolean(currentProgress.legendaryNodes[node.id]);
        if (isLegend) {
          map[node.id] = 'legendary';
        } else if (steps >= node.totalCrownSteps) {
          map[node.id] = 'complete';
        } else if (!foundFirstIncomplete) {
          map[node.id] = 'active';
          foundFirstIncomplete = true;
        } else {
          map[node.id] = 'locked';
        }
      }
    }
    return map;
  }, [currentCourse, currentProgress]);

  const handleLogin = (account: UserAccount, initialCourse: LanguageId) => {
    setState((prev) => ({
      ...prev,
      user: account,
      activeCourseId: initialCourse,
    }));
    showToast(`Bem-vindo(a), ${account.name}! Trilha de ${COURSES_DATA[initialCourse].name} carregada.`);
  };

  const handleSwitchCourse = (langId: LanguageId) => {
    playClickSound(state.soundEffectsEnabled);
    setState((prev) => ({
      ...prev,
      activeCourseId: langId,
    }));
    setSelectedSectionNumber(null);
    setOpenPopoverNodeId(null);
    setCourseMenuOpen(false);
    showToast(`Curso alterado para ${COURSES_DATA[langId].flag} ${COURSES_DATA[langId].name}`);
  };

  const handleClaimChest = (node: PathNode) => {
    if (currentProgress.claimedChests[node.id]) {
      showToast('Este baú já foi aberto!');
      return;
    }
    const reward = node.chestRewardGems || 40;
    playChestSound(state.soundEffectsEnabled);
    setState((prev) => {
      const cp = prev.courseProgress[prev.activeCourseId] || createEmptyCourseProgress();
      return {
        ...prev,
        gems: prev.gems + reward,
        courseProgress: {
          ...prev.courseProgress,
          [prev.activeCourseId]: {
            ...cp,
            claimedChests: { ...cp.claimedChests, [node.id]: true },
          },
        },
      };
    });
    setOpenPopoverNodeId(null);
    showToast(`🎁 Baú aberto! Você ganhou +${reward} Gemas!`);
  };

  const handleStartNodeLesson = (node: PathNode, isLegendary = false) => {
    if (!state.isSuperDuolingo && state.hearts <= 0) {
      showToast('💔 Suas vidas acabaram! Pratique no Hub de Prática ou visite a Loja.');
      setActiveTab('practice-hub');
      return;
    }
    if (isLegendary && !state.isSuperDuolingo && state.gems < 20) {
      showToast('Você precisa de 20 Gemas (ou Super Duolingo) para tentar o nível Lendário.');
      return;
    }

    if (isLegendary && !state.isSuperDuolingo) {
      setState((prev) => ({ ...prev, gems: prev.gems - 20 }));
    }

    const fallbackChallenges =
      node.challenges.length > 0
        ? node.challenges
        : currentCourse.units[0].nodes[0].challenges;

    setOpenPopoverNodeId(null);
    setActiveLesson({
      nodeId: node.id,
      title: node.title,
      challenges: fallbackChallenges,
      isPracticeMode: false,
      isLegendaryAttempt: isLegendary,
    });
  };

  const handleCompleteLesson = (
    earnedXp: number,
    accuracyPct: number,
    perfectLesson: boolean
  ) => {
    if (!activeLesson) return;

    const {
      nodeId,
      isLegendaryAttempt,
      restoreHeartOnComplete,
      clearMistakesOnComplete,
    } = activeLesson;

    setState((prev) => {
      const cp = prev.courseProgress[prev.activeCourseId] || createEmptyCourseProgress();
      const updatedCompletedSteps = { ...cp.completedSteps };
      const updatedLegendary = { ...cp.legendaryNodes };

      if (nodeId) {
        updatedCompletedSteps[nodeId] = (updatedCompletedSteps[nodeId] || 0) + 1;
        if (isLegendaryAttempt) {
          updatedLegendary[nodeId] = true;
        }
      }

      // If this was a unit_test jump node, also unlock previous unit nodes
      for (const u of COURSES_DATA[prev.activeCourseId].units) {
        const jumpNode = u.nodes.find((n) => n.id === nodeId && n.type === 'unit_test');
        if (jumpNode) {
          for (const prevUnit of COURSES_DATA[prev.activeCourseId].units) {
            if (prevUnit.unitNumber < u.unitNumber) {
              for (const pn of prevUnit.nodes) {
                updatedCompletedSteps[pn.id] = pn.totalCrownSteps;
              }
            }
          }
        }
      }

      const updatedQuests = prev.quests.map((q) => {
        if (q.id === 'q-xp') {
          return { ...q, progress: Math.min(q.target, q.progress + earnedXp) };
        }
        if (q.id === 'q-lessons') {
          return { ...q, progress: Math.min(q.target, q.progress + 1) };
        }
        if (q.id === 'q-perfect' && (accuracyPct >= 90 || perfectLesson)) {
          return { ...q, progress: Math.min(q.target, q.progress + 1) };
        }
        return q;
      });

      return {
        ...prev,
        todayXp: prev.todayXp + earnedXp,
        weeklyXp: prev.weeklyXp + earnedXp,
        gems: prev.gems + (perfectLesson ? 10 : 5),
        hearts: restoreHeartOnComplete
          ? Math.min(prev.maxHearts, prev.hearts + 1)
          : prev.hearts,
        mistakes: clearMistakesOnComplete ? [] : prev.mistakes,
        quests: updatedQuests,
        courseProgress: {
          ...prev.courseProgress,
          [prev.activeCourseId]: {
            ...cp,
            completedSteps: updatedCompletedSteps,
            legendaryNodes: updatedLegendary,
            xp: cp.xp + earnedXp,
          },
        },
      };
    });

    setActiveLesson(null);
    showToast(
      `🎉 +${earnedXp} XP conquistados!${
        restoreHeartOnComplete ? ' ❤️ +1 Vida recuperada!' : ''
      }`
    );
  };

  const handleCompleteStory = (storyId: string, xpReward: number) => {
    const finalXp = xpReward * xpMultiplier;
    setState((prev) => {
      const cp = prev.courseProgress[prev.activeCourseId] || createEmptyCourseProgress();
      const updatedQuests = prev.quests.map((q) => {
        if (q.id === 'q-xp') return { ...q, progress: Math.min(q.target, q.progress + finalXp) };
        if (q.id === 'q-lessons') return { ...q, progress: Math.min(q.target, q.progress + 1) };
        return q;
      });
      return {
        ...prev,
        todayXp: prev.todayXp + finalXp,
        weeklyXp: prev.weeklyXp + finalXp,
        gems: prev.gems + 10,
        quests: updatedQuests,
        courseProgress: {
          ...prev.courseProgress,
          [prev.activeCourseId]: {
            ...cp,
            completedStories: { ...cp.completedStories, [storyId]: true },
            xp: cp.xp + finalXp,
          },
        },
      };
    });
    setActiveStory(null);
    showToast(`📖 História concluída! +${finalXp} XP e +10 Gemas!`);
  };

  const handleBuyShopItem = (itemId: string, price: number) => {
    if (state.gems < price) {
      showToast('Gemas insuficientes! Abra baús na trilha ou conclua missões diárias.');
      return;
    }
    playChestSound(state.soundEffectsEnabled);

    if (itemId === 'refill-hearts') {
      if (state.hearts >= state.maxHearts) {
        showToast('Suas vidas já estão cheias!');
        return;
      }
      setState((prev) => ({
        ...prev,
        gems: prev.gems - price,
        hearts: prev.maxHearts,
      }));
      showToast('❤️ Todas as suas 5 vidas foram recarregadas!');
      return;
    }

    if (itemId === 'streak-freeze') {
      if (state.streakFreezeCount >= 2) {
        showToast('Você já possui o máximo de 2 Bloqueios de Ofensiva equipados!');
        return;
      }
      setState((prev) => ({
        ...prev,
        gems: prev.gems - price,
        streakFreezeCount: prev.streakFreezeCount + 1,
      }));
      showToast('🧊 Bloqueio de Ofensiva equipado com sucesso!');
      return;
    }

    if (itemId === 'double-or-nothing') {
      if (state.doubleOrNothingActive) {
        showToast('Aposta Dobro ou Nada já está ativa!');
        return;
      }
      setState((prev) => ({
        ...prev,
        gems: prev.gems - price,
        doubleOrNothingActive: true,
      }));
      showToast('🔥 Aposta Dobro ou Nada ativada! Mantenha sua ofensiva de 7 dias.');
      return;
    }

    if (itemId === 'xp-boost-15m') {
      setState((prev) => ({
        ...prev,
        gems: prev.gems - price,
        xpBoostUntil: Date.now() + 15 * 60 * 1000,
      }));
      showToast('⚡ Poção de 2x XP ativada pelos próximos 15 minutos!');
      return;
    }

    setState((prev) => ({
      ...prev,
      gems: prev.gems - price,
      ownedShopItems: [...new Set([...prev.ownedShopItems, itemId])],
    }));
    showToast('🎩 Item adquirido e equipado no seu perfil!');
  };

  // If user is not logged in, render AuthModal (/login & /register)
  if (!state.user) {
    return (
      <AuthModal
        onLogin={handleLogin}
        soundEnabled={state.soundEffectsEnabled}
      />
    );
  }

  const visibleUnits = selectedSectionNumber
    ? currentCourse.units.filter((u) => u.sectionNumber === selectedSectionNumber)
    : currentCourse.units;

  // Dynamic leaderboard ranking with current user included
  const rankedLeaderboard = [
    ...LEAGUE_COMPETITORS,
    {
      id: 'current-user',
      name: `${state.user.name} (Você)`,
      avatar: state.user.avatarEmoji,
      xp: state.weeklyXp,
      country: '🇧🇷',
      badge: state.isSuperDuolingo ? '👑' : '🦉',
      isCurrentUser: true,
    },
  ].sort((a, b) => b.xp - a.xp);

  const userRank = rankedLeaderboard.findIndex((r) => r.id === 'current-user') + 1;

  return (
    <>
      {/* Active Fullscreen Lesson Overlay */}
      {activeLesson && (
        <LessonSession
          title={activeLesson.title}
          speechLang={currentCourse.speechLang}
          initialChallenges={activeLesson.challenges}
          hearts={state.hearts}
          isSuperDuolingo={state.isSuperDuolingo}
          soundEnabled={state.soundEffectsEnabled}
          isPracticeMode={activeLesson.isPracticeMode}
          xpMultiplier={xpMultiplier}
          onLoseHeart={() =>
            setState((prev) => ({ ...prev, hearts: Math.max(0, prev.hearts - 1) }))
          }
          onRecordMistake={(challenge) =>
            setState((prev) => ({
              ...prev,
              mistakes: [
                {
                  id: 'm_' + Date.now(),
                  courseId: prev.activeCourseId,
                  challenge,
                  timestamp: new Date().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                ...prev.mistakes.slice(0, 19),
              ],
            }))
          }
          onCompleteLesson={handleCompleteLesson}
          onClose={() => setActiveLesson(null)}
        />
      )}

      {/* Active Story Modal */}
      {activeStory && (
        <StoryModal
          story={activeStory}
          speechLang={currentCourse.speechLang}
          soundEnabled={state.soundEffectsEnabled}
          onCompleteStory={handleCompleteStory}
          onClose={() => setActiveStory(null)}
        />
      )}

      {/* Active Guidebook Modal */}
      {guidebookUnit && (
        <GuidebookModal
          unit={guidebookUnit}
          courseName={currentCourse.name}
          speechLang={currentCourse.speechLang}
          onClose={() => setGuidebookUnit(null)}
        />
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 95,
            background: 'var(--bg-surface)',
            border: '2px solid var(--duo-green)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            padding: '12px 18px',
            borderRadius: 16,
            fontWeight: 800,
            fontSize: '0.94rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3-Column Duolingo Application Shell */}
      <div className="app-shell">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="sidebar-nav">
          <div>
            <div
              className="brand-logo"
              onClick={() => {
                playClickSound(state.soundEffectsEnabled);
                setActiveTab('learn');
              }}
            >
              <span style={{ fontSize: '2rem' }}>🦉</span>
              <span className="brand-logo-text">duolingo</span>
            </div>

            <ul className="nav-list">
              <li>
                <button
                  id="nav-learn-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'learn' || activeTab === 'sections' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('learn');
                  }}
                >
                  <span className="nav-icon-badge">🏠</span>
                  <span className="nav-item-label">Aprender</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-alphabets-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'alphabets' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('alphabets');
                  }}
                >
                  <span className="nav-icon-badge">
                    {state.activeCourseId === 'ja' ? 'あ' : '🔤'}
                  </span>
                  <span className="nav-item-label">
                    {state.activeCourseId === 'ja' ? 'Caracteres' : 'Sons'}
                  </span>
                </button>
              </li>

              <li>
                <button
                  id="nav-stories-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'stories' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('stories');
                  }}
                >
                  <span className="nav-icon-badge">📖</span>
                  <span className="nav-item-label">Histórias</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-practice-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'practice-hub' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('practice-hub');
                  }}
                >
                  <span className="nav-icon-badge">🏋️</span>
                  <span className="nav-item-label">
                    Praticar {state.mistakes.length > 0 ? `(${state.mistakes.length})` : ''}
                  </span>
                </button>
              </li>

              <li>
                <button
                  id="nav-leaderboard-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('leaderboard');
                  }}
                >
                  <span className="nav-icon-badge">🛡️</span>
                  <span className="nav-item-label">Ligas</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-quests-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'quests' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('quests');
                  }}
                >
                  <span className="nav-icon-badge">🎯</span>
                  <span className="nav-item-label">Missões</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-shop-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'shop' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('shop');
                  }}
                >
                  <span className="nav-icon-badge">🏪</span>
                  <span className="nav-item-label">Loja</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-profile-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('profile');
                  }}
                >
                  <span className="nav-icon-badge">{state.user.avatarEmoji}</span>
                  <span className="nav-item-label">Perfil</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-settings-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('settings');
                  }}
                >
                  <span className="nav-icon-badge">⚙️</span>
                  <span className="nav-item-label">Mais</span>
                </button>
              </li>

              <li>
                <button
                  id="nav-rea-btn"
                  type="button"
                  className={`nav-item-btn ${activeTab === 'rea-evidence' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound(state.soundEffectsEnabled);
                    setActiveTab('rea-evidence');
                  }}
                >
                  <span className="nav-icon-badge">🔬</span>
                  <span className="nav-item-label">REA Inspector</span>
                </button>
              </li>

              <li>
                <a
                  id="nav-download-apk-link"
                  href="/Duolingo-Clone.apk"
                  download="Duolingo-Clone.apk"
                  className="nav-item-btn"
                  style={{
                    textDecoration: 'none',
                    color: 'var(--duo-green)',
                    borderColor: 'rgba(88, 204, 2, 0.35)',
                  }}
                >
                  <span className="nav-icon-badge">📱</span>
                  <span className="nav-item-label">Baixar APK</span>
                </a>
              </li>
            </ul>
          </div>
        </aside>

        {/* CENTER FEED COLUMN */}
        <main className="main-feed">
          {/* 1. LEARN PATH VIEW (/learn) */}
          {activeTab === 'learn' && (
            <div>
              {/* Section Top Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                  padding: '12px 16px',
                  borderRadius: 16,
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>{currentCourse.flag}</span>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      {selectedSectionNumber
                        ? `Seção ${selectedSectionNumber} Filtrada`
                        : 'Todas as Seções Ativas • /learn'}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.02rem' }}>
                      Curso de {currentCourse.name}
                    </div>
                  </div>
                </div>

                <button
                  id="open-sections-btn"
                  type="button"
                  className="duo-btn duo-btn-outline duo-btn-sm"
                  onClick={() => setActiveTab('sections')}
                >
                  🗺️ Ver Seções
                </button>
              </div>

              {/* Units & Sinusoidal Path Nodes */}
              {visibleUnits.map((unit) => (
                <section key={unit.unitNumber} className="unit-section">
                  {/* Unit Header Banner */}
                  <div
                    className="unit-banner"
                    style={{
                      backgroundColor: unit.themeColor,
                      boxShadow: `0 4px 0 ${unit.themeLipColor}`,
                    }}
                  >
                    <div>
                      <div className="unit-banner-meta">
                        Seção {unit.sectionNumber} • {unit.title}
                      </div>
                      <h2 className="unit-banner-title">{unit.title}</h2>
                      <p className="unit-banner-desc">{unit.description}</p>
                    </div>

                    <button
                      id={`guidebook-unit-${unit.unitNumber}-btn`}
                      type="button"
                      className="guidebook-btn"
                      onClick={() => {
                        playClickSound(state.soundEffectsEnabled);
                        setGuidebookUnit(unit);
                      }}
                    >
                      <span>📓</span> Guia
                    </button>
                  </div>

                  {/* Path Track */}
                  <div className="path-nodes-track">
                    {/* Decorative Unit Mascot beside the middle node */}
                    <div
                      className="unit-mascot-card"
                      style={{
                        top: '34%',
                        right: unit.unitNumber % 2 === 1 ? '10%' : 'auto',
                        left: unit.unitNumber % 2 === 0 ? '10%' : 'auto',
                      }}
                    >
                      <div className="unit-mascot-avatar">{unit.mascotEmoji}</div>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 900,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-surface)',
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: '2px solid var(--border-color)',
                        }}
                      >
                        {unit.mascotName}
                      </span>
                    </div>

                    {unit.nodes.map((node) => {
                      const status = nodeUnlockMap[node.id] || 'locked';
                      const completedSteps = currentProgress.completedSteps[node.id] || 0;
                      const isPopoverOpen = openPopoverNodeId === node.id;
                      const pct = Math.min(
                        100,
                        Math.round((completedSteps / Math.max(1, node.totalCrownSteps)) * 100)
                      );

                      const radius = 38;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset =
                        circumference - (pct / 100) * circumference;

                      return (
                        <div
                          key={node.id}
                          className="path-node-wrapper"
                          style={{ transform: `translateX(${node.offsetX}px)` }}
                        >
                          {status === 'active' && (
                            <div className="active-callout-badge">
                              {node.type === 'chest'
                                ? 'ABRIR BAÚ'
                                : node.type === 'unit_test'
                                ? 'PULAR AQUI'
                                : 'COMEÇAR'}
                            </div>
                          )}

                          {status === 'legendary' && (
                            <div
                              className="active-callout-badge"
                              style={{ color: '#d98a00', borderColor: '#ffc800' }}
                            >
                              👑 LENDÁRIO
                            </div>
                          )}

                          <div className="path-node-ring">
                            {/* Circular SVG Progress Ring */}
                            {node.type === 'skill' && status !== 'locked' && (
                              <svg
                                width="86"
                                height="86"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  transform: 'rotate(-90deg)',
                                  pointerEvents: 'none',
                                }}
                              >
                                <circle
                                  cx="43"
                                  cy="43"
                                  r={radius}
                                  fill="none"
                                  stroke="var(--border-color)"
                                  strokeWidth="6"
                                />
                                <circle
                                  cx="43"
                                  cy="43"
                                  r={radius}
                                  fill="none"
                                  stroke={
                                    status === 'legendary'
                                      ? '#ffc800'
                                      : unit.themeColor
                                  }
                                  strokeWidth="6"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={
                                    status === 'complete' || status === 'legendary'
                                      ? 0
                                      : strokeDashoffset
                                  }
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}

                            <button
                              id={`path-node-${node.id}`}
                              type="button"
                              className={`path-node-btn ${
                                status === 'locked'
                                  ? 'locked'
                                  : status === 'legendary'
                                  ? 'legendary'
                                  : ''
                              }`}
                              style={{
                                backgroundColor:
                                  status === 'locked'
                                    ? undefined
                                    : node.type === 'chest'
                                    ? '#ffc800'
                                    : unit.themeColor,
                                boxShadow:
                                  status === 'locked'
                                    ? undefined
                                    : node.type === 'chest'
                                    ? '0 6px 0 #d99b00'
                                    : `0 6px 0 ${unit.themeLipColor}`,
                                fontSize: '1.75rem',
                              }}
                              onClick={() => {
                                playClickSound(state.soundEffectsEnabled);
                                if (node.type === 'chest' && status !== 'locked') {
                                  handleClaimChest(node);
                                  return;
                                }
                                if (node.type === 'story' && node.storyId && status !== 'locked') {
                                  const foundStory = currentCourse.stories.find(
                                    (s) => s.id === node.storyId
                                  );
                                  if (foundStory) {
                                    setActiveStory(foundStory);
                                    return;
                                  }
                                }
                                setOpenPopoverNodeId(
                                  isPopoverOpen ? null : node.id
                                );
                              }}
                            >
                              {status === 'complete' && node.type === 'skill'
                                ? '✔️'
                                : status === 'legendary'
                                ? '👑'
                                : node.icon}
                            </button>
                          </div>

                          <div
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              color: 'var(--text-secondary)',
                              marginTop: 4,
                            }}
                          >
                            {node.title}
                          </div>

                          {/* Popover Callout Card */}
                          {isPopoverOpen && (
                            <div
                              className="node-popover"
                              style={{
                                backgroundColor:
                                  status === 'locked'
                                    ? '#52656d'
                                    : unit.themeColor,
                              }}
                            >
                              <div style={{ fontWeight: 900, fontSize: '1.08rem', marginBottom: 4 }}>
                                {node.title}
                              </div>
                              <div style={{ fontSize: '0.86rem', opacity: 0.92, marginBottom: 14, fontWeight: 700 }}>
                                {status === 'locked'
                                  ? 'Conclua todos os níveis acima para desbloquear este nível!'
                                  : node.type === 'unit_test'
                                  ? 'Passe neste teste rápido para pular diretamente para esta unidade!'
                                  : `Passo ${Math.min(
                                      completedSteps,
                                      node.totalCrownSteps
                                    )} de ${node.totalCrownSteps} concluído`}
                              </div>

                              {status === 'locked' ? (
                                <button
                                  type="button"
                                  className="duo-btn duo-btn-outline duo-btn-sm"
                                  style={{ width: '100%' }}
                                  onClick={() => setOpenPopoverNodeId(null)}
                                >
                                  🔒 Bloqueado
                                </button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <button
                                    id={`popover-start-${node.id}`}
                                    type="button"
                                    className="duo-btn duo-btn-outline"
                                    style={{
                                      width: '100%',
                                      color: unit.themeColor,
                                      borderColor: '#fff',
                                    }}
                                    onClick={() => handleStartNodeLesson(node, false)}
                                  >
                                    {status === 'complete' || status === 'legendary'
                                      ? 'Praticar (+10 XP)'
                                      : `Começar (+${15 * xpMultiplier} XP)`}
                                  </button>

                                  {status === 'complete' && node.type === 'skill' && (
                                    <button
                                      type="button"
                                      className="duo-btn duo-btn-gold duo-btn-sm"
                                      style={{ width: '100%' }}
                                      onClick={() => handleStartNodeLesson(node, true)}
                                    >
                                      👑 Desafio Lendário ({state.isSuperDuolingo ? 'GRÁTIS SUPER' : '20 💎'})
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* 2. SECTIONS EXPLORER VIEW (/sections) */}
          {activeTab === 'sections' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 900 }}>
                    Seções do Curso de {currentCourse.name} {currentCourse.flag}
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.92rem' }}>
                    Estrutura alinhada ao Quadro Europeu Comum de Referência (CEFR)
                  </p>
                </div>
                <button
                  type="button"
                  className="duo-btn duo-btn-outline duo-btn-sm"
                  onClick={() => {
                    setSelectedSectionNumber(null);
                    setActiveTab('learn');
                  }}
                >
                  ← Voltar à Trilha
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {currentCourse.sections.map((sec) => {
                  const secUnits = currentCourse.units.filter(
                    (u) => u.sectionNumber === sec.sectionNumber
                  );
                  return (
                    <div key={sec.sectionNumber} className="duo-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: 'var(--duo-blue-bg)',
                              color: 'var(--duo-blue)',
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontWeight: 900,
                              fontSize: '0.76rem',
                              marginBottom: 8,
                            }}
                          >
                            {sec.cefrLevel}
                          </span>
                          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: 4 }}>
                            {sec.title}
                          </h2>
                          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.92rem', marginBottom: 14 }}>
                            {sec.subtitle}
                          </p>
                          <button
                            type="button"
                            className="duo-btn duo-btn-green duo-btn-sm"
                            onClick={() => {
                              setSelectedSectionNumber(sec.sectionNumber);
                              setActiveTab('learn');
                            }}
                          >
                            Abrir Seção {sec.sectionNumber} ({secUnits.length || 1} unidades)
                          </button>
                        </div>
                        <div style={{ fontSize: '4rem' }}>{sec.mascotEmoji}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. PHONETICS / ALPHABETS VIEW (/alphabets/:lang/tips) */}
          {activeTab === 'alphabets' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 6 }}>
                  {state.activeCourseId === 'ja'
                    ? 'Vamos aprender Hiragana e Katakana!'
                    : `Vamos dominar os sons do ${currentCourse.name}!`}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 18 }}>
                  Treine seu ouvido e aprenda a pronunciar cada som ou caractere com perfeição.
                </p>
                <button
                  id="phonetics-practice-btn"
                  type="button"
                  className="duo-btn duo-btn-blue"
                  onClick={() => {
                    const pairs = currentCourse.phonetics.slice(0, 5).map((ph) => ({
                      id: ph.id,
                      source: `${ph.symbol} (${ph.romanization})`,
                      target: `${ph.exampleWord} — ${ph.exampleMeaning}`,
                    }));
                    setActiveLesson({
                      title: `Treino de Sons: ${currentCourse.name}`,
                      isPracticeMode: true,
                      challenges: [
                        {
                          id: 'ph-match-1',
                          type: 'match',
                          prompt: 'Combine o som/caractere com a palavra de exemplo:',
                          correctAnswer: 'matched',
                          pairs,
                        },
                      ],
                    });
                  }}
                >
                  🎧 Praticar Sons (+15 XP)
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}
              >
                {currentCourse.phonetics.map((ph) => (
                  <button
                    key={ph.id}
                    type="button"
                    className="choice-card"
                    style={{ padding: '16px 12px' }}
                    onClick={() => speakText(ph.exampleWord, currentCourse.speechLang, false)}
                  >
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--duo-blue)' }}>
                      {ph.symbol}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                      [{ph.romanization}]
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--duo-green)', borderRadius: 999 }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      🔊 {ph.exampleWord}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      ({ph.exampleMeaning})
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. STORIES VIEW (/stories) */}
          {activeTab === 'stories' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 6 }}>
                  📖 Duolingo Stories ({currentCourse.name})
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Melhore sua leitura e compreensão auditiva com histórias curtas e divertidas.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 16,
                }}
              >
                {currentCourse.stories.map((st) => {
                  const completed = Boolean(currentProgress.completedStories[st.id]);
                  return (
                    <div
                      key={st.id}
                      className="choice-card"
                      style={{
                        borderColor: completed ? 'var(--duo-gold)' : undefined,
                      }}
                      onClick={() => {
                        playClickSound(state.soundEffectsEnabled);
                        setActiveStory(st);
                      }}
                    >
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 20,
                          background: st.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2.4rem',
                          boxShadow: '0 4px 0 rgba(0,0,0,0.18)',
                        }}
                      >
                        {st.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{st.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {st.titlePt}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          color: completed ? 'var(--duo-gold-lip)' : 'var(--duo-green)',
                        }}
                      >
                        {completed ? '✔️ Concluída (Repetir)' : `⚡ +${st.xpReward} XP`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. PRACTICE HUB VIEW (/practice-hub & /words) */}
          {activeTab === 'practice-hub' && (
            <div>
              <h1 style={{ fontSize: '1.7rem', fontWeight: 900, marginBottom: 6 }}>
                🏋️ Hub de Prática de {currentCourse.name}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 22 }}>
                Fortaleça seus pontos fracos, recupere vidas grátis e revise seu vocabulário.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
                {/* Mistake Review Card */}
                <div className="duo-card" style={{ borderColor: state.mistakes.length > 0 ? 'var(--duo-orange)' : undefined }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🎯</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: 4 }}>
                    Revisão de Erros ({state.mistakes.length})
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 14 }}>
                    {state.mistakes.length > 0
                      ? `Você tem ${state.mistakes.length} exercício(s) pendente(s) na sua caixa de erros.`
                      : 'Parabéns! Sua caixa de erros está limpa. Pratique uma revisão geral!'}
                  </p>
                  <button
                    id="practice-mistakes-btn"
                    type="button"
                    className="duo-btn duo-btn-green duo-btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => {
                      const items =
                        state.mistakes.length > 0
                          ? state.mistakes.map((m) => m.challenge)
                          : currentCourse.units[0].nodes[0].challenges.slice(0, 3);
                      setActiveLesson({
                        title: 'Revisão Personalizada de Erros',
                        challenges: items,
                        isPracticeMode: true,
                        clearMistakesOnComplete: true,
                      });
                    }}
                  >
                    Treinar Erros (+15 XP)
                  </button>
                </div>

                {/* Recover Heart Practice Card */}
                <div className="duo-card">
                  <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>❤️</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: 4 }}>
                    Praticar por +1 Vida ({state.hearts}/{state.maxHearts})
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 14 }}>
                    Conclua uma sessão rápida de revisão sem risco para recuperar 1 vida gratuitamente.
                  </p>
                  <button
                    id="practice-restore-heart-btn"
                    type="button"
                    className="duo-btn duo-btn-blue duo-btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setActiveLesson({
                        title: 'Prática para Recuperar Vida',
                        challenges: currentCourse.units[0].nodes[0].challenges.slice(0, 3),
                        isPracticeMode: true,
                        restoreHeartOnComplete: true,
                      });
                    }}
                  >
                    Recuperar +1 Vida ❤️
                  </button>
                </div>
              </div>

              {/* Learned Words Inventory (/words) */}
              <div className="duo-card">
                <div className="duo-card-header">
                  <h2 className="duo-card-title">
                    📚 Vocabulário Dominado ({currentCourse.vocabulary.length} palavras)
                  </h2>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--duo-green)' }}>
                    Clique para ouvir 🔊
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentCourse.vocabulary.map((item) => (
                    <div
                      key={item.word}
                      onClick={() => speakText(item.word, currentCourse.speechLang, false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '2px solid var(--border-color)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1rem' }}>🔊 {item.word}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {item.translation} • <span style={{ color: 'var(--duo-blue)' }}>{item.category}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            color: 'var(--duo-green)',
                            background: 'var(--duo-green-bg)',
                            padding: '4px 10px',
                            borderRadius: 999,
                          }}
                        >
                          Força {item.strength}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. LEADERBOARD / LEAGUES VIEW (/leaderboard) */}
          {activeTab === 'leaderboard' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: '3.6rem', marginBottom: 6 }}>💎🛡️</div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 4 }}>
                  Divisão Diamante • Ranking Semanal
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Os 5 primeiros colocados avançam para o Torneio Diamante! Você está em{' '}
                  <strong style={{ color: 'var(--duo-green)' }}>#{userRank}º lugar</strong>.
                </p>
              </div>

              <div className="duo-card" style={{ padding: 0, overflow: 'hidden' }}>
                {rankedLeaderboard.map((comp, index) => {
                  const rank = index + 1;
                  const isMe = 'isCurrentUser' in comp && comp.isCurrentUser;
                  return (
                    <React.Fragment key={comp.id}>
                      {rank === 6 && (
                        <div
                          style={{
                            background: 'var(--duo-green-bg)',
                            color: 'var(--duo-green-lip)',
                            textAlign: 'center',
                            padding: '8px',
                            fontWeight: 900,
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          ▲ Zona de Promoção (Top 5) ▲
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 20px',
                          borderBottom: '1px solid var(--border-color)',
                          background: isMe ? 'var(--duo-blue-bg)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span
                            style={{
                              width: 28,
                              fontWeight: 900,
                              fontSize: '1rem',
                              color:
                                rank === 1
                                  ? '#ffc800'
                                  : rank === 2
                                  ? '#99a8b2'
                                  : rank === 3
                                  ? '#d98a3c'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </span>

                          <span style={{ fontSize: '1.8rem' }}>{comp.avatar}</span>

                          <div>
                            <div style={{ fontWeight: 900, fontSize: '0.98rem' }}>
                              {comp.name} <span>{comp.country}</span> <span>{comp.badge}</span>
                            </div>
                            {isMe && (
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--duo-blue)' }}>
                                Faça mais uma lição para subir no ranking!
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                          {comp.xp} XP
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. DAILY QUESTS VIEW (/quests) */}
          {activeTab === 'quests' && (
            <div>
              {/* Monthly Challenge Banner */}
              <div
                className="unit-banner"
                style={{
                  background: 'linear-gradient(135deg, #ce82ff 0%, #8549ba 100%)',
                  marginBottom: 24,
                }}
              >
                <div>
                  <div className="unit-banner-meta">Desafio de Novembro • Medalha Exclusiva</div>
                  <h2 className="unit-banner-title">Noite Estrelada do Duo</h2>
                  <p className="unit-banner-desc">
                    Conclua missões diárias para desbloquear o emblema de colecionador deste mês!
                  </p>
                </div>
                <span style={{ fontSize: '3.4rem' }}>🏅</span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: 14 }}>
                🎯 Missões Diárias
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {state.quests.map((q) => {
                  const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                  const completed = q.progress >= q.target;
                  return (
                    <div key={q.id} className="duo-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: '2.4rem' }}>{q.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontWeight: 900, fontSize: '1.02rem' }}>{q.title}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                              {q.progress} / {q.target}
                            </span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {completed && !q.claimed ? (
                          <button
                            type="button"
                            className="duo-btn duo-btn-gold duo-btn-sm"
                            onClick={() => {
                              playChestSound(state.soundEffectsEnabled);
                              setState((prev) => ({
                                ...prev,
                                gems: prev.gems + q.rewardGems,
                                quests: prev.quests.map((item) =>
                                  item.id === q.id ? { ...item, claimed: true } : item
                                ),
                              }));
                              showToast(`💎 +${q.rewardGems} Gemas resgatadas da missão!`);
                            }}
                          >
                            Resgatar +{q.rewardGems} 💎
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              color: q.claimed ? 'var(--duo-green)' : 'var(--duo-blue)',
                            }}
                          >
                            {q.claimed ? '✔️ Resgatado' : `+${q.rewardGems} 💎`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. SHOP VIEW (/shop) */}
          {activeTab === 'shop' && (
            <div>
              {/* Super Duolingo Banner */}
              <div
                className="unit-banner"
                style={{
                  background: 'linear-gradient(135deg, #1cb0f6 0%, #6f42c1 50%, #ce82ff 100%)',
                  marginBottom: 24,
                }}
              >
                <div>
                  <div className="unit-banner-meta">SUPER DUOLINGO • SEM LIMITES</div>
                  <h2 className="unit-banner-title">
                    {state.isSuperDuolingo
                      ? '👑 Seu Super Duolingo está ATIVO!'
                      : 'Vidas Ilimitadas, 2x XP e Níveis Lendários Grátis'}
                  </h2>
                  <p className="unit-banner-desc">
                    {state.isSuperDuolingo
                      ? 'Aproveite vidas infinitas (♾️) e bônus de XP em todas as lições.'
                      : 'Ative gratuitamente o modo Super Duolingo para testar todos os recursos premium.'}
                  </p>
                </div>

                <button
                  id="toggle-super-duo-btn"
                  type="button"
                  className="duo-btn duo-btn-gold"
                  onClick={() => {
                    playChestSound(state.soundEffectsEnabled);
                    setState((prev) => ({
                      ...prev,
                      isSuperDuolingo: !prev.isSuperDuolingo,
                      hearts: prev.maxHearts,
                    }));
                    showToast(
                      !state.isSuperDuolingo
                        ? '👑 Super Duolingo ativado! Vidas ilimitadas (♾️) liberadas!'
                        : 'Super Duolingo desativado.'
                    );
                  }}
                >
                  {state.isSuperDuolingo ? 'Desativar Super' : 'Ativar Super Grátis'}
                </button>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: 14 }}>
                🏪 Loja de Poderes e Vidas ({state.gems} 💎 disponíveis)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {SHOP_ITEMS.map((item) => {
                  const isOwnedCosmetic =
                    item.category === 'cosmetics' && state.ownedShopItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="duo-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: '2.5rem' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{item.title}</div>
                          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {item.description}
                          </div>
                        </div>
                      </div>

                      <button
                        id={`shop-buy-${item.id}`}
                        type="button"
                        disabled={isOwnedCosmetic}
                        className="duo-btn duo-btn-outline duo-btn-sm"
                        style={{ color: 'var(--duo-blue)' }}
                        onClick={() => handleBuyShopItem(item.id, item.priceGems)}
                      >
                        {isOwnedCosmetic ? '✔️ Equipado' : `💎 ${item.priceGems}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. PROFILE VIEW (/profile) */}
          {activeTab === 'profile' && (
            <div>
              {/* Profile Header Card */}
              <div className="duo-card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: '50%',
                        background: 'var(--duo-blue-bg)',
                        border: '3px solid var(--duo-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3.2rem',
                      }}
                    >
                      {state.user.avatarEmoji}
                    </div>
                    <div>
                      <h1 style={{ fontSize: '1.6rem', fontWeight: 900 }}>{state.user.name}</h1>
                      <div style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.92rem' }}>
                        @{state.user.username} • {state.user.email}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            background: 'var(--duo-green-bg)',
                            color: 'var(--duo-green-lip)',
                            padding: '3px 10px',
                            borderRadius: 999,
                          }}
                        >
                          {state.user.authProvider === 'google'
                            ? '🌐 Conta Google Conectada'
                            : '✉️ Conta Duolingo'}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Por aqui desde {state.user.joinedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="duo-btn duo-btn-outline duo-btn-sm"
                    onClick={() => setActiveTab('settings')}
                  >
                    ✏️ Editar Perfil
                  </button>
                </div>
              </div>

              {/* Statistics 2x2 Grid */}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: 12 }}>
                📊 Estatísticas
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div className="duo-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.9rem' }}>🔥</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{state.streakDays}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      Dias de ofensiva
                    </div>
                  </div>
                </div>

                <div className="duo-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.9rem' }}>⚡</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{state.weeklyXp}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      Total de XP
                    </div>
                  </div>
                </div>

                <div className="duo-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.9rem' }}>💎</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>Diamante (#{userRank})</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      Divisão atual
                    </div>
                  </div>
                </div>

                <div className="duo-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.9rem' }}>{currentCourse.flag}</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{currentCourse.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      Idioma principal
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements List */}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: 12 }}>
                🏅 Conquistas
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ACHIEVEMENTS.map((ach) => {
                  const pct = Math.min(100, Math.round((ach.progress / ach.target) * 100));
                  return (
                    <div key={ach.id} className="duo-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 16,
                          background: ach.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          flexShrink: 0,
                        }}
                      >
                        {ach.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 900 }}>{ach.title}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                            Nível {ach.level}/{ach.maxLevel}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
                          {ach.description}
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10. SETTINGS VIEW (/settings) */}
          {activeTab === 'settings' && (
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, marginBottom: 18 }}>
                ⚙️ Configurações da Conta e Preferências
              </h1>

              <div className="duo-card" style={{ marginBottom: 18 }}>
                <h2 className="duo-card-title" style={{ marginBottom: 14 }}>
                  Experiência de Aprendizado
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, cursor: 'pointer' }}>
                    <span>🔊 Efeitos sonoros nas lições</span>
                    <input
                      type="checkbox"
                      checked={state.soundEffectsEnabled}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, soundEffectsEnabled: e.target.checked }))
                      }
                      style={{ width: 20, height: 20 }}
                    />
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, cursor: 'pointer' }}>
                    <span>🌙 Tema Escuro (Dark Mode)</span>
                    <input
                      type="checkbox"
                      checked={state.darkMode}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, darkMode: e.target.checked }))
                      }
                      style={{ width: 20, height: 20 }}
                    />
                  </label>

                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>
                      🔥 Meta Diária de XP ({state.dailyGoalXp} XP/dia)
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[10, 20, 30, 50].map((goal) => (
                        <button
                          key={goal}
                          type="button"
                          className={`word-chip ${state.dailyGoalXp === goal ? 'selected' : ''}`}
                          onClick={() => setState((prev) => ({ ...prev, dailyGoalXp: goal }))}
                        >
                          {goal} XP
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="duo-card">
                <h2 className="duo-card-title" style={{ marginBottom: 14 }}>
                  Sessão e Conta ({state.user.email})
                </h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    id="logout-btn"
                    type="button"
                    className="duo-btn duo-btn-red duo-btn-sm"
                    onClick={() => {
                      setState((prev) => ({ ...prev, user: null }));
                    }}
                  >
                    🚪 Sair / Trocar Conta (Google ou E-mail)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 11. REA REVERSE ENGINEERING INSPECTOR VIEW (/rea-evidence) */}
          {activeTab === 'rea-evidence' && (
            <div>
              <div
                className="unit-banner"
                style={{
                  background: 'linear-gradient(135deg, #00cd9c 0%, #1cb0f6 100%)',
                  marginBottom: 22,
                }}
              >
                <div>
                  <div className="unit-banner-meta">
                    RELATÓRIO DE ENGENHARIA REVERSA • REA v6.8.0
                  </div>
                  <h1 className="unit-banner-title">
                    Evidências extraídas de https://www.duolingo.com/learn
                  </h1>
                  <p className="unit-banner-desc">
                    Análise estática de bundles Webpack/React e inventário de rotas/endpoints com Proveniência SHA-256.
                  </p>
                </div>
                <span style={{ fontSize: '3rem' }}>🔬</span>
              </div>

              <div className="duo-card" style={{ marginBottom: 18 }}>
                <h2 className="duo-card-title" style={{ marginBottom: 10 }}>
                  Identificadores de Evidência REA
                </h2>
                <div style={{ fontSize: '0.84rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 6, wordBreak: 'break-all' }}>
                  <div>
                    <strong>Parent Evidence ID:</strong> {REA_EVIDENCE_SUMMARY.evidenceId}
                  </div>
                  <div>
                    <strong>Summary View ID:</strong> {REA_EVIDENCE_SUMMARY.summaryViewEvidenceId}
                  </div>
                  <div>
                    <strong>Route Inventory ID:</strong> {REA_EVIDENCE_SUMMARY.routeInventoryId}
                  </div>
                  <div>
                    <strong>Artifact SHA-256:</strong> {REA_EVIDENCE_SUMMARY.artifactRootSha256}
                  </div>
                  <div>
                    <strong>Versão do Duolingo Web:</strong> {REA_EVIDENCE_SUMMARY.duolingoWebVersion}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div className="duo-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--duo-blue)' }}>
                    {REA_EVIDENCE_SUMMARY.statistics.visitedAstNodes.toLocaleString('pt-BR')}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    Nós AST Visitados
                  </div>
                </div>
                <div className="duo-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--duo-green)' }}>
                    {REA_EVIDENCE_SUMMARY.statistics.modulesReconstructed}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    Módulos JS
                  </div>
                </div>
                <div className="duo-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--duo-purple)' }}>
                    {REA_EVIDENCE_SUMMARY.statistics.uniqueRoutesRecovered}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    Rotas Recuperadas
                  </div>
                </div>
                <div className="duo-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--duo-orange)' }}>
                    {REA_EVIDENCE_SUMMARY.statistics.endpointsDiscovered}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    Endpoints no Grafo
                  </div>
                </div>
              </div>

              <div className="duo-card" style={{ marginBottom: 18 }}>
                <h2 className="duo-card-title" style={{ marginBottom: 10 }}>
                  Bundles Webpack Analisados pelo REA
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {REA_EVIDENCE_SUMMARY.chunksAnalyzed.map((ch) => (
                    <div
                      key={ch.name}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <code style={{ fontWeight: 900, color: 'var(--duo-blue)' }}>{ch.name}</code>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {ch.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="duo-card">
                <h2 className="duo-card-title" style={{ marginBottom: 10 }}>
                  Amostra de Rotas e Tipos de Desafio Extraídos
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {REA_EVIDENCE_SUMMARY.recoveredRoutesSample.map((rt) => (
                    <span key={rt} className="word-chip" style={{ fontSize: '0.78rem', padding: '6px 10px' }}>
                      {rt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT STICKY WIDGETS RAIL */}
        <aside className="right-rail">
          {/* Top Stats Strip: Course Flag, Streak, Gems, Hearts */}
          <div className="top-stats-bar">
            <div style={{ position: 'relative' }}>
              <button
                id="top-course-switcher-btn"
                type="button"
                className="stat-pill"
                onClick={() => setCourseMenuOpen((v) => !v)}
                title="Trocar de idioma"
              >
                <span style={{ fontSize: '1.45rem' }}>{currentCourse.flag}</span>
                <span>▾</span>
              </button>

              {courseMenuOpen && (
                <div
                  className="duo-card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: 220,
                    padding: 10,
                    zIndex: 50,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
                    Meus Cursos
                  </div>
                  {(Object.keys(COURSES_DATA) as LanguageId[]).map((langId) => {
                    const c = COURSES_DATA[langId];
                    return (
                      <button
                        key={langId}
                        type="button"
                        onClick={() => handleSwitchCourse(langId)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px',
                          borderRadius: 10,
                          border: 'none',
                          background:
                            state.activeCourseId === langId
                              ? 'var(--duo-blue-bg)'
                              : 'transparent',
                          color:
                            state.activeCourseId === langId
                              ? 'var(--duo-blue)'
                              : 'var(--text-primary)',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className="stat-pill"
              style={{ color: 'var(--duo-orange)' }}
              onClick={() => showToast(`🔥 Você está em uma ofensiva de ${state.streakDays} dias seguidos!`)}
            >
              <span>🔥</span>
              <span>{state.streakDays}</span>
            </button>

            <button
              type="button"
              className="stat-pill"
              style={{ color: 'var(--duo-blue)' }}
              onClick={() => setActiveTab('shop')}
            >
              <span>💎</span>
              <span>{state.gems}</span>
            </button>

            <button
              type="button"
              className="stat-pill"
              style={{ color: 'var(--duo-red)' }}
              onClick={() => setActiveTab('practice-hub')}
            >
              <span>{state.isSuperDuolingo ? '♾️' : '❤️'}</span>
              <span>{state.isSuperDuolingo ? 'SUPER' : state.hearts}</span>
            </button>
          </div>

          {/* Super Duolingo Promo / Status Card */}
          <div className="duo-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: '2.1rem' }}>🦉👑</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem' }}>
                  {state.isSuperDuolingo ? 'Super Duolingo Ativo' : 'Experimente o Super Duolingo'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  {state.isSuperDuolingo
                    ? 'Vidas ilimitadas (♾️) e 2x XP habilitados!'
                    : 'Sem anúncios, práticas personalizadas e sem limites de vidas!'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="duo-btn duo-btn-purple duo-btn-sm"
              style={{ width: '100%' }}
              onClick={() => setActiveTab('shop')}
            >
              {state.isSuperDuolingo ? 'Gerenciar na Loja' : 'Testar Grátis na Loja'}
            </button>
          </div>

          {/* League Ranking Mini-Widget */}
          <div className="duo-card">
            <div className="duo-card-header">
              <span className="duo-card-title">Divisão Diamante</span>
              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--duo-blue)',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Ver Liga
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: '2.3rem' }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>
                  Você está em <strong>#{userRank}º lugar</strong> ({state.weeklyXp} XP)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Top 5 avançam para o Torneio Diamante!
                </div>
              </div>
            </div>
          </div>

          {/* Daily Quests Mini-Widget */}
          <div className="duo-card">
            <div className="duo-card-header">
              <span className="duo-card-title">Missões do Dia</span>
              <button
                type="button"
                onClick={() => setActiveTab('quests')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--duo-blue)',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Ver Todas
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {state.quests.map((q) => {
                const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.45rem' }}>{q.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: 4 }}>
                        <span>{q.title}</span>
                        <span>
                          {q.progress}/{q.target}
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: 10 }}>
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily XP Goal Progress Card */}
          <div className="duo-card">
            <div className="duo-card-header">
              <span className="duo-card-title">Meta Diária de XP</span>
              <span style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--duo-green)' }}>
                {state.todayXp} / {state.dailyGoalXp} XP
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, Math.round((state.todayXp / state.dailyGoalXp) * 100))}%`,
                }}
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default App;
