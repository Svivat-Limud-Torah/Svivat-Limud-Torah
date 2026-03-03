// frontend/src/components/AuthModal.jsx
// Authentication Modal for Torah IDE

import React, { useState } from 'react';
import './AuthModal.css';
import FirebaseAuthService from '../services/FirebaseAuthService';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await FirebaseAuthService.signIn(email, password);
    
    setLoading(false);
    
    if (result.success) {
      onAuthSuccess(result.user);
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await FirebaseAuthService.signUp(email, password, displayName);
    
    setLoading(false);
    
    if (result.success) {
      onAuthSuccess(result.user);
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handleAnonymousSignIn = async () => {
    setError('');
    setLoading(true);

    const result = await FirebaseAuthService.signInAnonymously();
    
    setLoading(false);
    
    if (result.success) {
      onAuthSuccess(result.user);
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await FirebaseAuthService.resetPassword(email);
    
    setLoading(false);
    
    if (result.success) {
      setMessage('נשלח אימייל לאיפוס סיסמה. אנא בדוק את תיבת הדואר שלך.');
    } else {
      setError(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2>
            {mode === 'signin' && 'התחברות לסביבת לימוד תורה'}
            {mode === 'signup' && 'הרשמה לסביבת לימוד תורה'}
            {mode === 'reset' && 'איפוס סיסמה'}
          </h2>
          <button className="auth-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="auth-modal-content">
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div className="auth-form-group">
                <label>אימייל:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="auth-form-group">
                <label>סיסמה:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? 'מתחבר...' : 'התחבר'}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp}>
              <div className="auth-form-group">
                <label>שם מלא:</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="auth-form-group">
                <label>אימייל:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="auth-form-group">
                <label>סיסמה:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? 'נרשם...' : 'הירשם'}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handlePasswordReset}>
              <div className="auth-form-group">
                <label>אימייל:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>
            </form>
          )}

          <div className="auth-mode-switch">
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('signup')} className="auth-link">
                  אין לך חשבון? הירשם כאן
                </button>
                <button onClick={() => setMode('reset')} className="auth-link">
                  שכחת סיסמה?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => setMode('signin')} className="auth-link">
                יש לך חשבון? התחבר כאן
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => setMode('signin')} className="auth-link">
                חזור להתחברות
              </button>
            )}
          </div>

          <div className="auth-divider">או</div>

          <button 
            onClick={handleAnonymousSignIn} 
            className="auth-btn secondary"
            disabled={loading}
          >
            המשך כאורח (ללא הרשמה)
          </button>

          <div className="auth-note">
            <small>
              משתמש אורח יכול להשתמש באפליקציה, אך הנתונים לא ישמרו לאחר יציאה.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
