import React from 'react';
import type { PathUnit } from '../types/duolingo';
import { speakText } from '../utils/sound';

interface GuidebookModalProps {
  unit: PathUnit;
  courseName: string;
  speechLang: string;
  onClose: () => void;
}

export const GuidebookModal: React.FC<GuidebookModalProps> = ({
  unit,
  courseName,
  speechLang,
  onClose,
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            background: unit.themeColor,
            color: '#fff',
            padding: '20px 22px',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '2.8rem' }}>{unit.mascotEmoji}</span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.9 }}>
                Guia da {unit.title} • {courseName}
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900 }}>{unit.description}</h2>
            </div>
          </div>

          <button
            type="button"
            className="guidebook-btn"
            onClick={onClose}
          >
            ✕ Fechar
          </button>
        </div>

        {/* Key Phrases */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
            🗣️ Expressões-Chave (Toque para Ouvir)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {unit.guidebookTips.map((tip, idx) => (
              <div
                key={idx}
                className="duo-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '14px 16px',
                  cursor: 'pointer',
                }}
                onClick={() => speakText(tip.phrase, speechLang, false)}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--duo-blue)' }}>
                    {tip.phrase}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {tip.translation}
                  </div>
                  {tip.pronunciation && (
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
                      Pronúncia aproximada: [{tip.pronunciation}]
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="duo-btn duo-btn-blue duo-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(tip.phrase, speechLang, false);
                  }}
                >
                  🔊 Ouvir
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Grammar Notes */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
            💡 Dicas de Gramática
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {unit.grammarNotes.map((note, idx) => (
              <div key={idx} className="duo-card" style={{ background: 'var(--bg-elevated)' }}>
                <div style={{ fontWeight: 900, fontSize: '1.08rem', marginBottom: 6 }}>
                  {note.title}
                </div>
                <p style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {note.explanation}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {note.examples.map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-surface)',
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: '2px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{ex.target}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {ex.pt}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="duo-btn duo-btn-outline duo-btn-sm"
                        onClick={() => speakText(ex.target, speechLang, false)}
                      >
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
