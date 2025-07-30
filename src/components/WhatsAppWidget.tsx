// components/WhatsAppWidget.tsx
'use client';

import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppWidget: React.FC = () => {
  return (
    <a
      href="https://wa.me/919363893639"
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-widget"
    >
      <FaWhatsapp size={28} />
    </a>
  );
};

export default WhatsAppWidget;
