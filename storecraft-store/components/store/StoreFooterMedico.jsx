'use client'

import Link from 'next/link'
import { normalizeStoreEmail } from '@/lib/storeContact'
import { resolveStoreLogoUrl, trimmedLogoUrl } from '@/lib/storeLogo'

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

export default function StoreFooterMedico({ settings }) {
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
          icon: platform.charAt(0).toUpperCase(),
        }))

  const paymentMethods = (
    footer.showPaymentIcons === false ? [] : footer.paymentMethods || []
  ).filter((m) => m && m.enabled !== false)

  const storeName = settings?.general?.storeName
    || 'The Chain Gang'

  const logoUrl = trimmedLogoUrl(resolveStoreLogoUrl(settings))
  const showLogoInFooter = footer.showLogoInFooter !== false

  const tagline = footer.tagline
    || 'Premium body piercing jewelry crafted for those who dare to be different.'

  const shopLinks = (settings?.footer?.shopLinks || []).filter(
    (l) => l.enabled !== false
  )

  const customerCareLinks = (settings?.footer?.customerCareLinks || []).filter(
    (l) => l.enabled !== false
  )

  const categoriesLinks = (settings?.footer?.categoriesLinks || []).filter(
    (l) => l.enabled !== false
  )

  const finalCategoryLinks = categoriesLinks

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
    <footer style={{
      background: '#000000',
      color: '#FFFFFF',
      marginTop: 48
    }}>
      {/* Main content */}
      <div style={{
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
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {s.icon || s.platform?.charAt(0)?.toUpperCase() || '●'}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* COL 2: Shop */}
          <div style={colStyle}>
            <h4 style={colHeading}>Shop</h4>
            <nav>
              {shopLinks.map((link, i) => (
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
              {customerCareLinks.map((link, i) => (
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

          {/* COL 4: Categories */}
          <div style={colStyle}>
            <h4 style={colHeading}>Categories</h4>
            <nav>
              {finalCategoryLinks.map((link, i) => (
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
              {finalCategoryLinks.length === 0 && (
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.3)',
                    fontStyle: 'italic',
                  }}
                >
                  No categories added
                </p>
              )}
            </nav>
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
        <div style={{
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
