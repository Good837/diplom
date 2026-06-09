import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../state/auth';
import { isValidEmail, MAX_USERNAME } from '../utils/validation';

export function Register() {
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const canSubmit = useMemo(() => {
    return (
      username.trim().length >= 2 &&
      username.trim().length <= MAX_USERNAME &&
      isValidEmail(email) &&
      password.length >= 6
    );
  }, [username, email, password]);

  async function submit(e) {
    e.preventDefault();
    const errors = {};
    if (username.trim().length < 2) errors.username = "Ім'я користувача — щонайменше 2 символи.";
    else if (username.trim().length > MAX_USERNAME) errors.username = `Не довше ${MAX_USERNAME} символів.`;
    if (!isValidEmail(email)) errors.email = 'Вкажіть коректний email.';
    if (password.length < 6) errors.password = 'Пароль має містити щонайменше 6 символів.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await auth.register(username, email, password);
      setRegisteredEmail(email.trim().toLowerCase());
      setMessage(data.message || 'На вашу пошту надіслано лист для підтвердження email');
    } catch (e2) {
      setError(e2.message || 'Не вдалося зареєструватися');
    } finally {
      setBusy(false);
    }
  }

  async function resendLetter() {
    if (!registeredEmail) return;
    setError('');
    setBusy(true);
    try {
      const data = await auth.resendVerification(registeredEmail);
      setMessage(data.message || 'Лист надіслано повторно');
    } catch (e2) {
      setError(e2.message || 'Не вдалося надіслати лист повторно');
    } finally {
      setBusy(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="authPage">
        <div className="card narrow">
          <h1 className="fontSerif">Перевірте пошту</h1>
          {error ? <div className="alert">{error}</div> : null}
          {message ? <div className="success">{message}</div> : null}
          <p className="muted">
            Ми надіслали лист на <strong>{registeredEmail}</strong>. Перейдіть за посиланням у листі, щоб
            підтвердити email і увійти до TastyHub.
          </p>
          <div className="row">
            <button className="btn btnSecondary" type="button" onClick={resendLetter} disabled={busy}>
              {busy ? 'Надсилання…' : 'Надіслати лист повторно'}
            </button>
            <Link className="btn" to="/login">
              Увійти
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authPage">
    <div className="card narrow">
      <h1 className="fontSerif">Реєстрація</h1>
      <p className="muted">
        Уже маєте акаунт? <Link to="/login">Увійти</Link>
      </p>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="label">Ім'я користувача</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Напр., olena"
            maxLength={MAX_USERNAME}
          />
          {fieldErrors.username ? <span className="fieldError">{fieldErrors.username}</span> : null}
        </label>

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
          <span className="hint">Мінімум 6 символів.</span>
          {fieldErrors.password ? <span className="fieldError">{fieldErrors.password}</span> : null}
        </label>

        <button className="btn" type="submit" disabled={busy || !canSubmit}>
          {busy ? 'Реєстрація…' : 'Створити акаунт'}
        </button>
      </form>
    </div>
    </div>
  );
}
