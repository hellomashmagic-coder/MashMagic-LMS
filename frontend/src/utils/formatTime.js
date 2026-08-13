export const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minStr = m !== undefined && !isNaN(m) ? `:${m.toString().padStart(2, '0')}` : ':00';
    return `${hour12}${minStr} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};
