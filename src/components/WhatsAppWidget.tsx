// components/WhatsAppWidget.tsx
'use client';

import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppWidget: React.FC = () => {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).fbq) (window as any).fbq('track', 'Contact');
      if ((window as any).gtag) (window as any).gtag('event', 'contact', { event_category: 'whatsapp' });
    }
  };

  return (
    <a
      href="https://wa.me/919363893639"
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-widget"
      onClick={handleClick}
    >
      <FaWhatsapp size={28} />
    </a>
  );
};

export default WhatsAppWidget;
