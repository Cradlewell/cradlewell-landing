'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, type PanInfo, type Transition } from 'framer-motion';

export interface SwipeCard {
    src: string;
    alt: string;
}

// Fixed (formerly controls):
const PERSPECTIVE = 1000; // px
const DEPTH_SPACING = 10; // px

// Card geometry per breakpoint — images are 9:16, so height tracks width.
const LAYOUTS = {
    sm: { cardWidth: 216, xOffset: 86, tiltAngle: -30 },
    md: { cardWidth: 270, xOffset: 148, tiltAngle: -38 },
    lg: { cardWidth: 315, xOffset: 200, tiltAngle: -45 },
};
const ASPECT = 16 / 9;

function useLayout() {
    const [layout, setLayout] = useState(LAYOUTS.lg);

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            setLayout(w < 640 ? LAYOUTS.sm : w < 1024 ? LAYOUTS.md : LAYOUTS.lg);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return layout;
}

interface CardStackProps {
    images?: SwipeCard[];
    /** Falls back to the responsive breakpoint width. */
    cardWidth?: number;
    /** Falls back to cardWidth × 16/9 so the letters are never cropped. */
    cardHeight?: number;
    /** 0–20 slider: 0 is boxy, 20 is fully rounded. */
    cardRadius?: number;
    swipeThreshold?: number;
    tiltAngle?: number;
    tiltAngleStart?: number;
    xOffset?: number;
    transition?: Transition;
}

