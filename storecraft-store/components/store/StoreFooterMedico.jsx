'use client'

import Link from 'next/link'
import { normalizeStoreEmail } from '@/lib/storeContact'
import { resolveStoreLogoUrl, trimmedLogoUrl } from '@/lib/storeLogo'
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
    paypal: (
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 4,
          padding: '4px 10px',
          height: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: '#003087',
            letterSpacing: '-0.02em',
          }}
        >
          Pay
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: '#009cde',
            letterSpacing: '-0.02em',
          }}
        >
          Pal
        </span>
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
    stripe: (
      <div style={{
        background: '#635BFF',
        borderRadius: 4,
        padding: '4px 10px',
        height: 28,
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#FFFFFF'
        }}>Stripe</span>
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
  ).filter((m) => m && m.enabled !== false)

  const storeName = settings?.general?.storeName
    || 'Crazzycars.pk'

  const logoUrl = trimmedLogoUrl(resolveStoreLogoUrl(settings))
  const showLogoInFooter = footer.showLogoInFooter !== false

  const tagline = footer.tagline
    || "Fitment-first car accessories from Gujranwala"

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
    return { label: label || href, href }
  }

  let resolvedShopLinks = shopLinks
    .map((l) => normalizeFooterLink(l, "/shop"))
    .filter(Boolean)
  if (!resolvedShopLinks.length) resolvedShopLinks = [...DEFAULT_SHOP_LINKS]

  let resolvedCustomerCareLinks = customerCareLinks
    .map((l) => normalizeFooterLink(l, "/contact"))
    .filter(Boolean)
  if (!resolvedCustomerCareLinks.length) resolvedCustomerCareLinks = [...DEFAULT_CUSTOMER_CARE_LINKS]

  const colHeading = {
    fontSize: 13,
    fontWeight: 700,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 20px',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    whiteSpace: 'nowrap',
  }

  const colLink = {
    display: 'block',
    fontSize: 13,
    color: '#FFFFFF',
    textDecoration: 'none',
    lineHeight: '2.0',
    fontWeight: 600,
    transition: 'opacity 0.15s'
  }

  const colStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  }

  return (
    <footer className="store-footer" style={{
      background: '#000000',
      color: '#FFFFFF',
      marginTop: 48
    }}>
      {/* Main content */}
      <div className="store-footer-inner" style={{
        maxWidth: '100%',
        margin: '0 auto',
        padding: '36px 48px 28px',
      }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1.1fr 1.3fr 1.1fr 1.5fr',
            gap: 80,
            paddingBottom: 24,
          }}
          className="footer-grid"
        >

          {/* COL 1: Brand Info */}
          <div style={colStyle}>
            {showLogoInFooter && logoUrl ? (
              <Link
                href="/"
                style={{
                  display: 'inline-block',
                  marginBottom: 16,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="store-footer-logo"
                  style={{
                    width: 220,
                    height: 72,
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Link>
            ) : (
              <Link
                href="/"
                style={{
                  display: 'inline-block',
                  marginBottom: 16,
                  textDecoration: 'none',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: '0 0 4px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {storeName}
                  </h3>
                </div>
              </Link>
            )}
            <p
              style={{
                fontSize: 13,
                color: '#FFFFFF',
                lineHeight: 1.9,
                margin: '0 0 20px',
                fontWeight: 500,
                maxWidth: 240,
              }}
            >
              {tagline}
            </p>
            {footerEmail ? (
              <a
                href={`mailto:${footerEmail}`}
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  textDecoration: 'none',
                  lineHeight: 2,
                }}
              >
                ✉ {footerEmail}
              </a>
            ) : null}
            {footerPhone ? (
              <a
                href={`tel:${footerPhone}`}
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  textDecoration: 'none',
                  lineHeight: 2,
                }}
              >
                ☎ {footerPhone}
              </a>
            ) : null}
            {socialLinks.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 16,
                }}
              >
                {socialLinks.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform || "Social media"}
                    title={s.platform || "Social media"}
                    style={{
                      width: 34,
                      height: 34,
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                    }}
                  >
                    <SocialIcon platform={s.platform || s.icon} size={16} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* COL 2: Shop */}
          <div style={colStyle}>
            <h4 style={colHeading}>Shop</h4>
            <nav>
              {resolvedShopLinks.filter((link) => link.href || link.url).map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  style={colLink}
                  onMouseEnter={(e) => { e.target.style.opacity = '0.6' }}
                  onMouseLeave={(e) => { e.target.style.opacity = '1' }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* COL 3: Customer Care */}
          <div style={colStyle}>
            <h4 style={colHeading}>Customer Care</h4>
            <nav>
              {resolvedCustomerCareLinks.filter((link) => link.href || link.url).map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  prefetch={link.href === "/account" || String(link.href || "").startsWith("/account") ? false : undefined}
                  style={colLink}
                  onMouseEnter={(e) => { e.target.style.opacity = '0.6' }}
                  onMouseLeave={(e) => { e.target.style.opacity = '1' }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* COL 4: Categories */}
          <div style={colStyle}>
            <FooterCategoriesColumn initialCategoryTree={initialCategoryTree} />
          </div>

          {/* COL 5: Company Information */}
          <div style={colStyle}>
            <h4 style={colHeading}>Company Information</h4>

            {footer.companyName ? (
              <p
                style={{
                  fontSize: 13,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  margin: '0 0 8px',
                  lineHeight: 1.5,
                }}
              >
                {footer.companyName}
              </p>
            ) : null}

            {footer.companyNumber ? (
              <p
                style={{
                  fontSize: 12,
                  color: '#FFFFFF',
                  margin: '0 0 4px',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ fontWeight: 700 }}>Company No:</span>
                {' '}
                {footer.companyNumber}
              </p>
            ) : null}

            {footer.vatNumber ? (
              <p
                style={{
                  fontSize: 12,
                  color: '#FFFFFF',
                  margin: '0 0 12px',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ fontWeight: 700 }}>VAT No:</span>
                {' '}
                {footer.vatNumber}
              </p>
            ) : null}

            {footer.registeredAddress ? (
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    margin: '0 0 6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Registered Address:
                </p>
                {footer.registeredAddress
                  .split('\n')
                  .filter((line) => line.trim())
                  .map((line, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 12,
                        color: '#FFFFFF',
                        margin: '0 0 2px',
                        lineHeight: 1.6,
                      }}
                    >
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  background: '#00B67A',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                ★ Trustpilot
              </a>
            ) : null}
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: '#000000'
      }}>
        <div className="store-footer-bar" style={{
          maxWidth: '100%',
          margin: '0 auto',
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
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
              <p style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                margin: 0
              }}>
                {text}
              </p>
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
