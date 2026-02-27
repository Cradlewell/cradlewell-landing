"use client";
import React from "react";
import { useModal } from './ModalContext';

const BackgroundBox = () => {
  const { openModal } = useModal();

  return (
    <>
      <div className="background-box text-white d-flex align-items-end">
        <div className="background-box-content">
          <p className="background-box-text">
            Book professional postnatal care from certified
            nurses — when you need it, where you need it.
          </p>
          <button
            onClick={openModal}
            className="background-box-btn"
          >
            Book Free Consultation
          </button>
        </div>
      </div>

      <style jsx>{`
        .background-box-content {
          position: relative;
          z-index: 2;
          padding: 24px 20px;
          width: 100%;
          background: transparent;
        }

        .background-box-text {
          font-size: 15px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.92);
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .background-box-btn {
          background-color: #ffffff;
          color: #5F47FF;
          border: none;
          border-radius: 10px;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          display: block;
        }

        @media (min-width: 768px) {
          .background-box-content {
            padding: 48px;
            max-width: 560px;
          }

          .background-box-text {
            font-size: 18px;
          }

          .background-box-btn {
            width: auto;
            display: inline-block;
          }
        }
      `}</style>
    </>
  );
};

export default BackgroundBox;