export default function TestimonialsSwipeStack({
    images = [],
    cardWidth: cardWidthProp,
    cardHeight: cardHeightProp,
    cardRadius = 4,
    swipeThreshold = 50,
    tiltAngleStart = 0,
    tiltAngle: tiltAngleProp,
    xOffset: xOffsetProp,
    transition = { type: 'spring', stiffness: 300, damping: 30 },
}: CardStackProps) {
    const layout = useLayout();
    const cardWidth = cardWidthProp ?? layout.cardWidth;
    const cardHeight = cardHeightProp ?? Math.round(cardWidth * ASPECT);
    const xOffset = xOffsetProp ?? layout.xOffset;
    const tiltAngle = tiltAngleProp ?? layout.tiltAngle;

    const imgs = images;
    const actualCardCount = imgs.length;

    const [cards, setCards] = useState(() =>
        Array.from({ length: actualCardCount }, (_, i) => ({
            id: i + 1,
            content: `Card ${i + 1}`,
            imageIndex: i,
        }))
    );

    const [isPressed, setIsPressed] = useState(false);
    const [shouldReturnToCenter, setShouldReturnToCenter] = useState(false);

    useEffect(() => {
        setCards((prevCards) => {
            if (prevCards.length !== actualCardCount) {
                return Array.from({ length: actualCardCount }, (_, i) => ({
                    id: i + 1,
                    content: `Card ${i + 1}`,
                    imageIndex: i,
                }));
            }
            return prevCards;
        });
    }, [actualCardCount]);

    const handlePointerDown = () => setIsPressed(true);
    const handlePointerUp = () => setIsPressed(false);

    const advance = () => {
        setCards((prevCards) => {
            const [topCard, ...restCards] = prevCards;
            return [...restCards, topCard];
        });
    };

    const handleDragEnd = (info: PanInfo) => {
        setIsPressed(false);
        const { offset } = info;
        const distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
        if (distance > swipeThreshold) {
            advance();
        } else {
            setShouldReturnToCenter(true);
            setTimeout(() => setShouldReturnToCenter(false), 1000);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            advance();
        }
    };

    const getCardStyle = (index: number) => {
        const totalCards = cards.length;
        const stackOffset = index * 8;
        const scaleValue = 1 - index * 0.05;
        const rotationValue =
            totalCards > 1
                ? tiltAngleStart +
                  (index / (totalCards - 1)) * (tiltAngle - tiltAngleStart)
                : tiltAngleStart;
        const xOffsetValue =
            totalCards > 1 ? (index / (totalCards - 1)) * xOffset : 0;
        const depthOffset = index * DEPTH_SPACING;
        const isTopCard = index === 0;
        const shouldReturn = isTopCard && shouldReturnToCenter;

        return {
            zIndex: cards.length - index,
            scale: scaleValue,
            x: shouldReturn ? 0 : xOffsetValue,
            y: shouldReturn ? 0 : -stackOffset,
            rotate: shouldReturn ? 0 : rotationValue,
            z: -depthOffset,
            opacity: 1,
        };
    };

    // Radius slider 0–20 → 0 (boxy) up to half the smaller side (fully rounded).
    const radiusPx = (cardRadius / 20) * (Math.min(cardWidth, cardHeight) / 2);

    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                perspective: `${PERSPECTIVE}px`,
                // Room for the fanned-out, rotated cards.
                minHeight: cardHeight + 140,
                padding: '40px 0 8px',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: cardWidth,
                    height: cardHeight,
                    transformStyle: 'preserve-3d',
                    // Recentre the fan, which spreads to the right by xOffset.
                    transform: `translateX(${-xOffset / 2}px)`,
                }}
            >
                {cards.map((card, index) => {
                    const isTopCard = index === 0;
                    const cardStyle = getCardStyle(index);
                    const cardImage = imgs[card.imageIndex];

                    return (
                        <motion.div
                            key={card.id}
                            drag={isTopCard}
                            dragConstraints={{
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                            }}
                            dragElastic={0.7}
                            dragMomentum={false}
                            dragTransition={{
                                bounceStiffness: 300,
                                bounceDamping: 20,
                            }}
                            onMouseDown={isTopCard ? handlePointerDown : undefined}
                            onMouseUp={isTopCard ? handlePointerUp : undefined}
                            onDragEnd={isTopCard ? (_, info) => handleDragEnd(info) : undefined}
                            animate={cardStyle}
                            transition={{
                                x: transition,
                                y: transition,
                                rotate: transition,
                                scale: transition,
                                zIndex: { duration: 0.3, ease: 'easeOut' },
                                z: { duration: 0.3, ease: 'easeOut' },
                            }}
                            initial={false}
                            whileDrag={{
                                scale: 1.05,
                                rotate: tiltAngleStart,
                                zIndex: 1000,
                            }}
                            tabIndex={isTopCard ? 0 : -1}
                            role={isTopCard ? 'button' : undefined}
                            aria-label={
                                isTopCard && cardImage
                                    ? `${cardImage.alt}. Swipe or press Enter for the next testimonial.`
                                    : undefined
                            }
                            onKeyDown={isTopCard ? onKeyDown : undefined}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                backgroundColor: cardImage
                                    ? '#EDF3FA'
                                    : 'rgba(243, 239, 255, 0.8)',
                                borderRadius: radiusPx,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                fontWeight: 300,
                                fontFamily: 'system-ui',
                                color: '#9967FF',
                                boxShadow: isTopCard
                                    ? '0 22px 50px rgba(15,23,42,0.20)'
                                    : '0 14px 30px rgba(15,23,42,0.12)',
                                cursor: isTopCard ? (isPressed ? 'grabbing' : 'grab') : 'default',
                                userSelect: 'none',
                                overflow: 'hidden',
                                outlineOffset: 3,
                                border: cardImage ? 'none' : '1.5px solid #9967FF',
                            }}
                        >
                            {cardImage ? (
                                <Image
                                    src={cardImage.src}
                                    alt={cardImage.alt}
                                    fill
                                    draggable={false}
                                    sizes="(max-width: 640px) 220px, (max-width: 1024px) 280px, 320px"
                                    style={{ objectFit: 'cover', pointerEvents: 'none' }}
                                />
                            ) : (
                                <p
                                    style={{
                                        fontSize: 14,
                                        color: '#9967FF',
                                        padding: 20,
                                        textAlign: 'center',
                                    }}
                                >
                                    {card.content} — Add images in Content
                                </p>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

TestimonialsSwipeStack.displayName = 'Swipe Card Stack';
