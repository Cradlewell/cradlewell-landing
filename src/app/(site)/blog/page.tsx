import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { BLOG_POSTS } from "@/content/blog-posts";
import { pageOpenGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Newborn & Postnatal Care Blog | Expert Nursing Guides | Cradlewell Bangalore" },
  description:
    "Expert guides on newborn care, postnatal recovery, breastfeeding, jaundice monitoring, and mother & baby health — written by certified nurses at Cradlewell Bangalore.",
  alternates: {
    canonical: "https://www.cradlewell.com/blog",
  },
  openGraph: pageOpenGraph("/blog", {
    title: "Newborn & Postnatal Care Blog | Cradlewell Bangalore",
    description:
      "Expert nursing guides on newborn care, postnatal recovery, breastfeeding, and more from certified nurses at Cradlewell.",
  }),
};

export default function BlogPage() {
  return (
    <section style={{ padding: "64px 0 88px", background: "var(--cw-surface-page)" }}>
      <div className="container">
        <div className="text-center" style={{ marginBottom: 56 }}>
          <span className="section-eyebrow">From the team</span>
          <h1 style={{
            fontFamily: "var(--font-lexend), system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--cw-text-primary)",
            marginTop: 8,
            marginBottom: 12,
          }}>
            Care, gently explained
          </h1>
          <p style={{
            color: "var(--cw-text-secondary)",
            maxWidth: 520,
            margin: "0 auto",
            fontSize: "1rem",
            lineHeight: 1.65,
          }}>
            Guidance, care &amp; knowledge for every stage of motherhood — written by our nurses and clinical team.
          </p>
        </div>

        <div className="cw-blog-grid">
          {BLOG_POSTS.map((post, i) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="cw-blog-card">
              <div className="cw-blog-card-media">
                <Image
                  src={post.image}
                  alt=""
                  width={post.imageWidth}
                  height={post.imageHeight}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
                  priority={i === 0}
                />
              </div>
              <div className="cw-blog-card-body">
                <h2 className="cw-blog-card-title">{post.title}</h2>
                <p className="cw-blog-card-excerpt">{post.description}</p>
                <span className="cw-blog-card-cta">Read article →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
