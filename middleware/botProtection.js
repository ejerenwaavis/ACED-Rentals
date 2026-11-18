const crypto = require('crypto');

// Secret salt for anti-bot token verification (derived from session secret or env)
const BOT_SALT = process.env.SESSION_SECRET || 'aced-rentals-anti-bot-salt-2026';

// Common disposable/throwaway email providers used by spambots
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'sharklasers.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getairmail.com',
  'dispostable.com',
  'mytemp.email',
  'fakemailgenerator.com',
  'generator.email',
  'emailondeck.com',
  'tempail.com',
  'mohmal.com',
  'inboxkitten.com',
  'burnermail.io',
  'trashmail.net',
  'tempmailaddress.com',
  'crazymailing.com',
  'tmail.com',
  'dropmail.me',
]);

// Obvious dummy phone number patterns (all same digits or sequential)
const DUMMY_PHONE_PATTERNS = [
  /^0{10,}$/,
  /^1{10,}$/,
  /^2{10,}$/,
  /^3{10,}$/,
  /^4{10,}$/,
  /^5{10,}$/,
  /^6{10,}$/,
  /^7{10,}$/,
  /^8{10,}$/,
  /^9{10,}$/,
  /^1234567890$/,
  /^0123456789$/,
  /^9876543210$/,
];

// Helper to generate a verification token based on timestamp
function generateBotToken(timestamp) {
  return crypto
    .createHmac('sha256', BOT_SALT)
    .update(String(timestamp))
    .digest('hex')
    .slice(0, 16);
}

// Bot protection middleware for public waitlist submissions
function botProtection(req, res, next) {
  const {
    contact,
    company_website, // Honeypot 1
    hp_name,         // Honeypot 2
    _ts,             // Submission timestamp
    _token,          // Client verification token
  } = req.body;

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // 1. HONEYPOT CHECK
  // Legitimate users never see or fill these fields.
  if (company_website || hp_name) {
    console.warn(`[Bot Defense] Honeypot triggered from IP ${ip}. Trapped input:`, { company_website, hp_name });
    // Fake success response to spambots so they don't adapt
    return res.status(200).json({
      success: true,
      message: '40% launch discount locked! You are on the early access priority list.',
      spotNumber: 42,
    });
  }

  // 2. TIMING CHECK (Humans take at least 1.2s to fill out the form; bots submit instantly)
  if (_ts) {
    const elapsed = Date.now() - Number(_ts);
    // If submitted under 1000ms or timestamp is from the future, it's an automated bot
    if (elapsed < 1000) {
      console.warn(`[Bot Defense] Ultra-fast submission (${elapsed}ms) from IP ${ip}. Rejected as automated.`);
      return res.status(200).json({
        success: true,
        message: '40% launch discount locked! You are on the early access priority list.',
        spotNumber: 42,
      });
    }

    // Reject tokens older than 24 hours
    if (elapsed > 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        error: 'Form session expired. Please refresh the page and try again.',
      });
    }

    // 3. CRYPTOGRAPHIC TOKEN VERIFICATION
    if (_token) {
      const expectedToken = generateBotToken(_ts);
      if (_token !== expectedToken) {
        console.warn(`[Bot Defense] Invalid bot token from IP ${ip}. Expected ${expectedToken}, got ${_token}`);
        return res.status(400).json({
          success: false,
          error: 'Security verification failed. Please refresh the page and try again.',
        });
      }
    }
  }

  // 4. PAYLOAD CONTENT SANITIZATION
  if (typeof contact === 'string') {
    const trimmed = contact.trim();

    // Check for URL injection or HTML/Script tags in contact field
    if (/https?:\/\/|www\.|\.html|<\s*script|\[url=/i.test(trimmed)) {
      console.warn(`[Bot Defense] Spam URL/Script payload detected in contact field from IP ${ip}:`, trimmed);
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address or phone number without links or tags.',
      });
    }

    // Check for disposable email domains
    if (trimmed.includes('@')) {
      const domain = trimmed.split('@')[1]?.toLowerCase().trim();
      if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        console.warn(`[Bot Defense] Disposable email domain blocked: ${domain} from IP ${ip}`);
        return res.status(400).json({
          success: false,
          error: 'Please use a permanent business or personal email address, or your mobile number.',
        });
      }

      // Reject dummy emails like asdf@asdf.com or test@test.com
      if (/^(test|asdf|fake|spam|admin|root|noemail)@(test|asdf|fake|spam|example)\.(com|org|net)$/i.test(trimmed)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a genuine email address or mobile number.',
        });
      }
    } else {
      // Check for dummy phone numbers
      const digitsOnly = trimmed.replace(/\D/g, '');
      for (const pattern of DUMMY_PHONE_PATTERNS) {
        if (pattern.test(digitsOnly)) {
          console.warn(`[Bot Defense] Dummy phone number blocked: ${digitsOnly} from IP ${ip}`);
          return res.status(400).json({
            success: false,
            error: 'Please enter a valid 10-digit mobile number.',
          });
        }
      }
    }
  }

  next();
}

module.exports = {
  botProtection,
  generateBotToken,
};
