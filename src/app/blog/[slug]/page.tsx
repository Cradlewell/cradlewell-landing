import Blogbutton from "@/components/Blogbutton";
import type { Metadata } from "next";

export const dynamic = "force-dynamic"; // 👈 ADD THIS

type Props = {
  params: Promise<{ slug: string }>;
};

/* ===========================
   🔹 Generate SEO Metadata
=========================== */
export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {

  const { slug } = await params;

  const wpUrl = `https://blog.cradlewell.com/${slug}`;

  const res = await fetch(
    `https://blog.cradlewell.com/wp-json/rankmath/v1/getHead?url=${wpUrl}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) return {};

  const seo = await res.json();
  if (!seo?.title) return {};

  // ✅ Clean title (remove blog branding if exists)
  const cleanTitle = seo.title
    .replace(" - blog.cradlewell.com", "")
    .replace("| blog.cradlewell.com", "")
    .trim();

  // ✅ Handle OG image (array or string)
  const ogImage =
    Array.isArray(seo?.og_image)
      ? seo.og_image[0]
      : seo?.og_image || null;

  return {
    title: cleanTitle,
    description: seo.description,

    alternates: {
      canonical: `https://www.cradlewell.com/blog/${slug}`,
    },

    openGraph: {
      title: cleanTitle,
      description: seo.description,
      url: `https://www.cradlewell.com/blog/${slug}`,
      images: ogImage ? [{ url: ogImage }] : [],
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title: cleanTitle,
      description: seo.description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

/* ===========================
   🔹 Blog Page Component
=========================== */
export default async function BlogPost({ params }: Props) {

  const { slug } = await params;

  const res = await fetch(
    `https://blog.cradlewell.com/wp-json/wp/v2/posts?slug=${slug}&_embed`,
    { cache: "no-store" }
  );

  const post = await res.json();

  if (!post.length) {
    return <div className="container py-5">Post not found</div>;
  }

  const blog = post[0];

  const featuredImage =
    blog._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title.rendered.replace(/<[^>]*>/g, ''),
    "datePublished": blog.date,
    "dateModified": blog.modified || blog.date,
    "author": {
      "@type": "Organization",
      "@id": "https://www.cradlewell.com/#organization",
      "name": "Cradlewell Care Team",
      "url": "https://www.cradlewell.com",
    },
    "publisher": { "@id": "https://www.cradlewell.com/#organization" },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.cradlewell.com/blog/${slug}`,
    },
    ...(featuredImage && {
      "image": {
        "@type": "ImageObject",
        "url": featuredImage,
      },
    }),
  };

  return (
    <div style={{ background: "var(--cw-surface-page)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />

      {/* HERO */}
      <section style={{
        background: "#fff",
        borderBottom: "1px solid rgba(17,17,16,0.06)",
        padding: "64px 0 56px",
      }}>
        <div className="container" style={{ maxWidth: 820, textAlign: "center" }}>
          <span className="section-eyebrow">Article</span>
          <h1
            style={{
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--cw-text-primary)",
              marginTop: 12,
              marginBottom: 16,
            }}
            dangerouslySetInnerHTML={{ __html: blog.title.rendered }}
          />
          <p style={{
            color: "var(--cw-text-muted)",
            fontSize: "0.92rem",
            fontFamily: "'Lexend', system-ui, sans-serif",
            fontWeight: 500,
            margin: 0,
            letterSpacing: "0.01em",
          }}>
            {new Date(blog.date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="container" style={{ padding: "56px 0 80px" }}>
        <div className="row g-4">

          {/* MAIN CONTENT */}
          <div className="col-lg-8">
            <article style={{
              background: "#fff",
              border: "1px solid rgba(17,17,16,0.06)",
              borderRadius: 18,
              padding: "40px 36px",
              boxShadow: "var(--cw-shadow-xs)",
            }}>
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: blog.content.rendered }}
              />
            </article>
          </div>

          {/* SIDEBAR */}
          <div className="col-lg-4">
            <div
              className="sticky-top"
              style={{
                background: "#fff",
                border: "1px solid rgba(17,17,16,0.06)",
                borderRadius: 18,
                padding: "28px 26px",
                boxShadow: "var(--cw-shadow-xs)",
                top: "100px",
              }}
            >
              <h4 style={{
                fontFamily: "'Lexend', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.05rem",
                letterSpacing: "-0.01em",
                color: "var(--cw-text-primary)",
                marginBottom: 8,
              }}>
                Need expert newborn &amp; mother care?
              </h4>
              <p style={{
                color: "var(--cw-text-secondary)",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.92rem",
                lineHeight: 1.55,
                marginBottom: 18,
              }}>
                Certified nurses provide professional at-home care for mother and baby.
              </p>

              <Blogbutton />
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
