import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        headline: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        code: ['monospace'],
      },
      fontSize: {
        // Grace Hub Typography Scale - PT Sans optimized
        'display-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.025em' }], // 36px - Bold, tight
        'headline-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }], // 24px - Bold
        'title-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '700' }], // 20px - Bold  
        'body-std': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }], // 14px - Regular, relaxed
        'micro': ['0.625rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '0.1em' }], // 10px - Bold, Uppercase
      },
      colors: {
        // Azure Sanctuary Surface Hierarchy
        surface: {
          DEFAULT: 'hsl(var(--background))', // #f5faff - Base
          low: 'hsl(207 100% 96%)', // #e9f5ff - Surface Container Low
          lowest: 'hsl(0 0% 100%)', // #ffffff - Surface Container Lowest (cards)
        },
        'on-surface': {
          DEFAULT: 'hsl(205 100% 10%)', // #001d32 - Primary text
          variant: 'hsl(210 10% 28%)', // #404850 - Secondary text
        },
        // Semantic colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(207 89% 68%)', // #64b5f6
          dark: 'hsl(199 100% 30%)', // #006398
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        // Azure Sanctuary - Soft corners
        'xs': '0.25rem',    // 4px
        'sm': '0.375rem',   // 6px - Minimum for small elements
        DEFAULT: '0.75rem', // 12px
        'md': '0.75rem',    // 12px  
        'lg': '1rem',       // 16px - Bento cards
        'xl': '1.5rem',     // 24px - Major containers
        '2xl': '2rem',      // 32px
      },
      boxShadow: {
        // Azure Sanctuary - Ambient Blue-Tinted Shadows
        'sanctuary-sm': '0 1px 2px 0 rgba(0, 69, 108, 0.05)',
        'sanctuary': '0 1px 3px 0 rgba(0, 69, 108, 0.06), 0 1px 2px -1px rgba(0, 69, 108, 0.06)',
        'sanctuary-md': '0 4px 6px -1px rgba(0, 69, 108, 0.07), 0 2px 4px -2px rgba(0, 69, 108, 0.07)',
        'sanctuary-lg': '0 10px 15px -3px rgba(0, 69, 108, 0.08), 0 4px 6px -4px rgba(0, 69, 108, 0.08)',
        'sanctuary-xl': '0 20px 25px -5px rgba(0, 69, 108, 0.08), 0 8px 10px -6px rgba(0, 69, 108, 0.08)',
        'sanctuary-2xl': '0 25px 50px -12px rgba(0, 69, 108, 0.15)',
        'bento': '0 25px 50px -12px rgba(0, 69, 108, 0.08)', // For large cards
        'glass': '0 8px 32px rgba(0, 69, 108, 0.12)',
      },
      backgroundImage: {
        // Cerulean Glow Gradient
        'cerulean-glow': 'linear-gradient(135deg, hsl(199 100% 30%) 0%, hsl(207 89% 68%) 100%)',
        'cerulean-glow-hover': 'linear-gradient(135deg, hsl(199 100% 25%) 0%, hsl(207 89% 60%) 100%)',
        'nav-active': 'linear-gradient(90deg, hsl(199 100% 30%) 0%, hsl(207 100% 96%) 100%)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
