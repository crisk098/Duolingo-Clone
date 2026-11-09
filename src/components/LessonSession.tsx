import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Challenge } from '../types/duolingo';
import {
  playClickSound,
  playCorrectSound,
  playFanfareSound,
  playWrongSound,
  speakText,
} from '../utils/sound';

interface LessonSessionProps {
  title: string;
  speechLang: string;
  initialChallenges: Challenge[];
  hearts: number;
  isSuperDuolingo: boolean;
  soundEnabled: boolean;
  isPracticeMode?: boolean;
  xpMultiplier?: number;
  onLoseHeart: () => void;
  onRecordMistake: (challenge: Challenge) => void;
  onCompleteLesson: (earnedXp: number, accuracyPct: number, perfectLesson: boolean) => void;
  onClose: () => void;
}

function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:'"¡¿()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const LessonSession: React.FC<LessonSessionProps> = ({
  title,
  speechLang,
  initialChallenges,
  hearts,
  isSuperDuolingo,
  soundEnabled,
  isPracticeMode = false,
  xpMultiplier = 1,
  onLoseHeart,
  onRecordMistake,
  onCompleteLesson,
  onClose,
}) => {
  const [queue, setQueue] = useState<Challenge[]>(() => [...initialChallenges]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedWords, setSelectedWords] = useState<{ word: string; bankIdx: number }[]>([]);
  const [useKeyboardInput, setUseKeyboardInput] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [activeHintToken, setActiveHintToken] = useState<string | null>(null);

  // Matching challenge state
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [wrongFlashPair, setWrongFlashPair] = useState<{ left?: string; right?: string } | null>(null);

  // Speaking challenge state
  const [isRecordingSpeech, setIsRecordingSpeech] = useState(false);
  const [spokenComplete, setSpokenComplete] = useState(false);

  // Check state
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [streakInLesson, setStreakInLesson] = useState(0);
  const [mistakesMade, setMistakesMade] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [isFinished, setIsFinished] = useState(false);

  const currentChallenge = queue[currentIndex];

  const shuffledRightPairs = useMemo(() => {
    if (!currentChallenge?.pairs) return [];
    const copy = [...currentChallenge.pairs];
    // Deterministic shuffle per challenge id
    return copy.sort((a, b) => a.target.localeCompare(b.target));
  }, [currentChallenge]);

  useEffect(() => {
    if (!currentChallenge) return;
    setSelectedOption('');
    setSelectedWords([]);
    setTypedAnswer('');
    setActiveHintToken(null);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMatchedPairIds([]);
    setWrongFlashPair(null);
    setIsRecordingSpeech(false);
    setSpokenComplete(false);
    setStatus('idle');

    // Auto-speak target phrase if present
    if (
      currentChallenge.targetLanguageText &&
      (currentChallenge.type === 'translate' ||
        currentChallenge.type === 'listenTap' ||
        currentChallenge.type === 'speak')
    ) {
      speakText(currentChallenge.targetLanguageText, speechLang, false);
    }
  }, [currentIndex, currentChallenge, speechLang]);

  // Handle matching pair tap logic
  useEffect(() => {
    if (!selectedLeftId || !selectedRightId || !currentChallenge?.pairs) return;
    if (selectedLeftId === selectedRightId) {
      playCorrectSound(soundEnabled);
      setMatchedPairIds((prev) => [...prev, selectedLeftId]);
      setSelectedLeftId(null);
      setSelectedRightId(null);
    } else {
      playWrongSound(soundEnabled);
      setWrongFlashPair({ left: selectedLeftId, right: selectedRightId });
      const timer = setTimeout(() => {
        setWrongFlashPair(null);
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [selectedLeftId, selectedRightId, currentChallenge, soundEnabled]);

  if (!currentChallenge && !isFinished) {
    return null;
  }

  const outOfHearts = !isSuperDuolingo && !isPracticeMode && hearts <= 0;

  const canCheck = (() => {
    if (!currentChallenge) return false;
    switch (currentChallenge.type) {
      case 'select':
      case 'assist':
      case 'dialogue':
      case 'completeReverseTranslation':
        return Boolean(selectedOption);
      case 'translate':
      case 'listenTap':
        return useKeyboardInput ? typedAnswer.trim().length > 0 : selectedWords.length > 0;
      case 'match':
        return (
          Boolean(currentChallenge.pairs) &&
          matchedPairIds.length === currentChallenge.pairs!.length
        );
      case 'speak':
        return spokenComplete;
      default:
        return false;
    }
  })();

  const handleCheck = () => {
    if (!currentChallenge || status !== 'idle') return;
    let isCorrect = false;

    if (currentChallenge.type === 'select') {
      isCorrect = selectedOption === currentChallenge.correctOptionId;
    } else if (
      currentChallenge.type === 'assist' ||
      currentChallenge.type === 'dialogue' ||
      currentChallenge.type === 'completeReverseTranslation'
    ) {
      isCorrect = normalizeAnswer(selectedOption) === normalizeAnswer(currentChallenge.correctAnswer);
    } else if (currentChallenge.type === 'translate' || currentChallenge.type === 'listenTap') {
      const candidate = useKeyboardInput
        ? typedAnswer
        : selectedWords.map((w) => w.word).join(' ');
      const accepted = [
        currentChallenge.correctAnswer,
        ...(currentChallenge.acceptableAnswers || []),
      ].map(normalizeAnswer);
      isCorrect = accepted.includes(normalizeAnswer(candidate));
    } else if (currentChallenge.type === 'match') {
      isCorrect =
        Boolean(currentChallenge.pairs) &&
        matchedPairIds.length === currentChallenge.pairs!.length;
    } else if (currentChallenge.type === 'speak') {
      isCorrect = spokenComplete;
    }

    if (isCorrect) {
      playCorrectSound(soundEnabled);
      setStatus('correct');
      setStreakInLesson((s) => s + 1);
    } else {
      playWrongSound(soundEnabled);
      setStatus('wrong');
      setStreakInLesson(0);
      setMistakesMade((m) => m + 1);
      onRecordMistake(currentChallenge);
      if (!isSuperDuolingo && !isPracticeMode) {
        onLoseHeart();
      }
      // Re-queue missed challenge at the end of the session (authentic Duolingo behavior)
      setQueue((prev) => [...prev, { ...currentChallenge, id: currentChallenge.id + '_retry_' + prev.length }]);
    }
  };

  const handleContinue = () => {
    if (currentIndex + 1 >= queue.length) {
      setIsFinished(true);
      playFanfareSound(soundEnabled);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore confetti errors
      }
    } else {
      setCurrentIndex((idx) => idx + 1);
    }
  };

  const handleSkipSpeaking = () => {
    playClickSound(soundEnabled);
    setSpokenComplete(true);
    setStatus('correct');
  };

  const handleRecordVoice = () => {
    playClickSound(soundEnabled);
    setIsRecordingSpeech(true);
    setTimeout(() => {
      setIsRecordingSpeech(false);
      setSpokenComplete(true);
      playCorrectSound(soundEnabled);
      setStatus('correct');
    }, 1400);
  };

  // Out of hearts screen
  if (outOfHearts && status === 'wrong') {
    return (
      <div className="lesson-fullscreen">
        <div className="lesson-body" style={{ textAlign: 'center', maxWidth: 460 }}>
          <div style={{ fontSize: '4.5rem', marginBottom: 12 }}>💔</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8 }}>
            Suas vidas acabaram!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 24 }}>
            Pratique no Hub de Prática para recuperar vidas grátis, recarregue com Gemas na Loja ou ative o Super Duolingo para ter vidas ilimitadas!
          </p>
          <button className="duo-btn duo-btn-blue" style={{ width: '100%' }} onClick={onClose}>
            Voltar para a Trilha (/learn)
          </button>
        </div>
      </div>
    );
  }

  // Lesson Summary Victory Screen
  if (isFinished) {
    const elapsedSeconds = Math.max(8, Math.round((Date.now() - startTime) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const accuracyPct = Math.max(
      65,
      Math.min(
        100,
        Math.round(
          (initialChallenges.length / Math.max(1, initialChallenges.length + mistakesMade)) * 100
        )
      )
    );
    const baseXp = isPracticeMode ? 10 : 15 + (mistakesMade === 0 ? 5 : 0);
    const earnedXp = baseXp * xpMultiplier;

    return (
      <div className="lesson-fullscreen">
        <div className="lesson-body" style={{ textAlign: 'center', maxWidth: 540 }}>
          <div style={{ fontSize: '5rem', marginBottom: 8 }}>🦉🎉</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--duo-gold)', marginBottom: 6 }}>
            Lição concluída!
          </h2>
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 28 }}>
            {mistakesMade === 0
              ? 'Perfeito! Você acertou todos os exercícios sem errar!'
              : `Excelente esforço em "${title}"!`}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 14,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                border: '2px solid var(--duo-gold)',
                borderRadius: 16,
                overflow: 'hidden',
                background: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  background: 'var(--duo-gold)',
                  color: '#5c4300',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Total de XP
              </div>
              <div style={{ padding: '14px 8px', fontSize: '1.4rem', fontWeight: 900, color: 'var(--duo-gold)' }}>
                ⚡ +{earnedXp}
              </div>
            </div>

            <div
              style={{
                border: '2px solid var(--duo-green)',
                borderRadius: 16,
                overflow: 'hidden',
                background: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  background: 'var(--duo-green)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Precisão
              </div>
              <div style={{ padding: '14px 8px', fontSize: '1.4rem', fontWeight: 900, color: 'var(--duo-green)' }}>
                🎯 {accuracyPct}%
              </div>
            </div>

            <div
              style={{
                border: '2px solid var(--duo-blue)',
                borderRadius: 16,
                overflow: 'hidden',
                background: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  background: 'var(--duo-blue)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Tempo
              </div>
              <div style={{ padding: '14px 8px', fontSize: '1.4rem', fontWeight: 900, color: 'var(--duo-blue)' }}>
                ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <button
            id="lesson-finish-continue-btn"
            className="duo-btn duo-btn-green"
            style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}
            onClick={() => onCompleteLesson(earnedXp, accuracyPct, mistakesMade === 0)}
          >
            Continuar (+{earnedXp} XP)
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.min(100, Math.round((currentIndex / Math.max(1, queue.length)) * 100));

  return (
    <div className="lesson-fullscreen">
      {/* Top Progress Bar & Hearts */}
      <div className="lesson-header">
        <button
          id="lesson-close-btn"
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontWeight: 900,
          }}
          title="Sair da lição"
        >
          ✕
        </button>

        <div style={{ flex: 1 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {streakInLesson >= 2 && (
          <div
            style={{
              background: 'rgba(255, 150, 0, 0.16)',
              color: 'var(--duo-orange)',
              padding: '4px 10px',
              borderRadius: 999,
              fontWeight: 900,
              fontSize: '0.8rem',
            }}
          >
            🔥 {streakInLesson} SEGUIDAS!
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, color: 'var(--duo-red)' }}>
          <span style={{ fontSize: '1.3rem' }}>{isSuperDuolingo ? '♾️' : '❤️'}</span>
          <span>{isSuperDuolingo ? 'SUPER' : isPracticeMode ? 'PRÁTICA' : hearts}</span>
        </div>
      </div>

      {/* Challenge Body */}
      <div className="lesson-body">
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 900,
            color: 'var(--duo-purple)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 6,
          }}
        >
          {currentIndex >= initialChallenges.length ? '🔄 Revisão de erro anterior' : `Exercício ${currentIndex + 1} de ${queue.length}`}
        </div>

        <h2 style={{ fontSize: '1.65rem', fontWeight: 900, marginBottom: 22 }}>
          {currentChallenge.prompt}
        </h2>

        {/* 1. SELECT CHALLENGE */}
        {currentChallenge.type === 'select' && currentChallenge.selectOptions && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 14,
            }}
          >
            {currentChallenge.selectOptions.map((opt, idx) => {
              const selected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`select-opt-${opt.id}`}
                  type="button"
                  className={`choice-card ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    if (status !== 'idle') return;
                    setSelectedOption(opt.id);
                    speakText(opt.audioText || opt.label, speechLang, false);
                  }}
                >
                  <span style={{ fontSize: '3.2rem' }}>{opt.emoji}</span>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{opt.label}</div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: '2px solid var(--border-color)',
                      borderRadius: 8,
                      padding: '2px 8px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. TRANSLATE CHALLENGE */}
        {currentChallenge.type === 'translate' && (
          <div>
            {/* Character Speech Bubble with Audio & Dotted Hover Hints */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  flexShrink: 0,
                }}
              >
                {currentChallenge.characterAvatar || '🦉'}
              </div>

              <div
                style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: 16,
                  padding: '14px 18px',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="duo-btn duo-btn-blue duo-btn-sm"
                  onClick={() =>
                    speakText(currentChallenge.targetLanguageText || '', speechLang, false)
                  }
                  title="Ouvir pronúncia"
                >
                  🔊
                </button>

                <div style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(currentChallenge.targetLanguageText || '').split(' ').map((token, idx) => {
                    const cleanKey = token.replace(/[.,!?;:]/g, '');
                    const hint =
                      currentChallenge.wordHints?.[token] ||
                      currentChallenge.wordHints?.[cleanKey];
                    return (
                      <span
                        key={idx}
                        className={hint ? 'hint-token' : ''}
                        onClick={() => {
                          speakText(cleanKey, speechLang, false);
                          setActiveHintToken(activeHintToken === token ? null : token);
                        }}
                      >
                        {token}
                        {hint && activeHintToken === token && (
                          <span className="hint-tooltip">{hint}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {!useKeyboardInput ? (
              <>
                {/* Answer Drop Area */}
                <div
                  style={{
                    minHeight: 68,
                    borderTop: '2px solid var(--border-color)',
                    borderBottom: '2px solid var(--border-color)',
                    padding: '12px 4px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 22,
                  }}
                >
                  {selectedWords.length === 0 && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.95rem' }}>
                      Toque nos blocos abaixo para montar a resposta...
                    </span>
                  )}
                  {selectedWords.map((item, idx) => (
                    <button
                      key={`${item.bankIdx}-${idx}`}
                      type="button"
                      className="word-chip"
                      onClick={() => {
                        if (status !== 'idle') return;
                        playClickSound(soundEnabled);
                        setSelectedWords((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      {item.word}
                    </button>
                  ))}
                </div>

                {/* Word Bank */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  {(currentChallenge.wordBank || []).map((word, bankIdx) => {
                    const isUsed = selectedWords.some((w) => w.bankIdx === bankIdx);
                    return (
                      <button
                        key={bankIdx}
                        id={`word-bank-${bankIdx}`}
                        type="button"
                        disabled={isUsed || status !== 'idle'}
                        className="word-chip"
                        style={{ opacity: isUsed ? 0.28 : 1 }}
                        onClick={() => {
                          playClickSound(soundEnabled);
                          setSelectedWords((prev) => [...prev, { word, bankIdx }]);
                        }}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <textarea
                id="translate-keyboard-textarea"
                className="duo-input"
                rows={3}
                placeholder="Digite a tradução..."
                value={typedAnswer}
                disabled={status !== 'idle'}
                onChange={(e) => setTypedAnswer(e.target.value)}
              />
            )}

            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <button
                type="button"
                className="duo-btn duo-btn-outline duo-btn-sm"
                onClick={() => setUseKeyboardInput((v) => !v)}
              >
                {useKeyboardInput ? '🧩 Usar banco de palavras' : '⌨️ Usar teclado'}
              </button>
            </div>
          </div>
        )}

        {/* 3. LISTEN TAP CHALLENGE */}
        {currentChallenge.type === 'listenTap' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 28 }}>
              <button
                id="listen-normal-btn"
                type="button"
                className="duo-btn duo-btn-blue"
                style={{ width: 96, height: 96, borderRadius: 24, fontSize: '2.4rem' }}
                onClick={() => speakText(currentChallenge.targetLanguageText || '', speechLang, false)}
                title="Ouvir velocidade normal"
              >
                🔊
              </button>
              <button
                id="listen-slow-btn"
                type="button"
                className="duo-btn duo-btn-blue"
                style={{ width: 76, height: 76, borderRadius: 20, fontSize: '1.9rem', alignSelf: 'flex-end' }}
                onClick={() => speakText(currentChallenge.targetLanguageText || '', speechLang, true)}
                title="Ouvir devagar (Tartaruga)"
              >
                🐢
              </button>
            </div>

            <div
              style={{
                minHeight: 64,
                borderTop: '2px solid var(--border-color)',
                borderBottom: '2px solid var(--border-color)',
                padding: '12px 4px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                marginBottom: 22,
              }}
            >
              {selectedWords.map((item, idx) => (
                <button
                  key={`${item.bankIdx}-${idx}`}
                  type="button"
                  className="word-chip"
                  onClick={() => {
                    if (status !== 'idle') return;
                    setSelectedWords((prev) => prev.filter((_, i) => i !== idx));
                  }}
                >
                  {item.word}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {(currentChallenge.wordBank || []).map((word, bankIdx) => {
                const isUsed = selectedWords.some((w) => w.bankIdx === bankIdx);
                return (
                  <button
                    key={bankIdx}
                    type="button"
                    disabled={isUsed || status !== 'idle'}
                    className="word-chip"
                    style={{ opacity: isUsed ? 0.28 : 1 }}
                    onClick={() => {
                      speakText(word, speechLang, false);
                      setSelectedWords((prev) => [...prev, { word, bankIdx }]);
                    }}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. ASSIST / MULTIPLE CHOICE / DIALOGUE / COMPLETE REVERSE TRANSLATION */}
        {(currentChallenge.type === 'assist' ||
          currentChallenge.type === 'dialogue' ||
          currentChallenge.type === 'completeReverseTranslation') && (
          <div>
            {currentChallenge.dialogueContext && (
              <div
                className="duo-card"
                style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '2rem' }}>{currentChallenge.dialogueContext.avatarA}</span>
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      padding: '10px 14px',
                      borderRadius: 12,
                      fontWeight: 800,
                    }}
                  >
                    {currentChallenge.dialogueContext.lineA}
                  </div>
                  <button
                    type="button"
                    className="duo-btn duo-btn-outline duo-btn-sm"
                    onClick={() => speakText(currentChallenge.dialogueContext!.lineA, speechLang)}
                  >
                    🔊
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      border: '2px dashed var(--duo-blue)',
                      padding: '10px 16px',
                      borderRadius: 12,
                      fontWeight: 800,
                      color: 'var(--duo-blue)',
                    }}
                  >
                    {selectedOption || '_________________'}
                  </div>
                  <span style={{ fontSize: '2rem' }}>{currentChallenge.dialogueContext.avatarB}</span>
                </div>
              </div>
            )}

            {currentChallenge.type === 'completeReverseTranslation' && (
              <div
                className="duo-card"
                style={{ marginBottom: 20, fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
              >
                {currentChallenge.blankPrefix}{' '}
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 90,
                    borderBottom: '3px solid var(--duo-blue)',
                    color: 'var(--duo-blue)',
                    padding: '0 8px',
                  }}
                >
                  {selectedOption || '____'}
                </span>{' '}
                {currentChallenge.blankSuffix}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(currentChallenge.choices || []).map((choice, idx) => (
                <button
                  key={choice}
                  id={`choice-opt-${idx}`}
                  type="button"
                  className={`word-chip ${selectedOption === choice ? 'selected' : ''}`}
                  style={{ justifyContent: 'space-between', padding: '14px 18px', width: '100%' }}
                  onClick={() => {
                    if (status !== 'idle') return;
                    setSelectedOption(choice);
                    speakText(choice, speechLang, false);
                  }}
                >
                  <span>{choice}</span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      border: '2px solid var(--border-color)',
                      borderRadius: 8,
                      padding: '2px 8px',
                    }}
                  >
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. MATCH PAIRS CHALLENGE */}
        {currentChallenge.type === 'match' && currentChallenge.pairs && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentChallenge.pairs.map((p) => {
                const isMatched = matchedPairIds.includes(p.id);
                const isSelected = selectedLeftId === p.id;
                const isWrong = wrongFlashPair?.left === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isMatched}
                    className={`word-chip ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${
                      isWrong ? 'wrong-flash' : ''
                    }`}
                    style={{ padding: '14px 12px' }}
                    onClick={() => {
                      playClickSound(soundEnabled);
                      setSelectedLeftId(p.id);
                    }}
                  >
                    {p.source}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shuffledRightPairs.map((p) => {
                const isMatched = matchedPairIds.includes(p.id);
                const isSelected = selectedRightId === p.id;
                const isWrong = wrongFlashPair?.right === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isMatched}
                    className={`word-chip ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${
                      isWrong ? 'wrong-flash' : ''
                    }`}
                    style={{ padding: '14px 12px' }}
                    onClick={() => {
                      speakText(p.target, speechLang, false);
                      setSelectedRightId(p.id);
                    }}
                  >
                    {p.target}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. SPEAK CHALLENGE */}
        {currentChallenge.type === 'speak' && (
          <div style={{ textAlign: 'center' }}>
            <div
              className="duo-card"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 22px',
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                className="duo-btn duo-btn-blue duo-btn-sm"
                onClick={() => speakText(currentChallenge.targetLanguageText || '', speechLang)}
              >
                🔊
              </button>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {currentChallenge.targetLanguageText}
              </span>
            </div>

            <div>
              <button
                id="speak-record-btn"
                type="button"
                className={`duo-btn ${spokenComplete ? 'duo-btn-green' : 'duo-btn-blue'}`}
                style={{ padding: '18px 32px', fontSize: '1.05rem', marginBottom: 14 }}
                onClick={handleRecordVoice}
              >
                {isRecordingSpeech
                  ? '🎙️ Ouvindo sua pronúncia...'
                  : spokenComplete
                  ? '✅ Pronúncia reconhecida!'
                  : '🎙️ Clique para Falar'}
              </button>
            </div>

            {!spokenComplete && (
              <button
                type="button"
                className="duo-btn duo-btn-outline duo-btn-sm"
                onClick={handleSkipSpeaking}
              >
                Não posso falar agora
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Check / Feedback Bar */}
      <div className={`lesson-footer ${status === 'correct' ? 'correct' : status === 'wrong' ? 'wrong' : ''}`}>
        <div className="lesson-footer-inner">
          {status === 'idle' && (
            <>
              <button
                type="button"
                className="duo-btn duo-btn-outline"
                onClick={() => {
                  // Allow skipping or revealing if stuck
                  setStatus('wrong');
                  playWrongSound(soundEnabled);
                }}
              >
                Pular
              </button>

              <button
                id="lesson-check-btn"
                type="button"
                className="duo-btn duo-btn-green"
                disabled={!canCheck}
                onClick={handleCheck}
                style={{ minWidth: 160 }}
              >
                Verificar
              </button>
            </>
          )}

          {status === 'correct' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: '2.2rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--duo-green-lip)' }}>
                    Mandou muito bem!
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--duo-green-lip)' }}>
                    Resposta exata: {currentChallenge.correctAnswer}
                  </div>
                </div>
              </div>

              <button
                id="lesson-continue-btn"
                type="button"
                className="duo-btn duo-btn-green"
                onClick={handleContinue}
                style={{ minWidth: 160 }}
              >
                Continuar
              </button>
            </>
          )}

          {status === 'wrong' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: '2.2rem' }}>❌</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--duo-red)' }}>
                    Solução correta:
                  </div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--duo-red)' }}>
                    {currentChallenge.correctAnswer}
                  </div>
                  {currentChallenge.explanation && (
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, opacity: 0.9 }}>
                      💡 {currentChallenge.explanation}
                    </div>
                  )}
                </div>
              </div>

              <button
                id="lesson-continue-wrong-btn"
                type="button"
                className="duo-btn duo-btn-red"
                onClick={handleContinue}
                style={{ minWidth: 160 }}
              >
                Entendi
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
