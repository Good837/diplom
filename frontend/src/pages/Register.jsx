import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../state/auth';

export function Register() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await auth.register(username, email, password);
      setMessage(data.message || 'Реєстрація успішна');
      navigate('/login');
    } catch (e2) {
      setError(e2.message || 'Не вдалося зареєструватися');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Реєстрація</h1>
      <p className="muted">
        Уже маєте акаунт? <Link to="/login">Увійти</Link>
      </p>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="label">Ім'я користувача</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Напр., olena" />
        </label>

        <label className="field">
          <span className="label">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </label>

        <label className="field">
          <span className="label">Пароль</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="hint">Мінімум 6 символів.</span>
        </label>

        <button className="btn" type="submit" disabled={busy || !username.trim() || !email.trim() || password.length < 6}>
          {busy ? 'Реєстрація…' : 'Створити акаунт'}
        </button>
      </form>
    </div>
  );
}

