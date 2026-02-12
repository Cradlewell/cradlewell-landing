'use client'

import React from "react";
import { useModal } from './ModalContext'; // adjust path if needed


const Blogbutton = () => {
	const { openModal } = useModal();
	return (
             <a onClick={openModal} className="btn btn-primary w-100 mt-2">
                Book Consultation
              </a>
	);
};

export default Blogbutton;
