import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newborn & Postnatal Care Blog | Expert Nursing Guides | Cradlewell Bangalore",
  description:
    "Expert guides on newborn care, postnatal recovery, breastfeeding, jaundice monitoring, and mother & baby health — written by certified nurses at Cradlewell Bangalore.",
  alternates: {
    canonical: "https://www.cradlewell.com/blog",
  },
  openGraph: {
    title: "Newborn & Postnatal Care Blog | Cradlewell Bangalore",
    description:
      "Expert nursing guides on newborn care, postnatal recovery, breastfeeding, and more from certified nurses at Cradlewell.",
    url: "https://www.cradlewell.com/blog",
    type: "website",
  },
};

type WPPost = {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string }[];
  };
};

async function getPosts(): Promise<WPPost[]> {
  const api = process.env.WORDPRESS_API;
  if (!api) return [];
  try {
    const res = await fetch(`${api}/posts?_embed&per_page=9`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <section style={{ padding: "64px 0 88px", background: "var(--cw-surface-page)" }}>
      <div className="container">
        <div className="text-center" style={{ marginBottom: 56 }}>
          <span className="section-eyebrow">From the team</span>
          <h1 style={{
            fontFamily: "'Lexend', system-ui, sans-serif",
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
          {posts.map((post) => {
            const image = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="cw-blog-card"
              >
                {image && (
                  <div className="cw-blog-card-media">
                    <img src={image} alt="" />
                  </div>
                )}
                <div className="cw-blog-card-body">
                  <h3
                    className="cw-blog-card-title"
                    dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                  />
                  <div
                    className="cw-blog-card-excerpt"
                    dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
                  />
                  <span className="cw-blog-card-cta">Read article →</span>
                </div>
              </Link>
            );
          })}
        </div>

        {posts.length === 0 && (
          <p style={{
            textAlign: "center",
            color: "var(--cw-text-muted)",
            fontSize: "0.95rem",
            marginTop: 24,
          }}>
            New articles coming soon.
          </p>
        )}
      </div>
    </section>
  );
}
