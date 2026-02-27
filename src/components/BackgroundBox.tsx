"use client";
import React from "react";
import { useModal } from './ModalContext';

const BackgroundBox = () => {
  const { openModal } = useModal();

  return (
    <>
      <div className="background-box-wrapper">
        <div className="background-box-inner">

          {/* Gradient Overlay */}
          <div className="background-box-overlay" />

          {/* Content */}
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
      </div>

      <style jsx>{`

        .background-box-wrapper {
          padding: 0 16px;
          margin-bottom: 0;
        }

        .background-box-inner {
          background-image: url('/images/img1.png');
          background-size: cover;
          background-position: center top;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          min-height: 260px;
          display: flex;
          align-items: flex-end;
        }

        .background-box-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(95, 71, 255, 0.95) 0%,
            rgba(99, 136, 255, 0.65) 55%,
            transparent 100%
          );
          border-radius: 20px;
          z-index: 1;
        }

        .background-box-content {
          position: relative;
          z-index: 2;
          padding: 28px 20px;
          width: 100%;
        }

        .background-box-text {
          font-size: 15px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.90);
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
        }

        /* Desktop */
        @media (min-width: 768px) {
          .background-box-wrapper {
            padding: 0 24px;
          }

          .background-box-inner {
            min-height: 360px;
            background-position: center center;
          }

          .background-box-content {
            padding: 48px;
            max-width: 560px;
          }

          .background-box-text {
            font-size: 18px;
          }

          .background-box-btn {
            width: auto;
            padding: 14px 36px;
            font-size: 16px;
          }
        }
      `}</style>
    </>
  );
};

export default BackgroundBox;
