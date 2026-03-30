"use client";

import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import ScrollReveal from "./ScrollReveal";

// Counts up from 0 to `end` when scrolled into view
function useCountUp(end: number, duration = 1600, decimals = 0) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setStarted(true); obs.disconnect(); }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * end;
      setVal(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, end, duration, decimals]);

  return { val, ref };
}

const StatCounter = ({
  end,
  suffix,
  label,
  decimals = 0,
  color,
}: {
  end: number;
  suffix: string;
  label: string;
  decimals?: number;
  color?: string;
}) => {
  const { val, ref } = useCountUp(end, 1800, decimals);
  return (
    <div ref={ref} className="text-center flex-fill px-2 px-md-3">
      <div
        className="stat-number"
        style={{
          fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
          color: color ?? "#0F172A",
          fontFamily: "'Lexend', system-ui, sans-serif",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        {decimals > 0 ? val.toFixed(decimals) : val}{suffix}
      </div>
      <div className="stat-label" style={{
        fontSize: "0.82rem",
        color: "#94A3B8",
        fontFamily: "'Lexend', system-ui, sans-serif",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
};

const HeroBelow = () => {
  return (
    <div className="py-5" id="whychoose" style={{ backgroundColor: "#ffffff" }}>
      <Container>
        <Row className="align-items-center">
          {/* Text */}
          <Col lg={6} className="mb-4 mb-lg-0 px-4">
            <ScrollReveal direction="left">
              <span className="section-eyebrow">Why Cradlewell</span>
              <h2 className="fw-bold mb-3">
                Designed for New{" "}
                <span className="primary-color">Moms</span>
                <br />
                <span className="primary-color">Who Deserve</span> to Breathe
              </h2>
              <p style={{ fontSize: "1.08rem", lineHeight: "1.75", maxWidth: 480 }}>
                Certified nurses visit your home so you can rest, recover, and bond
                with your baby — without the overwhelm of doing everything alone.
              </p>
            </ScrollReveal>
          </Col>

          {/* Animated stats panel */}
          <Col lg={6} className="px-4">
            <ScrollReveal direction="right" delay={100}>
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 20,
                  padding: "32px 16px",
                  border: "1px solid rgba(15,23,42,0.07)",
                }}
              >
                <div className="d-flex align-items-center justify-content-center">
                  <StatCounter end={100} suffix="+" label="Families Served" />
                  <div style={{ width: 1, height: 52, background: "rgba(15,23,42,0.10)", flexShrink: 0 }} />
                  <StatCounter end={4.8} suffix="★" label="Customer Rating" decimals={1} color="#F97316" />
                  <div style={{ width: 1, height: 52, background: "rgba(15,23,42,0.10)", flexShrink: 0 }} />
                  <StatCounter end={40} suffix="+" label="Years Experience" />
                </div>
              </div>
            </ScrollReveal>
          </Col>
        </Row>

        {/* Full-width image */}
        <ScrollReveal direction="up" delay={150}>
          <div
            className="mt-5"
            style={{
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(15,23,42,0.09)",
            }}
          >
            <img
              className="img-fluid"
              src="/images/img1.png"
              alt="Professional Nurse Providing Newborn and Postnatal Home Care Services to Mother and Baby in Bangalore"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        </ScrollReveal>
      </Container>
    </div>
  );
};

export default HeroBelow;
