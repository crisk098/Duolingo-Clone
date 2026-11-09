import React, { useState } from 'react';
import type { LanguageId, UserAccount } from '../types/duolingo';
import { COURSES_DATA } from '../data/coursesData';
import { playClickSound, playFanfareSound } from '../utils/sound';

interface AuthModalProps {
  onLogin: (account: UserAccount, initialCourse: LanguageId) => void;
  soundEnabled: boolean;
}

const AVATAR_OPTIONS = ['🦉', '👩🏽‍💻', '🧔🏻‍♂️', '👩🏻‍🎨', '🧑🏽‍🚀', '🦊', '🐼', '🦁'];

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, soundEnabled }) => {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'google-picker'>('welcome');
  const [selectedCourse, setSelectedCourse] = useState<LanguageId>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦉');
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleAccountSelect = (gName: string, gEmail: string, gAvatar: string) => {
    playFanfareSound(soundEnabled);
    const username = gEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'estudante_duo';
    onLogin(
      {
        id: 'usr_' + Date.now(),
        name: gName,
        username,
        email: gEmail,
        avatarEmoji: gAvatar,
        authProvider: 'google',
        joinedDate: 'Novembro de 2026',
      },
      selectedCourse
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Preencha seu e-mail/usuário e senha para continuar.');
      return;
    }
    playFanfareSound(soundEnabled);
    const cleanName = name.trim() || email.split('@')[0] || 'Estudante Duo';
    const cleanUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'estudante_duo';
    onLogin(
      {
        id: 'usr_' + Date.now(),
        name: cleanName,
        username: cleanUsername,
        email: email.trim(),
        avatarEmoji: avatar,
        authProvider: 'email',
        joinedDate: 'Novembro de 2026',
      },
      selectedCourse
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          maxWidth: 1080,
          width: '100%',
          margin: '0 auto',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '2.1rem' }}>🦉</span>
          <span
            style={{
              fontSize: '1.9rem',
              fontWeight: 900,
              color: 'var(--duo-green)',
              letterSpacing: '-0.03em',
            }}
          >
            duolingo
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a
            id="header-download-apk-btn"
            href="/Duolingo-Clone.apk"
            download="Duolingo-Clone.apk"
            className="duo-btn duo-btn-green duo-btn-sm"
          >
            📱 Baixar APK Android
          </a>
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Idioma do site: Português 🇧🇷
          </span>
          {mode === 'welcome' ? (
            <button
              id="header-login-btn"
              className="duo-btn duo-btn-outline duo-btn-sm"
              onClick={() => {
                playClickSound(soundEnabled);
                setMode('login');
              }}
            >
              Já tenho uma conta
            </button>
          ) : (
            <button
              id="header-back-welcome-btn"
              className="duo-btn duo-btn-outline duo-btn-sm"
              onClick={() => {
                playClickSound(soundEnabled);
                setMode('welcome');
              }}
            >
              Voltar ao início
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: 1040,
          width: '100%',
          margin: '0 auto',
          padding: '36px 24px',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mode === 'welcome' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 48,
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* Left Hero Globe & Mascot */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 240,
                  height: 240,
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #d7ffb8 0%, #58cc02 72%)',
                  boxShadow: '0 12px 0 #46a302',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '6.5rem',
                  position: 'relative',
                }}
              >
                🦉
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: -8,
                    background: '#1cb0f6',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    boxShadow: '0 4px 0 #1899d6',
                  }}
                >
                  /learn v1.340
                </span>
              </div>
              <p style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Engenharia reversa via <strong>REA</strong> (<code>ev_b3e85d5c...</code>)
              </p>
            </div>

            {/* Right CTA & Course Selector */}
            <div>
              <h1
                style={{
                  fontSize: '2.15rem',
                  fontWeight: 900,
                  lineHeight: 1.2,
                  marginBottom: 18,
                  color: 'var(--text-primary)',
                }}
              >
                O jeito grátis, divertido e eficaz de aprender um idioma!
              </h1>

              <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Escolha qual curso você quer aprender agora:
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                {(Object.keys(COURSES_DATA) as LanguageId[]).map((langId) => {
                  const c = COURSES_DATA[langId];
                  const active = selectedCourse === langId;
                  return (
                    <button
                      key={langId}
                      id={`welcome-course-${langId}`}
                      type="button"
                      onClick={() => {
                        playClickSound(soundEnabled);
                        setSelectedCourse(langId);
                      }}
                      className={`word-chip ${active ? 'selected' : ''}`}
                      style={{ justifyContent: 'flex-start', padding: '12px 14px' }}
                    >
                      <span style={{ fontSize: '1.45rem' }}>{c.flag}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.73rem', opacity: 0.75 }}>{c.learnersCount}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380 }}>
                <button
                  id="welcome-start-register-btn"
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%', padding: '15px 20px', fontSize: '1rem' }}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setMode('register');
                  }}
                >
                  Começar Agora
                </button>

                <button
                  id="welcome-google-auth-btn"
                  className="duo-btn duo-btn-blue"
                  style={{ width: '100%', padding: '14px 20px' }}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setMode('google-picker');
                  }}
                >
                  <span>🌐</span> Entrar com Conta Google
                </button>

                <button
                  id="welcome-login-existing-btn"
                  className="duo-btn duo-btn-outline"
                  style={{ width: '100%', color: 'var(--duo-blue)' }}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setMode('login');
                  }}
                >
                  Já tenho uma conta (E-mail / Senha)
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'google-picker' && (
          <div className="duo-card" style={{ maxWidth: 460, width: '100%', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: '1.7rem' }}>🌐</span>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900 }}>Fazer login com o Google</h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Escolha uma conta Google para prosseguir para <strong>Duolingo (/learn)</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <button
                id="google-quick-account-1"
                type="button"
                className="duo-btn duo-btn-outline"
                style={{ justifyContent: 'flex-start', textTransform: 'none', padding: '12px 16px' }}
                onClick={() => handleGoogleAccountSelect('Cristian (@crisk098)', 'crisk098@gmail.com', '🦉')}
              >
                <span style={{ fontSize: '1.6rem' }}>🦉</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>Cristian (crisk098)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>crisk098@gmail.com</div>
                </div>
              </button>

              <button
                id="google-quick-account-2"
                type="button"
                className="duo-btn duo-btn-outline"
                style={{ justifyContent: 'flex-start', textTransform: 'none', padding: '12px 16px' }}
                onClick={() => handleGoogleAccountSelect('Poliglota Super Duo', 'poliglota.duo@gmail.com', '🦊')}
              >
                <span style={{ fontSize: '1.6rem' }}>🦊</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>Poliglota Super Duo</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>poliglota.duo@gmail.com</div>
                </div>
              </button>
            </div>

            <div
              style={{
                borderTop: '2px solid var(--border-color)',
                paddingTop: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Ou informe seu próprio e-mail Google:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  id="google-custom-name-input"
                  className="duo-input"
                  placeholder="Seu nome (ex.: Cristian)"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                />
                <input
                  id="google-custom-email-input"
                  type="email"
                  className="duo-input"
                  placeholder="seu.email@gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                />
                <button
                  id="google-custom-submit-btn"
                  type="button"
                  className="duo-btn duo-btn-blue"
                  disabled={!googleCustomEmail.trim()}
                  onClick={() =>
                    handleGoogleAccountSelect(
                      googleCustomName.trim() || googleCustomEmail.split('@')[0],
                      googleCustomEmail.trim(),
                      '🦉'
                    )
                  }
                >
                  Continuar com esta conta Google
                </button>
              </div>
            </div>

            <button
              type="button"
              className="duo-btn duo-btn-outline duo-btn-sm"
              style={{ width: '100%' }}
              onClick={() => setMode('welcome')}
            >
              Cancelar
            </button>
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleFormSubmit} className="duo-card" style={{ maxWidth: 440, width: '100%', padding: 28 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textAlign: 'center', marginBottom: 6 }}>
              {mode === 'login' ? 'Entrar no Duolingo' : 'Crie o seu perfil'}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              Curso selecionado: {COURSES_DATA[selectedCourse].flag} <strong>{COURSES_DATA[selectedCourse].name}</strong>
            </p>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--duo-red-bg)',
                  color: 'var(--duo-red)',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  marginBottom: 14,
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              {mode === 'register' && (
                <>
                  <input
                    id="auth-name-input"
                    className="duo-input"
                    placeholder="Nome de exibição (opcional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Escolha seu avatar:
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {AVATAR_OPTIONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setAvatar(em)}
                          className={`word-chip ${avatar === em ? 'selected' : ''}`}
                          style={{ fontSize: '1.35rem', padding: '6px 10px' }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <input
                id="auth-email-input"
                className="duo-input"
                placeholder="E-mail ou nome de usuário"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                id="auth-password-input"
                type="password"
                className="duo-input"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              className="duo-btn duo-btn-blue"
              style={{ width: '100%', marginBottom: 14 }}
            >
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 14 }}>
              — OU —
            </div>

            <button
              id="auth-switch-google-btn"
              type="button"
              className="duo-btn duo-btn-outline"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={() => setMode('google-picker')}
            >
              <span>🌐</span> Continuar com o Google
            </button>

            <button
              id="auth-toggle-mode-btn"
              type="button"
              className="duo-btn duo-btn-outline duo-btn-sm"
              style={{ width: '100%' }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </form>
        )}
      </main>

      {/* Bottom Language Strip */}
      <footer
        style={{
          borderTop: '2px solid var(--border-color)',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {(Object.keys(COURSES_DATA) as LanguageId[]).map((langId) => {
          const c = COURSES_DATA[langId];
          return (
            <button
              key={langId}
              type="button"
              onClick={() => {
                playClickSound(soundEnabled);
                setSelectedCourse(langId);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 800,
                fontSize: '0.88rem',
                color: selectedCourse === langId ? 'var(--duo-blue)' : 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{c.flag}</span> {c.name}
            </button>
          );
        })}
      </footer>
    </div>
  );
};
