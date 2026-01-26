const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
const screenshotsDir = path.join(publicDir, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Color palette
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  primaryDarker: '#6d28d9',
  darkBg: '#0f172a',
  darkCard: '#1e293b',
  darkBorder: '#334155',
  white: '#f1f5f9',
  lightGray: '#e2e8f0',
  yellow: '#fcd34d',
  darkPurple: '#1e1b4b',
};

// Helper: Draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper: Draw mask icon
function drawMask(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Mask shape
  ctx.fillStyle = colors.white;
  ctx.beginPath();
  ctx.ellipse(0, -10, 140, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = colors.darkPurple;
  ctx.beginPath();
  ctx.ellipse(-50, -30, 30, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(50, -30, 30, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = colors.darkPurple;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 20, 40, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Finger (shh gesture)
  ctx.fillStyle = colors.yellow;
  roundRect(ctx, -10, 40, 20, 60, 10);
  ctx.fill();

  ctx.restore();
}

// Helper: Create gradient background
function createGradientBg(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.primaryDark);
  gradient.addColorStop(1, colors.primaryDarker);
  return gradient;
}

// 1. Generate Icon (1024x1024)
function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners
  ctx.fillStyle = createGradientBg(ctx, size, size);
  roundRect(ctx, 0, 0, size, size, 224);
  ctx.fill();

  // Decorative circles
  ctx.fillStyle = '#a78bfa';
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(200, 200, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.arc(824, 824, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw mask
  drawMask(ctx, size / 2, size / 2, 1.8);

  // Sparkles
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(180, 400, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(844, 350, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(750, 180, 10, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
  console.log('Created: logo.png (1024x1024)');
}

// 2. Generate Splash (200x200)
function generateSplash() {
  const size = 200;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = createGradientBg(ctx, size, size);
  ctx.fillRect(0, 0, size, size);

  // Decorative circles
  ctx.fillStyle = '#a78bfa';
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.arc(30, 30, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.arc(170, 170, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw mask (smaller)
  drawMask(ctx, 100, 90, 0.35);

  // Loading dots
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(80, 165, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(100, 165, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(120, 165, 4, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'splash.png'), buffer);
  console.log('Created: splash.png (200x200)');
}

// 3. Generate Hero/OG Image (1200x630)
function generateHero() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = colors.darkBg;
  ctx.fillRect(0, 0, width, height);

  // Gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
  gradient.addColorStop(1, 'rgba(76, 29, 149, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative elements
  ctx.fillStyle = '#a78bfa';
  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.arc(100, 100, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1100, 530, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw mask on left side
  drawMask(ctx, 280, height / 2, 1.2);

  // Text content
  ctx.fillStyle = colors.white;
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.fillText('BaseConfess', 480, 260);

  ctx.font = '36px Arial, sans-serif';
  ctx.fillStyle = colors.lightGray;
  ctx.fillText('Your secrets, safely shared', 480, 320);

  // Feature pills
  const pills = ['Anonymous', 'Onchain', 'Community'];
  let pillX = 480;
  ctx.font = '24px Arial, sans-serif';
  pills.forEach((text) => {
    const pillWidth = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
    roundRect(ctx, pillX, 360, pillWidth, 44, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, pillX, 360, pillWidth, 44, 22);
    ctx.stroke();
    ctx.fillStyle = colors.white;
    ctx.fillText(text, pillX + 20, 390);
    pillX += pillWidth + 16;
  });

  // Price badge
  ctx.fillStyle = colors.primary;
  roundRect(ctx, 480, 440, 200, 50, 25);
  ctx.fill();
  ctx.fillStyle = colors.white;
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('1 USDC / 30 days', 500, 473);

  // Base logo hint
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = colors.lightGray;
  ctx.globalAlpha = 0.6;
  ctx.fillText('Built on Base', 480, 540);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'hero.png'), buffer);
  fs.writeFileSync(path.join(publicDir, 'embed.png'), buffer);
  console.log('Created: hero.png (1200x630)');
  console.log('Created: embed.png (1200x630)');
}

// 4. Generate Screenshots (1284x2778)
function generateScreenshot(num, title, content) {
  const width = 1284;
  const height = 2778;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = colors.darkBg;
  ctx.fillRect(0, 0, width, height);

  // Status bar area
  ctx.fillStyle = colors.darkCard;
  ctx.fillRect(0, 0, width, 120);

  // Header
  ctx.fillStyle = colors.darkCard;
  ctx.fillRect(0, 120, width, 160);
  ctx.strokeStyle = colors.darkBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 280);
  ctx.lineTo(width, 280);
  ctx.stroke();

  // Logo in header
  ctx.fillStyle = colors.primary;
  roundRect(ctx, 60, 150, 80, 80, 20);
  ctx.fill();
  drawMask(ctx, 100, 190, 0.2);

  // App name
  ctx.fillStyle = colors.white;
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillText('BaseConfess', 170, 200);
  ctx.font = '28px Arial, sans-serif';
  ctx.fillStyle = colors.lightGray;
  ctx.fillText('Anonymous confessions', 170, 240);

  // Content area based on screenshot type
  let yOffset = 340;

  if (num === 1) {
    // Feed view - confession cards
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors.darkCard;
      roundRect(ctx, 40, yOffset, width - 80, 400, 24);
      ctx.fill();
      ctx.strokeStyle = colors.darkBorder;
      ctx.lineWidth = 2;
      roundRect(ctx, 40, yOffset, width - 80, 400, 24);
      ctx.stroke();

      // Category badge
      const categories = ['Love', 'Work', 'Secrets', 'Life'];
      const catColors = ['#ec4899', '#3b82f6', '#8b5cf6', '#eab308'];
      ctx.fillStyle = catColors[i] + '30';
      roundRect(ctx, 80, yOffset + 30, 120, 40, 20);
      ctx.fill();
      ctx.fillStyle = catColors[i];
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText(categories[i], 100, yOffset + 58);

      // Time
      ctx.fillStyle = '#64748b';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText('2h ago', width - 160, yOffset + 58);

      // Content
      ctx.fillStyle = colors.white;
      ctx.font = '32px Arial, sans-serif';
      const confessions = [
        'I still think about what could have been...',
        'Nobody knows I got the promotion yesterday.',
        'I have been keeping this for years now...',
        'Today I realized I need to change...'
      ];
      ctx.fillText(confessions[i], 80, yOffset + 140);

      // Reactions
      const reactions = ['24', '18', '5', '12', '8'];
      const emojis = ['👍', '💜', '🤔', '🔥', '😢'];
      let rx = 80;
      for (let j = 0; j < 5; j++) {
        ctx.fillStyle = colors.darkBorder;
        roundRect(ctx, rx, yOffset + 200, 100, 50, 25);
        ctx.fill();
        ctx.font = '26px Arial, sans-serif';
        ctx.fillText(emojis[j] + ' ' + reactions[j], rx + 15, yOffset + 233);
        rx += 120;
      }

      // Comments count
      ctx.fillStyle = colors.darkBorder;
      roundRect(ctx, width - 220, yOffset + 300, 140, 50, 25);
      ctx.fill();
      ctx.fillStyle = colors.lightGray;
      ctx.fillText('💬 ' + (15 - i * 3), width - 195, yOffset + 333);

      yOffset += 450;
    }
  } else if (num === 2) {
    // Create confession modal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // Modal
    ctx.fillStyle = colors.darkCard;
    roundRect(ctx, 60, 400, width - 120, 1400, 40);
    ctx.fill();

    // Modal header
    ctx.fillStyle = colors.white;
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.fillText('New Anonymous Confession', 120, 500);

    // Close button
    ctx.fillStyle = '#64748b';
    ctx.font = '48px Arial, sans-serif';
    ctx.fillText('×', width - 140, 500);

    // Textarea
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, 100, 560, width - 200, 400, 20);
    ctx.fill();
    ctx.strokeStyle = colors.darkBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, 100, 560, width - 200, 400, 20);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '32px Arial, sans-serif';
    ctx.fillText('Share your confession anonymously...', 140, 640);

    // Character count
    ctx.fillStyle = '#64748b';
    ctx.font = '26px Arial, sans-serif';
    ctx.fillText('0/500', width - 220, 940);

    // Category label
    ctx.fillStyle = colors.lightGray;
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText('Category', 100, 1040);

    // Category buttons
    const cats = [['💕', 'Love'], ['💼', 'Work'], ['🤫', 'Secrets'], ['🔥', 'Controversial'], ['🌟', 'Life'], ['💭', 'Other']];
    let cx = 100;
    let cy = 1080;
    cats.forEach((cat, i) => {
      if (i === 3) { cx = 100; cy += 100; }
      ctx.fillStyle = i === 2 ? 'rgba(139, 92, 246, 0.3)' : colors.darkBorder;
      roundRect(ctx, cx, cy, 340, 80, 16);
      ctx.fill();
      if (i === 2) {
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 3;
        roundRect(ctx, cx, cy, 340, 80, 16);
        ctx.stroke();
      }
      ctx.fillStyle = colors.white;
      ctx.font = '28px Arial, sans-serif';
      ctx.fillText(cat[0] + ' ' + cat[1], cx + 30, cy + 52);
      cx += 380;
    });

    // Anonymous notice
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    roundRect(ctx, 100, 1320, width - 200, 120, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.lineWidth = 2;
    roundRect(ctx, 100, 1320, width - 200, 120, 20);
    ctx.stroke();
    ctx.fillStyle = '#a78bfa';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('ℹ️ Your confession will be 100% anonymous.', 140, 1395);

    // Buttons
    ctx.fillStyle = colors.darkBorder;
    roundRect(ctx, 100, 1500, 300, 80, 16);
    ctx.fill();
    ctx.fillStyle = colors.lightGray;
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText('Preview', 190, 1552);

    ctx.fillStyle = colors.primary;
    roundRect(ctx, width - 520, 1500, 420, 80, 16);
    ctx.fill();
    ctx.fillStyle = colors.white;
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText('Post Anonymously', width - 450, 1552);
  } else {
    // Comments view
    ctx.fillStyle = colors.darkCard;
    roundRect(ctx, 40, yOffset, width - 80, 600, 24);
    ctx.fill();

    // Category badge
    ctx.fillStyle = '#8b5cf630';
    roundRect(ctx, 80, yOffset + 30, 140, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#8b5cf6';
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('🤫 Secrets', 100, yOffset + 58);

    // Content
    ctx.fillStyle = colors.white;
    ctx.font = '32px Arial, sans-serif';
    ctx.fillText('I have been keeping a huge secret from', 80, yOffset + 140);
    ctx.fillText('everyone at work for the past 2 years...', 80, yOffset + 185);

    // Reactions
    let rx = 80;
    const reactions = ['42', '28', '15', '8', '3'];
    const emojis = ['👍', '💜', '🤔', '🔥', '😢'];
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = j === 1 ? 'rgba(139, 92, 246, 0.3)' : colors.darkBorder;
      roundRect(ctx, rx, yOffset + 280, 100, 50, 25);
      ctx.fill();
      if (j === 1) {
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        roundRect(ctx, rx, yOffset + 280, 100, 50, 25);
        ctx.stroke();
      }
      ctx.fillStyle = colors.white;
      ctx.font = '26px Arial, sans-serif';
      ctx.fillText(emojis[j] + ' ' + reactions[j], rx + 12, yOffset + 313);
      rx += 120;
    }

    // Comments section header
    yOffset += 680;
    ctx.fillStyle = colors.white;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText('Comments (24)', 60, yOffset);

    // Comment input
    yOffset += 40;
    ctx.fillStyle = colors.darkCard;
    roundRect(ctx, 40, yOffset, width - 80, 100, 20);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('Add an anonymous comment...', 80, yOffset + 60);
    ctx.fillStyle = colors.primary;
    roundRect(ctx, width - 180, yOffset + 15, 120, 70, 16);
    ctx.fill();
    ctx.fillStyle = colors.white;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText('Post', width - 145, yOffset + 60);

    // Comments
    yOffset += 140;
    const comments = [
      "You're not alone in this. I've been through similar.",
      "Sometimes secrets are necessary. Stay strong.",
      "Have you considered talking to someone about it?",
      "This resonated with me deeply.",
      "Two years is a long time. Hope you find peace."
    ];

    comments.forEach((comment, i) => {
      ctx.fillStyle = colors.darkCard;
      roundRect(ctx, 40, yOffset, width - 80, 180, 20);
      ctx.fill();

      ctx.fillStyle = colors.white;
      ctx.font = '28px Arial, sans-serif';
      ctx.fillText(comment, 80, yOffset + 70);

      ctx.fillStyle = '#64748b';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText((i + 1) + 'h ago', 80, yOffset + 130);

      // Comment reactions
      ctx.fillStyle = colors.darkBorder;
      roundRect(ctx, width - 220, yOffset + 100, 80, 40, 20);
      ctx.fill();
      ctx.fillStyle = colors.lightGray;
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText('💜 ' + (12 - i * 2), width - 200, yOffset + 128);

      yOffset += 210;
    });
  }

  // Floating action button (for screenshots 1 and 3)
  if (num !== 2) {
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.arc(width - 120, height - 200, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.white;
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.fillText('+', width - 142, height - 178);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(screenshotsDir, `${num}.png`), buffer);
  console.log(`Created: screenshots/${num}.png (1284x2778)`);
}

// Generate all images
console.log('Generating images for BaseConfess Mini App...\n');

generateIcon();
generateSplash();
generateHero();
generateScreenshot(1, 'Feed', 'Main feed with confessions');
generateScreenshot(2, 'Create', 'Create confession modal');
generateScreenshot(3, 'Comments', 'Comments section');

console.log('\nAll images generated successfully!');
console.log('\nImage specifications:');
console.log('- logo.png: 1024x1024 (PNG)');
console.log('- splash.png: 200x200 (PNG)');
console.log('- hero.png: 1200x630 (PNG)');
console.log('- embed.png: 1200x630 (PNG)');
console.log('- screenshots/1.png: 1284x2778 (PNG)');
console.log('- screenshots/2.png: 1284x2778 (PNG)');
console.log('- screenshots/3.png: 1284x2778 (PNG)');
