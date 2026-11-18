
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '87.5rem'
			}
		},
		extend: {
			fontSize: {
				'4xs':    ['0.4375rem', { lineHeight: '0.625rem' }],
				'3xs':    ['0.5rem',    { lineHeight: '0.75rem' }],
				'2xs':    ['0.5625rem', { lineHeight: '0.875rem' }],
				'xxs':    ['0.625rem',  { lineHeight: '1rem' }],
				'tiny':   ['0.6875rem', { lineHeight: '1.1rem' }],
				'mini':   ['0.8125rem', { lineHeight: '1.4rem' }],
				'body':   ['0.9375rem', { lineHeight: '1.6rem' }],
				'reading':['1.0625rem', { lineHeight: '1.75rem' }],
			},
			spacing: {
				'0.25':  '0.0625rem',
				'0.375': '0.09375rem',
				'0.5':   '0.125rem',
				'0.75':  '0.1875rem',
				'1.25':  '0.3125rem',
				'4.5':   '1.125rem',
				'13':    '3.25rem',
				'15':    '3.75rem',
				'18':    '4.5rem',
				'25':    '6.25rem',
				'30':    '7.5rem',
			},
			maxWidth: {
				'page':    '87.5rem',
				'content': '100rem',
				'prose':   '65ch',
			},
			fontFamily: {
				'sans':      ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
				'display':   ['"Plus Jakarta Sans"', 'sans-serif'],
				'mono':      ['"JetBrains Mono"', 'monospace'],
				'mono-tech': ['"JetBrains Mono"', 'monospace'],
			},
			colors: {
				border:     'hsl(var(--border))',
				input:      'hsl(var(--input))',
				ring:       'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT:    'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT:    'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT:    'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT:    'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT:    'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT:    'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT:    'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// ─── Brand action color — SINGLE SOURCE OF TRUTH ───
				// #00CC6A
				revgreen: {
					DEFAULT: '#00CC6A',
					hover:   '#00b35e',
				},
				// Alias — components migrating from old brand name
				revhackers: {
					DEFAULT: '#00CC6A',
				},
			},
			borderRadius: {
				// System: 2px | 4px | 8px | 12px | 9999px
				'sm':   'var(--radius-sm)',
				DEFAULT:'var(--radius)',
				'md':   'var(--radius)',
				'lg':   'var(--radius-lg)',
				'xl':   'var(--radius-xl)',
				'2xl':  'var(--radius-xl)',
				'full': '9999px',
			},
			boxShadow: {
				// Functional only — zero glow, zero color
				'xs':  '0 1px 2px rgba(0,0,0,0.05)',
				'sm':  '0 2px 8px rgba(0,0,0,0.08)',
				'md':  '0 8px 24px rgba(0,0,0,0.10)',
				'lg':  '0 16px 40px rgba(0,0,0,0.12)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-up': {
					"0%":   { opacity: "0", transform: "translateY(16px)" },
					"100%": { opacity: "1", transform: "translateY(0)" }
				},
				'fade-in': {
					"0%":   { opacity: "0" },
					"100%": { opacity: "1" }
				},
				'slide-in': {
					"0%":   { opacity: "0", transform: "translateX(-8px)" },
					"100%": { opacity: "1", transform: "translateX(0)" }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up':   'accordion-up 0.2s ease-out',
				'fade-up':        'fade-up 0.4s ease-out forwards',
				'fade-in':        'fade-in 0.4s ease-out forwards',
				'slide-in':       'slide-in 0.3s ease-out forwards',
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
