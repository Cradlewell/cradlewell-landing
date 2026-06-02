'use client'

import React from "react";
import { ArrowRight } from "lucide-react";
import { useModal } from './ModalContext';

const Blogbutton = () => {
	const { openModal } = useModal();
	return (
		<button
			type="button"
			onClick={() => openModal()}
			className="cw-pricing-cta"
			style={{ background: 'var(--cw-cta)', boxShadow: '0 4px 16px rgba(249,115,22,0.28)' }}
		>
			Book consultation
			<ArrowRight size={15} strokeWidth={2.25} />
		</button>
	);
};

export default Blogbutton;
