import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../state/auth';

export function VerifyEmail() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'loading' : 'missing');
  const [message, setMessage] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    async function verify() {
      setStatus('loading');
      try {
        const data = await auth.verifyEmail(token);
        if (!cancelled) {
          setMessage(data.message || 'Email успішно підтверджено');
          setStatus('success');
          navigate('/', { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setMessage(e.message || 'Не вдалося підтвердити email');
          setStatus('error');
        }
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [auth, navigate, token]);

  return (
    <div className="authPage">
      <div className="card narrow">
        <h1 className="fontSerif">Підтвердження email</h1>

        {status === 'loading' ? <p className="muted">Перевірка посилання…</p> : null}

        {status === 'missing' ? (
          <>
            <div className="alert">Посилання підтвердження відсутнє або некоректне.</div>
            <p className="muted">
              Перевірте лист від TastyHub або <Link to="/register">зареєструйтеся</Link> знову.
            </p>
          </>
        ) : null}

        {status === 'success' ? (
          <>
            <div className="success">{message}</div>
            <p className="muted">Вхід виконано. Перенаправлення на головну…</p>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <div className="alert">{message}</div>
            <p className="muted">
              <Link to="/login">Увійти</Link> або <Link to="/register">зареєструватися</Link> знову.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
