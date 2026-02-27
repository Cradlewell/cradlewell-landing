import Blogbutton from "@/components/Blogbutton";
import { ModalProvider } from "@/components/ModalContext";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

/* ===========================
   🔹 Generate SEO Metadata
=========================== */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const wpUrl = `https://blog.cradlewell.com/${slug}`;

  const res = await fetch(
    `https://blog.cradlewell.com/wp-json/rankmath/v1/getHead?url=${wpUrl}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) return {};

  const seo = await res.json();
  if (!seo?.title) return {};

  const cleanTitle = seo.title
    .replace(" - blog.cradlewell.com", "")
    .replace("| blog.cradlewell.com", "")
    .trim();

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

  return (
    <div className="bg-light">

      {/* HERO SECTION */}
      <section className="bg-white py-5 border-bottom">
        <div className="container text-center">

          {/* Title */}
          <h1
            className="display-5 fw-bold"
            dangerouslySetInnerHTML={{ __html: blog.title.rendered }}
          />

          {/* Date */}
          <p className="text-muted mt-3 mb-1">
            {new Date(blog.date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          {/* Byline */}
          <p style={{
            fontSize: "14px",
            color: "#6388FF",
            fontWeight: "600",
            marginBottom: "0",
          }}>
            By Cradlewell Care Team | Postnatal &amp; Neonatal Care Specialists, Bangalore
          </p>

        </div>
      </section>

      {/* FEATURED IMAGE */}
      {featuredImage && (
        <div className="container my-4">
          <img
            src={featuredImage}
            alt={blog.title.rendered}
            className="img-fluid rounded shadow-sm w-100"
            style={{ maxHeight: "500px", objectFit: "cover" }}
          />
        </div>
      )}

      {/* CONTENT SECTION */}
      <section className="container my-5">
        <div className="row">

          {/* MAIN CONTENT */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm p-4">
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: blog.content.rendered }}
              />
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="col-lg-4 mt-4 mt-lg-0">
            <div
              className="card border-0 shadow-sm p-4 sticky-top"
              style={{ top: "100px" }}
            >
              <h5 className="fw-bold mb-3">
                Need Expert Newborn &amp; Mother Care?
              </h5>
              <p className="text-muted small">
                Get professional at-home care services for mother and baby.
              </p>
              <ModalProvider>
                <Blogbutton />
              </ModalProvider>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
