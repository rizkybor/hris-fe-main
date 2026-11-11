/** @type {import('tailwindcss').Config} */

// Redesign tokens (HRIS+ v4.0, palette "B · Navy + Blue"). Colours are CSS
// variables holding RGB channels (see src/assets/css/input.css), so the
// same class works in light and -- later -- dark mode, and opacity
// modifiers like bg-ui-ink/10 keep working. Everything new lives under the
// "ui" prefix so it never collides with the existing classes.
const token = (name) => `rgb(var(--ui-${name}) / <alpha-value>)`;

export default {
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                },
                ui: {
                    bg: token('bg'),
                    surface: token('surface'),
                    subtle: token('subtle'),
                    hover: token('hover'),
                    line: token('line'),
                    'line-strong': token('line-strong'),
                    ink: token('ink'),
                    text: token('text'),
                    muted: token('muted'),
                    faint: token('faint'),
                    accent: token('accent'),
                    'accent-soft': token('accent-soft'),
                    ok: token('ok'),
                    'ok-soft': token('ok-soft'),
                    warn: token('warn'),
                    'warn-soft': token('warn-soft'),
                    bad: token('bad'),
                    'bad-soft': token('bad-soft'),
                    info: token('info'),
                    'info-soft': token('info-soft'),
                },
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            // Type scale: display 30 / h1 22 / h2 17 / h3 14 / body 14 /
            // small 13 / cap 12 / over 11 (uppercase labels).
            fontSize: {
                'ui-display': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '600' }],
                'ui-h1': ['22px', { lineHeight: '30px', letterSpacing: '-0.018em', fontWeight: '600' }],
                'ui-h2': ['17px', { lineHeight: '26px', letterSpacing: '-0.012em', fontWeight: '600' }],
                'ui-h3': ['14px', { lineHeight: '20px', fontWeight: '600' }],
                'ui-body': ['14px', { lineHeight: '20px' }],
                'ui-small': ['13px', { lineHeight: '18px' }],
                'ui-cap': ['12px', { lineHeight: '16px' }],
                'ui-over': ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
            },
            borderRadius: {
                'ui-control': '8px',
                'ui-card': '12px',
                'ui-modal': '16px',
                'ui-sheet': '20px',
            },
            boxShadow: {
                'ui-raised': '0 1px 2px rgb(15 27 45 / 0.06)',
                'ui-overlay': '0 24px 48px rgb(15 27 45 / 0.16)',
                'ui-focus': '0 0 0 3px rgb(31 91 216 / 0.16)',
            },
            // Motion: short, transform/opacity only (see the "Motion"
            // block in input.css). ease-ui-out for things entering,
            // ease-ui-in for things leaving.
            transitionTimingFunction: {
                'ui-out': 'cubic-bezier(0.2, 0, 0, 1)',
                'ui-in': 'cubic-bezier(0.4, 0, 1, 1)',
            },
            transitionDuration: {
                'ui-fast': '120ms',
                'ui-base': '180ms',
                'ui-slow': '240ms',
            },
        },
    },
    plugins: [],
}
