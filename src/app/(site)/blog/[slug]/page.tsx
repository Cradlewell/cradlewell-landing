import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Blogbutton from "@/components/Blogbutton";
import { BLOG_POSTS, getPost } from "@/content/blog-posts";
import { BASE_URL } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

// Every article is built ahead of time from src/content/blog-posts.ts; any
// other address under /blog/ is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `${BASE_URL}/blog/${post.slug}`;
  const image = `${BASE_URL}${post.image}`;
  const title = post.title.includes("Cradlewell") ? post.title : `${post.title} | Cradlewell`;
  return {
    title: { absolute: title },
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "en_IN",
      siteName: "Cradlewell",
      url,
      title,
      description: post.description,
      publishedTime: post.published,
      modifiedTime: post.updated,
      images: [{ url: image, width: post.imageWidth, height: post.imageHeight, alt: post.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.description,
      images: [image],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${BASE_URL}/blog/${post.slug}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.updated,
      author: {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "Cradlewell Care Team",
        url: BASE_URL,
      },
      publisher: { "@id": `${BASE_URL}/#organization` },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: { "@type": "ImageObject", url: `${BASE_URL}${post.image}`, width: post.imageWidth, height: post.imageHeight },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <div style={{ background: "var(--cw-surface-page)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

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
              fontFamily: "var(--font-lexend), system-ui, sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--cw-text-primary)",
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            {post.title}
          </h1>
          <p style={{
            color: "var(--cw-text-muted)",
            fontSize: "0.92rem",
            fontFamily: "var(--font-lexend), system-ui, sans-serif",
            fontWeight: 500,
            margin: 0,
            letterSpacing: "0.01em",
          }}>
            <time dateTime={post.published}>
              {new Date(post.published).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </time>
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
              <Image
                src={post.image}
                alt={post.imageAlt}
                width={post.imageWidth}
                height={post.imageHeight}
                sizes="(max-width: 992px) 100vw, 700px"
                priority
                style={{ width: "100%", height: "auto", borderRadius: 12, marginBottom: 28 }}
              />
              {/* The article body is our own HTML from src/content, not outside input. */}
              <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.html }} />
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
              <h2 style={{
                fontFamily: "var(--font-lexend), system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.05rem",
                letterSpacing: "-0.01em",
                color: "var(--cw-text-primary)",
                marginBottom: 8,
              }}>
                Need expert newborn &amp; mother care?
              </h2>
              <p style={{
                color: "var(--cw-text-secondary)",
                fontFamily: "var(--font-source-sans), system-ui, sans-serif",
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
