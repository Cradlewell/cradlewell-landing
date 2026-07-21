'use client';

import {
    useState,
    useEffect,
    useCallback,
    useRef,
    type CSSProperties,
} from 'react';
import Image from 'next/image';

export interface Testimonial {
    name: string;
    text: string;
    image: string;
    location: string;
}

// Fixed 3D internals — in a preserve-3d context paint order follows 3D
// position, so the centre card is pushed nearest the viewer and neighbours
// fall back behind it.
const PERSPECTIVE = 1600;
const SCALE_STEP = 0.16;
const MAX_VISIBLE = 2;
const DEPTH = 240;
const TILT = 12;
const SIDE_TILT = 6;
const GAP = 6;
const VEIL = 'rgba(249,248,246,0.55)'; // matches the section background
const DUR = 0.6;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const AUTOPLAY_MS = 4500;

const GoogleG = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function TestimonialsCoverflow({ items }: { items: Testimonial[] }) {
    const n = items.length;
    const [active, setActive] = useState(0);
    const [cardW, setCardW] = useState(360);
    const cardH = 460;

    // Responsive card width — never wider than the viewport minus breathing room.
    useEffect(() => {
        const update = () => setCardW(Math.max(250, Math.min(360, window.innerWidth - 72)));
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // Keep active valid if the list changes.
    useEffect(() => {
        setActive((a) => Math.max(0, Math.min(n - 1, a)));
    }, [n]);

    // Lock input while a card is mid-move so rapid clicks/keys don't stack.
    const lockRef = useRef(false);
    const lock = useCallback(() => {
        lockRef.current = true;
        window.setTimeout(() => { lockRef.current = false; }, Math.max(50, DUR * 1000));
    }, []);

    const step = useCallback(
        (dir: number) => {
            if (lockRef.current || n < 2) return;
            lock();
            setActive((a) => (((a + dir) % n) + n) % n);
        },
        [n, lock]
    );

    const handleCardClick = useCallback(
        (i: number) => {
            if (lockRef.current) return;
            lock();
            setActive((a) => (i === a ? (a + 1) % n : i));
        },
        [n, lock]
    );

    // Gentle autoplay — pauses while the pointer is over the gallery.
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        if (n < 2 || paused) return;
        const id = window.setInterval(() => step(1), AUTOPLAY_MS);
        return () => window.clearInterval(id);
    }, [n, paused, step]);

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        },
        [step]
    );

    const transitionCss = `transform ${DUR}s ${EASE}, opacity ${DUR}s ${EASE}`;

    const rootStyle: CSSProperties = {
        position: 'relative',
        width: '100%',
        height: cardH + 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: `${PERSPECTIVE}px`,
        overflow: 'hidden',
        outline: 'none',
    };

    return (
        <div>
            <div
                style={rootStyle}
                tabIndex={0}
                role="group"
                aria-roledescription="carousel"
                aria-label="Parent testimonials"
                onKeyDown={onKeyDown}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                <div
                    style={{
                        position: 'relative',
                        width: cardW,
                        height: cardH,
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {items.map((t, i) => {
                        let rel = i - active;
                        if (rel > n / 2) rel -= n;
                        if (rel < -n / 2) rel += n;
                        const ax = Math.abs(rel);
                        const visible = ax <= MAX_VISIBLE;
                        const isActive = rel === 0;
                        const sc = Math.max(0.4, 1 - ax * SCALE_STEP);
                        const tx = rel * (GAP * 30);
                        const tz = -ax * DEPTH;
                        const ry = -rel * TILT;
                        const rz = rel * SIDE_TILT;

                        const cardStyle: CSSProperties = {
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: cardW,
                            height: cardH,
                            borderRadius: 22,
                            overflow: 'hidden',
                            transformStyle: 'preserve-3d',
                            transformOrigin: 'center center',
                            transform: `translate(-50%, -50%) translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
                            transition: transitionCss,
                            opacity: visible ? 1 : 0,
                            cursor: isActive ? 'default' : 'pointer',
                            pointerEvents: visible ? 'auto' : 'none',
                            background: '#ffffff',
                            border: '1px solid rgba(15,23,42,0.06)',
                            boxShadow: isActive
                                ? '0 30px 70px -20px rgba(15,23,42,0.28)'
                                : '0 16px 40px -24px rgba(15,23,42,0.25)',
                        };

                        return (
                            <div
                                key={i}
                                style={cardStyle}
                                onClick={() => handleCardClick(i)}
                                aria-label={`Testimonial from ${t.name}`}
                                aria-hidden={!visible}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        padding: '30px 28px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    {/* Stars + Google badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                                        <div style={{ color: '#F59E0B', fontSize: '1rem', letterSpacing: 2 }}>★★★★★</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F1F0ED', borderRadius: 6, padding: '4px 8px' }}>
                                            <GoogleG />
                                            <span style={{ fontSize: '0.68rem', fontFamily: "'Lexend', system-ui", fontWeight: 600, color: '#64748B' }}>
                                                Google Review
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quote */}
                                    <p style={{
                                        flex: 1,
                                        margin: 0,
                                        fontFamily: "'Source Sans 3', system-ui, sans-serif",
                                        fontSize: '1.02rem',
                                        fontWeight: 500,
                                        lineHeight: 1.6,
                                        color: '#1E293B',
                                        overflow: 'hidden',
                                    }}>
                                        &ldquo;{t.text}&rdquo;
                                    </p>

                                    {/* Author */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                                        <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                            <Image
                                                src={t.image}
                                                alt={t.name}
                                                width={46}
                                                height={46}
                                                draggable={false}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontFamily: "'Lexend', system-ui, sans-serif", fontWeight: 700, fontSize: '0.94rem', color: '#0F172A', letterSpacing: '-0.005em' }}>
                                                {t.name}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', color: '#94A3B8', fontFamily: "'Lexend', system-ui", fontWeight: 500 }}>
                                                {t.location} · Verified Parent
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Veil — recedes inactive cards into the background */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: VEIL,
                                    opacity: isActive ? 0 : 1,
                                    transition: `opacity ${DUR}s ${EASE}`,
                                    pointerEvents: 'none',
                                }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            {n > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 8 }}>
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        aria-label="Previous testimonial"
                        style={arrowStyle}
                    >
                        ‹
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {items.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => { if (!lockRef.current) { lock(); setActive(i); } }}
                                aria-label={`Go to testimonial ${i + 1}`}
                                aria-current={i === active}
                                style={{
                                    width: i === active ? 22 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    background: i === active ? '#5F47FF' : 'rgba(95,71,255,0.25)',
                                    transition: 'width 0.3s, background 0.3s',
                                }}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        aria-label="Next testimonial"
                        style={arrowStyle}
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
}

const arrowStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1px solid rgba(95,71,255,0.2)',
    background: '#ffffff',
    color: '#5F47FF',
    fontSize: '1.4rem',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
};
