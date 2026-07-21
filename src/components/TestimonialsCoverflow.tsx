'use client';

import {
    useState,
    useEffect,
    useCallback,
    useRef,
    type CSSProperties,
} from 'react';

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
const SIDE_TILT = 8;
const GAP = 8;
const OPACITY = 60; // inactive visibility %
const DUR = 0.6;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const AUTOPLAY_MS = 3500;

export default function TestimonialsCoverflow({ items }: { items: Testimonial[] }) {
    const n = items.length;
    const [active, setActive] = useState(0);
    const [cardW, setCardW] = useState(400);
    const cardH = 460;

    // Responsive card width — never wider than the viewport minus breathing room.
    useEffect(() => {
        const update = () => setCardW(Math.max(260, Math.min(400, window.innerWidth - 72)));
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
    const dim = 1 - Math.max(0, Math.min(100, OPACITY)) / 100;

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
                        borderRadius: 20,
                        overflow: 'hidden',
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'center center',
                        transform: `translate(-50%, -50%) translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
                        transition: transitionCss,
                        opacity: visible ? 1 : 0,
                        cursor: isActive ? 'default' : 'pointer',
                        pointerEvents: visible ? 'auto' : 'none',
                        backgroundColor: '#1a1a1a',
                    };

                    return (
                        <div
                            key={i}
                            style={cardStyle}
                            onClick={() => handleCardClick(i)}
                            aria-label={`Testimonial from ${t.name}`}
                            aria-hidden={!visible}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={t.image}
                                alt={t.name}
                                draggable={false}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center top',
                                    display: 'block',
                                    userSelect: 'none',
                                }}
                            />

                            {/* Gradient for legibility */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.78) 100%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Title — name + location, bottom-left */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 24,
                                    right: 24,
                                    bottom: 22,
                                    pointerEvents: 'none',
                                }}
                            >
                                <div style={{ color: '#FBBF24', fontSize: '0.95rem', letterSpacing: 2, marginBottom: 8 }}>★★★★★</div>
                                <span
                                    style={{
                                        display: 'block',
                                        color: '#ffffff',
                                        fontFamily: "'Lexend', system-ui, sans-serif",
                                        fontSize: 26,
                                        fontWeight: 700,
                                        lineHeight: '1.1em',
                                        letterSpacing: '-0.02em',
                                        textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    {t.name}
                                </span>
                                <span
                                    style={{
                                        display: 'block',
                                        marginTop: 4,
                                        color: 'rgba(255,255,255,0.82)',
                                        fontFamily: "'Lexend', system-ui, sans-serif",
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}
                                >
                                    {t.location} · Verified Parent
                                </span>
                            </div>

                            {/* Dim overlay — darkens inactive cards */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: '#000000',
                                    opacity: isActive ? 0 : dim,
                                    transition: `opacity ${DUR}s ${EASE}`,
                                    pointerEvents: 'none',
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
