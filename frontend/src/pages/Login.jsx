import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../state/auth';

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await auth.login(email, password);
      navigate('/');
    } catch (e2) {
      setError(e2.message || 'Не вдалося увійти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>Увійти</h1>
      <p className="muted">
        Немає акаунта? <Link to="/register">Зареєструватися</Link>
      </p>

      {error ? <div className="alert">{error}</div> : null}

      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="label">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </label>

        <label className="field">
          <span className="label">Пароль</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <button className="btn" type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? 'Вхід…' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}

