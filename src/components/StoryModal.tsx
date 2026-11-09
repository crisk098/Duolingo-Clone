import React, { useEffect, useState } from 'react';
import type { StoryItem } from '../types/duolingo';
import {
  playClickSound,
  playCorrectSound,
  playFanfareSound,
  playWrongSound,
  speakText,
} from '../utils/sound';

interface StoryModalProps {
  story: StoryItem;
  speechLang: string;
  soundEnabled: boolean;
  onCompleteStory: (storyId: string, xpReward: number) => void;
  onClose: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({
  story,
  speechLang,
  soundEnabled,
  onCompleteStory,
  onClose,
}) => {
  const [visibleLines, setVisibleLines] = useState(1);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>({});
  const [selectedWrongIdx, setSelectedWrongIdx] = useState<number | null>(null);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});

  const currentLine = story.lines[visibleLines - 1];
  const needsQuestionAnswer =
    Boolean(currentLine?.question) && !answeredQuestions[currentLine.id];
  const isAllRevealed =
    visibleLines >= story.lines.length && !needsQuestionAnswer;

  useEffect(() => {
    if (currentLine) {
      speakText(currentLine.text, speechLang, false);
    }
  }, [visibleLines, currentLine, speechLang]);

  const handleNextLine = () => {
    if (needsQuestionAnswer) return;
    playClickSound(soundEnabled);
    if (visibleLines < story.lines.length) {
      setVisibleLines((v) => v + 1);
      setSelectedWrongIdx(null);
    } else {
      playFanfareSound(soundEnabled);
      onCompleteStory(story.id, story.xpReward);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 660 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid var(--border-color)',
            paddingBottom: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: story.color,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.7rem',
              }}
            >
              {story.icon}
            </span>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Duolingo Stories • Conjunto {story.setNumber}
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900 }}>
                {story.title} <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>({story.titlePt})</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="duo-btn duo-btn-outline duo-btn-sm"
            onClick={onClose}
          >
            ✕ Fechar
          </button>
        </div>

        {/* Story Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {story.lines.slice(0, visibleLines).map((line) => {
            const q = line.question;
            const isQDone = answeredQuestions[line.id];
            return (
              <div key={line.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    background: 'var(--bg-elevated)',
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: '2px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: '2.1rem' }}>{line.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 2 }}>
                      {line.speaker}
                    </div>
                    <div style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 6 }}>
                      {line.text}
                    </div>
                    {showTranslations[line.id] && (
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--duo-blue)' }}>
                        🇧🇷 {line.translation}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="duo-btn duo-btn-outline duo-btn-sm"
                      onClick={() => speakText(line.text, speechLang, false)}
                      title="Ouvir fala"
                    >
                      🔊
                    </button>
                    <button
                      type="button"
                      className="duo-btn duo-btn-outline duo-btn-sm"
                      onClick={() =>
                        setShowTranslations((prev) => ({ ...prev, [line.id]: !prev[line.id] }))
                      }
                      title="Mostrar tradução"
                    >
                      🇧🇷
                    </button>
                  </div>
                </div>

                {/* Mid-story comprehension question */}
                {q && (
                  <div
                    className="duo-card"
                    style={{
                      borderColor: isQDone ? 'var(--duo-green)' : 'var(--duo-blue)',
                      background: isQDone ? 'var(--duo-green-bg)' : 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 10, fontSize: '0.98rem' }}>
                      ❓ {q.prompt}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt, idx) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={isQDone}
                          className={`word-chip ${
                            isQDone && idx === q.correctIndex
                              ? 'matched'
                              : selectedWrongIdx === idx
                              ? 'wrong-flash'
                              : ''
                          }`}
                          style={{ justifyContent: 'flex-start', width: '100%' }}
                          onClick={() => {
                            if (idx === q.correctIndex) {
                              playCorrectSound(soundEnabled);
                              setSelectedWrongIdx(null);
                              setAnsweredQuestions((prev) => ({ ...prev, [line.id]: true }));
                            } else {
                              playWrongSound(soundEnabled);
                              setSelectedWrongIdx(idx);
                            }
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Continue Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
             Parte {visibleLines} de {story.lines.length}
          </span>
          <button
            id="story-next-btn"
            type="button"
            className="duo-btn duo-btn-green"
            disabled={needsQuestionAnswer}
            onClick={handleNextLine}
          >
            {isAllRevealed ? `Concluir História (+${story.xpReward} XP)` : 'Continuar →'}
          </button>
        </div>
      </div>
    </div>
  );
};
