// List of inappropriate words/patterns to filter
const INAPPROPRIATE_WORDS = [
  // Common profanities and variations
  'bad', 'stupid', 'dumb', 'idiot', 'moron', 'jerk', 'fool',
  'ass', 'crap', 'damn', 'hell', 'bloody', 'piss',
  'bitch', 'bastard', 'pussy', 'dick', 'cock', 'whore',
  'slut', 'rape', 'kill', 'die', 'hate', 'suck',
  // Variations with numbers
  'a55', '@ss', 'b1tch', 'f u c k', 'f*ck', 'sh1t',
  // Add more as needed
];

const REPLACEMENT_NAMES = [
  'Player',
  'Batter',
  'Bowler',
  'Fielder',
  'Wicket',
  'Cricket',
  'Champion',
  'Star',
  'Legend',
  'Pro',
];

/**
 * Check if a name contains inappropriate words
 * @param {string} name - The name to check
 * @returns {boolean} - True if inappropriate words found
 */
export const containsProfanity = (name) => {
  if (!name) return false;
  
  const lowerName = name.toLowerCase();
  
  return INAPPROPRIATE_WORDS.some(word => {
    // Case-insensitive matching
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
    return regex.test(lowerName);
  });
};

/**
 * Get a clean name - returns the name if clean, or a replacement if it contains profanity
 * @param {string} name - The original name
 * @returns {string} - Clean name or replacement
 */
export const getCleanName = (name) => {
  if (!name || !containsProfanity(name)) {
    return name;
  }
  
  // Return a random replacement name
  const randomIndex = Math.floor(Math.random() * REPLACEMENT_NAMES.length);
  const baseName = REPLACEMENT_NAMES[randomIndex];
  
  // Add a number suffix to make it unique
  const suffix = Math.floor(Math.random() * 1000);
  return `${baseName}${suffix}`;
};
