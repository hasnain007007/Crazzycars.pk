import Link from "next/link";
import InfoBarMobile from "./InfoBarMobile";
import { isPostgresCatalog } from "@/lib/pg/enabled";

async function getInfoBarPages() {
  try {
    if (isPostgresCatalog()) {
      const { pgListInfoBarPages } = await import("@/lib/pg/catalog");
      return await pgListInfoBarPages();
    }
    const { dbConnect } = await import("@/lib/db");
    const { default: Page } = await import("@/lib/models/Page.model");

    await dbConnect();

    const pages = await Page.find({
      status: "published",
      showInInfoBar: true,
    })
      .select("title slug externalUrl openInNewTab sortOrder")
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return JSON.parse(JSON.stringify(pages || []));
  } catch {
    return [];
  }
}

export default async function InfoBar({ currentSlug }) {
  let pages = [];

  try {
    pages = await getInfoBarPages();
  } catch {
    return null;
  }

  if (!pages || pages.length === 0) return null;

  return (
    <>
      <div className="infobar-desktop">
        <div
          className="infobar-root"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#111111",
              padding: "12px 16px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Information
            </span>
          </div>

          <ul
            className="infobar-link-list"
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {pages.map((page, i) => {
              const isActive = currentSlug === page.slug;
              return (
                <li
                  key={String(page._id || page.id || page.slug)}
                  style={{
                    borderBottom: i < pages.length - 1 ? "1px solid #F0F0F0" : "none",
                  }}
                >
                  <Link
                    href={`/${page.slug}`}
                    className={isActive ? "infobar-item infobar-item-active" : "infobar-item"}
                  >
                    <span
                      style={{
                        marginRight: 8,
                        color: isActive ? "#C6633B" : "#CCCCCC",
                        fontSize: 10,
                      }}
                    >
                      {isActive ? "▶" : "›"}
                    </span>
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="infobar-mobile">
        <InfoBarMobile pages={pages} currentSlug={currentSlug} />
      </div>
    </>
  );
}
