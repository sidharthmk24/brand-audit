const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// Revert back to Dark Mode
css = css.replace(/--color-background: #ffffff;/g, '--color-background: #161616;');
css = css.replace(/--color-foreground: #111111;/g, '--color-foreground: #ffffff;');
css = css.replace(/--color-surface: #f9fafb;/g, '--color-surface: #1e1e1e;');
css = css.replace(/--color-surface-elevated: #f3f4f6;/g, '--color-surface-elevated: #242424;');
css = css.replace(/--color-border: rgba\(0, 0, 0, 0\.08\);/g, '--color-border: rgba(255, 255, 255, 0.08);');
css = css.replace(/--color-muted: #6d6d6d;/g, '--color-muted: #a1a1aa;');
css = css.replace(/color-scheme: light;/g, 'color-scheme: dark;');

css = css.replace(/background: rgba\(255, 255, 255, 0\.75\);/g, 'background: rgba(22, 22, 22, 0.75);');
css = css.replace(/border: 1px solid rgba\(0, 0, 0, 0\.08\);/g, 'border: 1px solid rgba(255, 255, 255, 0.08);');
css = css.replace(/background: rgba\(0, 0, 0, 0\.02\);/g, 'background: rgba(255, 255, 255, 0.03);');
css = css.replace(/border: 1px solid rgba\(0, 0, 0, 0\.1\);/g, 'border: 1px solid rgba(255, 255, 255, 0.08);');
css = css.replace(/border-color: rgba\(0, 0, 0, 0\.2\);/g, 'border-color: rgba(255, 255, 255, 0.12);');
css = css.replace(/background: rgba\(255, 255, 255, 1\);/g, 'background: rgba(255, 255, 255, 0.05);');

// Remove ALL Purple colors from original css and replace with Brand Reds
css = css.replace(/#8b5cf6/g, '#e31313'); // violet -> brand red
css = css.replace(/#06b6d4/g, '#ff4646'); // cyan -> lighter red
css = css.replace(/#d946ef/g, '#b80f0f'); // fuchsia -> darker red
css = css.replace(/#6366f1/g, '#ff7a7a'); // indigo -> light red
css = css.replace(/rgba\(139, 92, 246, /g, 'rgba(227, 19, 19, '); // violet rgba
css = css.replace(/rgba\(6, 182, 212, /g, 'rgba(255, 70, 70, '); // cyan rgba
css = css.replace(/rgba\(217, 70, 239, /g, 'rgba(184, 15, 15, '); // fuchsia rgba

fs.writeFileSync('app/globals.css', css);
console.log('Reverted to dark and removed purples!');
