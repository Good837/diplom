import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../state/auth';
import { isValidEmail } from '../utils/validation';

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const canSubmit = useMemo(() => isValidEmail(email) && password.length > 0, [email, password]);

  async function submit(e) {
    e.preventDefault();
    const errors = {};
    if (!isValidEmail(email)) errors.email = 'Вкажіть коректний email.';
    if (!password) errors.password = 'Вкажіть пароль.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setError('');
    setMessage('');
    setNeedsVerification(false);
    setBusy(true);
    try {
      await auth.login(email, password);
      navigate('/');
    } catch (e2) {
      if (e2.data?.details?.code === 'email_not_verified') {
        setNeedsVerification(true);
      }
      setError(e2.message || 'Не вдалося увійти');
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!isValidEmail(email)) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await auth.resendVerification(email.trim().toLowerCase());
      setMessage(data.message || 'Лист надіслано повторно');
    } catch (e2) {
      setError(e2.message || 'Не вдалося надіслати лист');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
    <div className="card narrow">
      <h1 className="fontSerif">Увійти</h1>
      <p className="muted">
        Немає акаунта? <Link to="/register">Зареєструватися</Link>
      </p>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          {fieldErrors.email ? <span className="fieldError">{fieldErrors.email}</span> : null}
        </label>

        <label className="field">
          <span className="label">Пароль</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {fieldErrors.password ? <span className="fieldError">{fieldErrors.password}</span> : null}
        </label>

        <button className="btn" type="submit" disabled={busy || !canSubmit}>
          {busy ? 'Вхід…' : 'Увійти'}
        </button>
      </form>

      {needsVerification ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnSecondary" type="button" onClick={resendVerification} disabled={busy}>
            {busy ? 'Надсилання…' : 'Надіслати лист підтвердження повторно'}
          </button>
        </div>
      ) : null}
    </div>
    </div>
  );
}
