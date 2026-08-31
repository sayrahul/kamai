'use client';

import React from 'react';

interface WhatsAppLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Meta 2-Color WhatsApp Vector Logo
 * Features standard #25D366 green bubble with authentic crisp white handset.
 */
export function WhatsAppLogo({ className = 'w-4 h-4', size }: WhatsAppLogoProps) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={size ? { width: size, height: size } : undefined}
      aria-label="WhatsApp"
    >
      <path
        d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.45 0 .09 5.36.09 11.95c0 2.1.55 4.16 1.6 5.97L0 24l6.23-1.63a11.9 11.9 0 0 0 5.8 1.5h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.19-3.47-8.44z"
        fill="#25D366"
      />
      <path
        d="M17.47 14.38c-.29-.15-1.75-.87-2.02-.97-.27-.1-.47-.15-.67.15-.2.29-.76.97-.93 1.17-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.35-1.45-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.08-.79.37-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.02.15.2 2.06 3.14 5 4.41.7.3 1.25.48 1.68.62.7.22 1.33.19 1.84.11.56-.08 1.73-.71 1.97-1.39.25-.68.25-1.27.17-1.39-.07-.13-.2-.2-.49-.35z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export const WhatsAppIcon = WhatsAppLogo;
export default WhatsAppLogo;
