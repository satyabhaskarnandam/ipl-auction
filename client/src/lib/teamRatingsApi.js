export const fetchTeamRatings = async (teams, options = {}) => {
  const response = await fetch("/teams/ratings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ teams }),
    signal: options.signal,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Could not fetch team ratings");
  }

  return Array.isArray(payload.ratings) ? payload.ratings : [];
};
