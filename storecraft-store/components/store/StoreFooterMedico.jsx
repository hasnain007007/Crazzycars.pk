'use client'

import Link from 'next/link'
import { normalizeStoreEmail } from '@/lib/storeContact'
import { resolveStoreLogoUrl, trimmedLogoUrl } from '@/lib/storeLogo'
import { rewriteStorePath } from '@/lib/categoryHandleAliases'
import { FooterCategoriesColumn } from "./FooterCategoriesColumn"

const DEFAULT_SHOP_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Shop by Car", href: "/cars" },
  { label: "Categories", href: "/categories" },
  { label: "Blog", href: "/blogs" },
]
const DEFAULT_CUSTOMER_CARE_LINKS = [
  { label: "My Account", href: "/account" },
  { label: "Order Tracking", href: "/track-order" },
  { label: "FAQ", href: "/faq" },
  { label: "Cash on Delivery", href: "/cash-on-delivery" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-conditions" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Returns Policy", href: "/returns-policy" },
]

function SocialIcon({ platform, size = 16 }) {
  const key = String(platform || "").toLowerCase().trim()
  const common = {
    width: size,
    height: size,
    fill: "currentColor",
    "aria-hidden": true,
    focusable: "false",
  }

  if (key === "facebook" || key === "fb") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    )
  }
  if (key === "instagram" || key === "ig" || key === "insta") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    )
  }
  if (key === "twitter" || key === "x" || key === "twitter/x") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
  if (key === "whatsapp" || key === "wa") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    )
  }
  if (key === "youtube" || key === "yt") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  }
  if (key === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.23-1.43.05-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  }

  const letter = key.charAt(0).toUpperCase() || "●"
  return <span style={{ fontSize: size * 0.75, fontWeight: 700, lineHeight: 1 }}>{letter}</span>
}

const PaymentLogo = ({ method }) => {
  const type = (method.type || method).toLowerCase()

  const logos = {
    visa: (
      <div
        style={{
          background: '#1A1F71',
          borderRadius: 4,
          padding: '4px 10px',
          height: 28,
          display: 'flex',
          alignItems: 'center'
        }}>
        <span style={{
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 900,
          fontStyle: 'italic'
        }}>VISA</span>
      </div>
    ),
    mastercard: (
      <div style={{
        background: '#FFFFFF',
        borderRadius: 4,
        padding: '4px 8px',
        height: 28,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#EB001B'
        }}/>
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#F79E1B',
          marginLeft: -7
        }}/>
      </div>
    ),
    amex: (
      <div style={{
        background: '#2E77BC',
        borderRadius: 4,
        padding: '4px 10px',
        height: 28,
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 900,
          color: '#FFFFFF'
        }}>AMEX</span>
      </div>
    ),
    maestro: (
      <div style={{
        background: '#FFFFFF',
        borderRadius: 4,
        padding: '4px 8px',
        height: 28,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#0099DF'
        }}/>
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#CC0000',
          marginLeft: -7
        }}/>
      </div>
    ),
    applepay: (
      <div style={{
        background: '#000000',
        borderRadius: 4,
        padding: '4px 10px',
        height: 28,
        display: 'flex',
        alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#FFFFFF'
        }}>Apple Pay</span>
      </div>
    ),
    googlepay: (
      <div style={{
        background: '#FFFFFF',
        borderRadius: 4,
        padding: '4px 10px',
        height: 28,
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#5F6368'
        }}>G Pay</span>
      </div>
    ),
    klarna: (
      <div style={{
        background: '#FFB3C7',
        borderRadius: 4,
        padding: '4px 10px',
        height: 28,
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 900,
          color: '#17120E'
        }}>Klarna</span>
      </div>
    )
  }

  return logos[type] || (
    <div style={{
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 4,
      padding: '4px 10px',
      height: 28,
      display: 'flex',
      alignItems: 'center'
    }}>
      <span style={{
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: 600
      }}>
        {method.name || method.type || method}
      </span>
    </div>
  )
}

