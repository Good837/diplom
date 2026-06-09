import React from 'react';
import { Link } from 'react-router-dom';

function formatCount(count) {
  const n = count || 0;
  if (n === 1) return '1 оцінка';
  if (n >= 2 && n <= 4) return `${n} оцінки`;
  return `${n} оцінок`;
}

function StarIcon({ filled, half }) {
  const cls = filled ? 'starRatingStar starRatingStarFilled' : half ? 'starRatingStar starRatingStarHalf' : 'starRatingStar';
  return (
    <span className={cls} aria-hidden="true">
      ★
    </span>
  );
}

function displayStars(avg) {
  if (avg == null) return [false, false, false, false, false];
  const numeric = Number(avg);
  if (!Number.isFinite(numeric)) return [false, false, false, false, false];

  const full = Math.floor(numeric);
  const half = numeric - full >= 0.25 && numeric - full < 0.75;
  const extraFull = numeric - full >= 0.75;
  const totalFull = Math.min(5, full + (extraFull ? 1 : 0));
  return Array.from({ length: 5 }, (_, i) => {
    if (i < totalFull) return { filled: true, half: false };
    if (!extraFull && half && i === totalFull) return { filled: false, half: true };
    return { filled: false, half: false };
  });
}

export function StarRating({
  ratingAvg = null,
  ratingCount = 0,
  myRating = null,
  interactive = false,
  disabled = false,
  isOwner = false,
  isAuthenticated = false,
  onRate,
  compact = false,
}) {
  const stars = displayStars(ratingAvg);
  const label =
    ratingCount > 0 && ratingAvg != null
      ? `${ratingAvg} · ${formatCount(ratingCount)}`
      : 'Ще немає оцінок';

  const canVote = interactive && !isOwner && isAuthenticated;

  function handleClick(value) {
    if (!canVote || disabled) return;
    onRate?.(value);
  }

  return (
    <div className={`starRating ${compact ? 'starRatingCompact' : ''}`}>
      <div className="starRatingDisplay">
        <div className="starRatingStars" role="img" aria-label={label}>
          {stars.map((display, index) => (
            <StarIcon key={index} filled={display?.filled} half={display?.half} />
          ))}
        </div>
        {!compact ? <span className="starRatingLabel muted">{label}</span> : null}
        {compact && ratingCount > 0 && ratingAvg != null ? (
          <span className="starRatingLabelCompact muted">{ratingAvg}</span>
        ) : null}
      </div>

      {canVote ? (
        <div className="starRatingVote">
          <span className="starRatingVoteLabel muted">Ваша оцінка:</span>
          <div className="starRatingStars" role="group" aria-label="Ваша оцінка">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`starRatingBtn ${myRating != null && value <= myRating ? 'starRatingBtnActive' : ''}`}
                disabled={disabled}
                onClick={() => handleClick(value)}
                aria-label={`Оцінити ${value} з 5`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {interactive && !isAuthenticated ? (
        <span className="starRatingHint muted">
          <Link to="/login">Увійти</Link>, щоб оцінити
        </span>
      ) : null}
      {interactive && isOwner ? (
        <span className="starRatingHint muted">Власний рецепт не оцінюється</span>
      ) : null}
    </div>
  );
}
