import {useState} from 'react';

// A changed review context is unapproved immediately, including the render
// before effects run. Returning to an earlier identity also requires fresh consent.
export default function useDataReviewConsent(context) {
  const [review, setReview] = useState({context, checked: {}, cleared: false});
  if (review.context !== context) {
    setReview({
      context,
      checked: {},
      cleared: review.cleared || Object.values(review.checked).some(Boolean),
    });
  }
  const checked = review.context === context ? review.checked : {};
  return {
    context,
    checked,
    cleared: review.cleared,
    toggle: key =>
      setReview(current => ({
        context,
        cleared: false,
        checked: {
          ...(current.context === context ? current.checked : {}),
          [key]: !checked[key],
        },
      })),
  };
}
