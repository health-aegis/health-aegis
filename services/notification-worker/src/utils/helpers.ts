const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';

// Use Intl so the worker respects the same timezone the user sees in the UI,
// regardless of what UTC offset the Kubernetes node runs on.
export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date);

export const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(date);
