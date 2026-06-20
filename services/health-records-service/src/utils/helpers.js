const formatDate = (date) => date.toISOString().split('T')[0];

const formatTime = (date) => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

module.exports = { formatDate, formatTime };
