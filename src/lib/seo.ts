import type { Metadata } from "next";

export const BASE_URL = "https://www.cradlewell.com";

const SHARE_IMAGE = {
  url: `${BASE_URL}/images/bannerimg.png`,
  width: 625,
  height: 525,
  alt: "Cradlewell nurse-led newborn and postnatal home care Bangalore",
};

const DEFAULT_TITLE = "Nurse-led Newborn & Postnatal Home Care in Bangalore | Cradlewell";
const DEFAULT_DESCRIPTION =
  "Certified nurses deliver hospital-grade postnatal and newborn care at home in Bangalore. ISO 9001 & 27001 certified. Winner, Entrepreneur India Startup Awards 2026. Trusted by 100+ families.";

// Share preview (Open Graph) for a page. A page's own openGraph replaces the
// root one completely, so every page builds it from here to keep the site
// name, locale and image while pointing at its own address.
export function pageOpenGraph(
  path: string,
  { title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, type = "website" as "website" | "article" } = {}
): Metadata["openGraph"] {
  return {
    type,
    locale: "en_IN",
    siteName: "Cradlewell",
    url: `${BASE_URL}${path}`,
    title,
    description,
    images: [SHARE_IMAGE],
  };
}

export const defaultOpenGraph = (): Metadata["openGraph"] => {
  const og = pageOpenGraph("/") as Record<string, unknown>;
  delete og.url; // inherited by pages that don't set their own
  return og as Metadata["openGraph"];
};