export default function StoreFooterMedico({ settings, initialCategoryTree = null }) {
  const footer = settings?.footer || {}
  const footerEmail = normalizeStoreEmail(
    footer.contactEmail || footer.email || footer.contact?.email || settings?.general?.email || settings?.email
  )
  const footerPhone = footer.phone || footer.contact?.phone || settings?.phone
  const socialLinks = Array.isArray(footer.socialLinks) && footer.socialLinks.length > 0
    ? footer.socialLinks.filter((s) => s?.url)
    : Object.entries(footer.social || {})
        .filter(([, url]) => url)
        .map(([platform, url]) => ({
          platform,
          url,
        }))

  const paymentMethods = (
    footer.showPaymentIcons === false ? [] : footer.paymentMethods || []
  ).filter((m) => {
    if (!m || m.enabled === false) return false;
    const t = String(m.type || m.name || m).toLowerCase();
    return t !== "stripe" && t !== "paypal";
  })

  const storeName = settings?.general?.storeName
    || 'Crazzycars.pk'

  const logoUrl = trimmedLogoUrl(resolveStoreLogoUrl(settings))
  const showLogoInFooter = footer.showLogoInFooter !== false

  const tagline = footer.tagline
    || "The original performance-parts shop in Gujranwala"

  const shopLinks = (settings?.footer?.shopLinks || []).filter(
    (l) => l.enabled !== false
  )

  const customerCareLinks = (settings?.footer?.customerCareLinks || []).filter(
    (l) => l.enabled !== false
  )

  const normalizeFooterLink = (l, fallbackHref = "/") => {
    const href = String(l.href || l.url || "").trim()
    const label = String(l.label || "").trim()
    if (!href || href === "#") {
      return label ? { label, href: fallbackHref } : null
    }
    return { label: label || href, href: rewriteStorePath(href) || href }
  }

  let resolvedShopLinks = shopLinks
    .map((l) => normalizeFooterLink(l, "/shop"))
    .filter(Boolean)
  if (!resolvedShopLinks.length) resolvedShopLinks = [...DEFAULT_SHOP_LINKS]

  let resolvedCustomerCareLinks = customerCareLinks
    .map((l) => normalizeFooterLink(l, "/contact"))
    .filter(Boolean)
  if (!resolvedCustomerCareLinks.length) resolvedCustomerCareLinks = [...DEFAULT_CUSTOMER_CARE_LINKS]

  const isLegalLink = (link) => {
    const blob = `${link.href || ""} ${link.label || ""}`.toLowerCase()
    return /privacy|terms|shipping|returns|refund/.test(blob)
  }
  const helpLinks = resolvedCustomerCareLinks.filter((l) => l.href && !isLegalLink(l))
  const legalLinks = resolvedCustomerCareLinks.filter((l) => l.href && isLegalLink(l))

  return (
    <footer className="store-footer">
      <div className="store-footer-inner">
        <div className="footer-grid">
          <div>
            {showLogoInFooter && logoUrl ? (
              <Link href="/" style={{ display: "inline-block", marginBottom: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={storeName} className="store-footer-logo" />
              </Link>
            ) : (
              <Link href="/" style={{ textDecoration: "none" }}>
                <h3 className="footer-brand-name">{storeName}</h3>
              </Link>
            )}
            <p className="footer-brand-tag">{tagline}</p>
            <div className="footer-contact">
              {footerEmail ? <a href={`mailto:${footerEmail}`}>✉ {footerEmail}</a> : null}
              {footerPhone ? <a href={`tel:${footerPhone}`}>☎ {footerPhone}</a> : null}
            </div>
            {footer.companyName ? (
              <p className="footer-meta" style={{ marginTop: 10, fontWeight: 600 }}>
                {footer.companyName}
              </p>
            ) : null}
            {footer.companyNumber ? (
              <p className="footer-meta">Company No: {footer.companyNumber}</p>
            ) : null}
            {footer.vatNumber ? <p className="footer-meta">VAT No: {footer.vatNumber}</p> : null}
            {footer.registeredAddress ? (
              <div style={{ marginTop: 8 }}>
                {footer.registeredAddress
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line, i) => (
                    <p key={i} className="footer-meta">
                      {line}
                    </p>
                  ))}
              </div>
            ) : null}
            {footer.trustpilotUrl ? (
              <a
                href={footer.trustpilotUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  marginTop: 8,
                  padding: "4px 10px",
                  background: "#00B67A",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ★ Trustpilot
              </a>
            ) : null}
            {socialLinks.length > 0 ? (
              <div className="footer-social">
                {socialLinks.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform || "Social media"}
                    title={s.platform || "Social media"}
                  >
                    <SocialIcon platform={s.platform || s.icon} size={14} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="footer-heading">Shop</h4>
            <nav>
              {resolvedShopLinks.filter((link) => link.href || link.url).map((link, i) => (
                <Link key={i} href={link.href} className="footer-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="footer-heading">Help</h4>
            <nav>
              {helpLinks.map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  prefetch={
                    link.href === "/account" || String(link.href || "").startsWith("/account")
                      ? false
                      : undefined
                  }
                  className="footer-link"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <FooterCategoriesColumn initialCategoryTree={initialCategoryTree} />
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#000" }}>
        <div
          className="store-footer-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {(() => {
            const year = new Date().getFullYear()

            const customText =
              settings?.footer?.copyrightText ||
              settings?.footerMeta?.copyrightText ||
              settings?.data?.footer?.copyrightText ||
              settings?.general?.copyrightText ||
              ''

            const text = customText
              ? customText
                  .replace(/\{year\}/gi, year)
                  .replace(/%year%/gi, year)
              : `© ${year} ${storeName}. All rights reserved.`

            return (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px" }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    margin: 0,
                  }}
                >
                  {text}
                </p>
                {legalLinks.map((link, i) => (
                  <Link
                    key={i}
                    href={link.href}
                    className="footer-link"
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "inline" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )
          })()}
          {paymentMethods.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap'
            }}>
              {paymentMethods.map((method, i) => (
                <PaymentLogo key={i} method={method} />
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
