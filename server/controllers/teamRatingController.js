const { rateMultipleTeams, rateTeamSquad } = require("../services/teamRatingService");

const parseTeamPayload = (reqBody) => {
  if (reqBody?.team && typeof reqBody.team === "object") {
    return {
      mode: "single",
      team: reqBody.team,
    };
  }

  if (Array.isArray(reqBody?.teams)) {
    return {
      mode: "many",
      teams: reqBody.teams,
    };
  }

  return null;
};

const postTeamRatings = (req, res) => {
  try {
    const payload = parseTeamPayload(req.body);

    if (!payload) {
      return res.status(400).json({
        ok: false,
        message: "Expected payload with team object or teams array",
      });
    }

    if (payload.mode === "single") {
      const rating = rateTeamSquad(payload.team);
      return res.status(200).json({
        ok: true,
        rating,
      });
    }

    const ratings = rateMultipleTeams(payload.teams);
    return res.status(200).json({
      ok: true,
      ratings,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Could not generate team ratings",
    });
  }
};

module.exports = {
  postTeamRatings,
};
