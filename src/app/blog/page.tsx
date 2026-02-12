import Link from "next/link";

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
  const res = await fetch(
    `${process.env.WORDPRESS_API}/posts?_embed&per_page=9`,
    { next: { revalidate: 60 } }
  );
  return res.json();
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <section className="py-4 bg-light">
      <div className="container">
        <div className="text-center mb-5">
          <h1 className="fw-semibold">Our Blogs</h1>
          <p className="text-muted">
            Guidance, care & knowledge for every stage of motherhood
          </p>
        </div>

        <div className="row g-4">
          {posts.map((post) => {
            const image =
              post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

            return (
              <div className="col-md-6 col-lg-4" key={post.id}>
                <div className="card h-100 border-0 shadow-sm rounded-4">
                  {image && (
                    <img
                      src={image}
                      className="card-img-top rounded-top-4"
                      alt={post.title.rendered}
                      style={{ height: "220px", objectFit: "cover" }}
                    />
                  )}

                  <div className="card-body p-4">
                    <h5
                      className="card-title fw-semibold"
                      dangerouslySetInnerHTML={{
                        __html: post.title.rendered,
                      }}
                    />

                    <div
                      className="card-text text-muted small mb-3"
                      dangerouslySetInnerHTML={{
                        __html: post.excerpt.rendered,
                      }}
                    />

                    <Link
                      href={`/blog/${post.slug}`}
                      className="stretched-link text-decoration-none fw-medium"
                      style={{ color: "#007A83" }}
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
