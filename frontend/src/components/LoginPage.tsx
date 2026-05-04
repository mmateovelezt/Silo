import React, { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import logoCuadrado from '../assets/logo-cuadrado.svg';
import logoWhite from '../assets/logo-white.png';
import './LoginPage.css';

export const LoginPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const getFriendlyErrorMessage = (rawError: string) => {
    if (rawError.includes('Invalid login credentials')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (rawError.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in.';
    }
    if (rawError.includes('Password should be at least 6 characters')) {
      return 'Password must be at least 6 characters.';
    }
    if (rawError.includes('fetch') || rawError.includes('network')) {
      return 'Connection error. Please check your internet.';
    }
    return rawError || 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (isRegistering) {
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        setError(getFriendlyErrorMessage(signUpError.message));
      } else {
         setSuccessMessage('Account created! Please check your email to verify your account.');
         // We keep the state as isRegistering to show the success message clearly.
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(getFriendlyErrorMessage(signInError.message));
      }
    }

    setLoading(false);
  };

  const switchTab = (tab: 'login' | 'register') => {
    setIsRegistering(tab === 'register');
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page-container">
      {/* ══════ LEFT: BRAND PANEL ══════ */}
      <div className="panel-left">
        {/* Decorative hexagon SVG */}
        <svg className="hex-deco" viewBox="0 0 340 340" fill="none">
          <path d="M170 10L320 92.5V257.5L170 340L20 257.5V92.5L170 10Z" stroke="white" strokeWidth="1"/>
          <path d="M170 50L290 115V245L170 310L50 245V115L170 50Z" stroke="white" strokeWidth="0.5"/>
          <path d="M170 90L260 137.5V232.5L170 280L80 232.5V137.5L170 90Z" stroke="white" strokeWidth="0.5"/>
          <circle cx="170" cy="170" r="40" stroke="white" strokeWidth="0.5"/>
          <circle cx="170" cy="170" r="8" fill="white" opacity="0.3"/>
        </svg>

        <div className="brand-top">
          <div className="brand-icon">
            <img src={logoWhite} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
          <span className="brand-name">Silo</span>
        </div>

        <div className="hero-content">
          <div className="hero-tag">
            <div className="hero-tag-dot"></div>
            The smart assistant for interpreters.
          </div>
          <h1 className="hero-title">
            Never lose<br />
            a <em>word</em><br />
            again.
          </h1>
          <p className="hero-body">
            Silo is a virtual assistant designed to help interpreters improve note-taking during consecutive interpretation, allowing you to capture speech accurately and reconstruct complete ideas effortlessly.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">
                {/* Pen / Note-taking icon */}
                <svg viewBox="0 0 15 15" fill="none">
                  <path d="M11.854 1.146a.5.5 0 0 0-.708 0L9.5 2.793l2.707 2.707 1.646-1.647a.5.5 0 0 0 0-.707l-2-2zM2 13v-2.293l6.5-6.5 2.707 2.707-6.5 6.5H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="feature-text"><strong>Assists note-taking</strong> in real-time as the speaker talks.</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                {/* Accuracy / Target icon */}
                <svg viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="7.5" cy="7.5" r="2" fill="currentColor"/>
                  <path d="M7.5 1.5v-1M7.5 14.5v-1M13.5 7.5h1M1.5 7.5h-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="feature-text"><strong>Improves accuracy</strong> with precise entity extraction.</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                {/* Puzzle / Reconstruction icon */}
                <svg viewBox="0 0 15 15" fill="none">
                  <path d="M4.5 1.5H3a1.5 1.5 0 0 0-1.5 1.5V4.5a1.5 1.5 0 0 1 0 3V9a1.5 1.5 0 0 0 1.5 1.5h1.5a1.5 1.5 0 0 1 3 0h1.5A1.5 1.5 0 0 0 10.5 9V7.5a1.5 1.5 0 0 1 0-3V3A1.5 1.5 0 0 0 9 1.5H7.5a1.5 1.5 0 0 1-3 0z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="feature-text"><strong>Helps reconstruct full messages</strong> without cognitive strain.</div>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <div className="lang-line">
            <span className="lang-dot">🇺🇸</span> EN
            <span style={{ opacity: 0.3 }}>→</span>
            <span className="lang-dot">🇪🇸</span> ES
          </div>
        </div>
      </div>

      {/* ══════ RIGHT: FORM PANEL ══════ */}
      <div className="panel-right">
        <div className="auth-card">
          {/* Tab switcher */}
          <div className="tab-bar">
            <button className={`tab ${!isRegistering ? 'active' : ''}`} onClick={() => switchTab('login')}>Sign in</button>
            <button className={`tab ${isRegistering ? 'active' : ''}`} onClick={() => switchTab('register')}>Register</button>
          </div>

          <div className="card-title">{isRegistering ? 'Create account' : 'Welcome back'}</div>
          <div className="card-sub">{isRegistering ? 'Start interpreting in seconds' : 'Sign in to your Silo account'}</div>

          {successMessage ? (
            <div className="success-screen" style={{ display: 'flex' }}>
              <div className="success-ring">
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{successMessage}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.6 }}>Then you can sign in.</div>
              </div>
              <button type="button" className="submit-btn" style={{ width: 'auto', padding: '10px 28px' }} onClick={() => switchTab('login')}>Go to Sign in →</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  </span>
                  <input 
                    type="email" 
                    className={`lp-input ${error && error.includes('email') ? 'error' : ''}`}
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg viewBox="0 0 15 15" fill="none"><rect x="2" y="6" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className={`lp-input ${error && error.includes('assword') ? 'error' : ''}`}
                    placeholder={isRegistering ? "Min. 6 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={togglePasswordVisibility}>
                    {showPassword ? (
                      <svg viewBox="0 0 15 15" fill="none"><path d="M1 1l13 13M6.5 4a4 4 0 015.5 5.5M3 3.5A9 9 0 001 7.5s2.5 4.5 6.5 4.5a7 7 0 003-.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    ) : (
                      <svg viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 3 7.5 3s6.5 4.5 6.5 4.5S13.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-msg">
                  <svg viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="5" stroke="currentColor" strokeWidth="1"/><path d="M5.5 3v3M5.5 7.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading}>
                <div className="btn-inner">
                  {loading && <div className="spinner" style={{ display: 'block' }}></div>}
                  <span className="btn-text">
                    {loading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create account' : 'Sign in')}
                  </span>
                </div>
              </button>
            </form>
          )}

          <p className="terms-text" style={{ marginTop: '24px' }}>
            {isRegistering ? (
              <>By creating an account you agree to our <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a>.</>
            ) : (
              <>Access restricted to authorized personnel.</>
            )}
          </p>

          {!successMessage && (
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
              <button 
                type="button"
                onClick={() => switchTab(isRegistering ? 'login' : 'register')} 
                style={{ background: 'none', border: 'none', color: 'var(--es)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {isRegistering ? "Sign in" : "Create one"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
