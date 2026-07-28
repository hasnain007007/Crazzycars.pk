'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { heroImageUrl, heroImageUrlMobile } from '@/lib/cloudinaryImage'

/** Section min-height from admin imageDisplay.height */
const getSplitMinHeight = (height) => {
  switch (height) {
    case 'small':
      return '380px'
    case 'medium':
      return '480px'
    case 'large':
      return '560px'
    case 'full':
      return 'min(85vh, 720px)'
    case 'auto':
      return 'auto'
    default:
      return '520px'
  }
}

const SPLIT_BG = '#f5f5f5'
const HEADING_COLOR = '#111111'
const SUB_COLOR = '#555555'
const DEFAULT_BTN_BG = '#111111'

/** Shown only when the API returns no banner record */
const NO_BANNER_HEADING = 'Upgrade Your Ride'
const NO_BANNER_SUB = 'Premium Car Accessories · Delivered Across Pakistan'

/** Map admin objectPosition values to valid CSS object-position */
function cssObjectPosition(pos) {
  if (!pos) return 'center center'
  const s = String(pos).trim()
  if (s.includes(' ')) return s
  const map = {
    center: 'center center',
    top: 'top center',
    bottom: 'bottom center',
    left: 'center left',
    right: 'center right',
  }
  return map[s] || s
}

/** Resolve image URLs and positions from API payload (supports legacy field names). */
function resolveBannerImages(banner) {
  if (!banner) {
    return {
      desktopImageUrl: null,
      mobileImageUrl: null,
      desktopPosition: 'center center',
      mobilePosition: 'center center',
    }
  }

  const bg = banner.background || {}
  const img = bg.image || {}

  const desktopImageUrl =
    img.url ||
    banner.desktopImage ||
    banner.imageUrl ||
    banner.image ||
    null

  const mobileImageUrl =
    bg.mobileImage?.url ||
    banner.mobileImage ||
    banner.mobileImageUrl ||
    desktopImageUrl ||
    null

  const desktopPosition = cssObjectPosition(
    img.position ||
      banner.imageDisplay?.objectPosition ||
      banner.imagePosition ||
      'center center'
  )

  const mobilePosition = cssObjectPosition(
    bg.mobileImagePosition ||
      banner.mobileImagePosition ||
      'center center'
  )

  return {
    desktopImageUrl: desktopImageUrl ? heroImageUrl(String(desktopImageUrl).trim()) : null,
    mobileImageUrl: mobileImageUrl ? heroImageUrlMobile(String(mobileImageUrl).trim()) : null,
    desktopPosition,
    mobilePosition,
  }
}

function BannerSubheadings({ banner, className = 'hero-split-sub' }) {
  const subheadings = banner?.content?.subheadings || []
  const singleSub =
    (banner?.content?.subheading?.text ?? '').trim() ||
    (banner?.content?.description?.text ?? '').trim()
  const subColor =
    banner?.content?.subheading?.color?.trim() ||
    banner?.content?.description?.color?.trim() ||
    '#FFFFFF'

  const lineStyle = {
    fontSize: 16,
    color: subColor,
    margin: '0 0 6px',
    lineHeight: 1.6,
    fontWeight: 400,
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  }

  if (subheadings.length > 0) {
    return subheadings
      .filter((s) => s && String(s).trim())
      .map((sub, i) => (
        <p key={i} className={className || undefined} style={lineStyle}>
          {String(sub).trim()}
        </p>
      ))
  }

  if (singleSub) {
    return (
      <p className={className || undefined} style={lineStyle}>
        {singleSub}
      </p>
    )
  }

  return null
}

const HERO_BANNER_MOBILE_STYLE = `
@media (max-width: 768px) {
  .hero-banner-root {
    height: 420px !important;
    min-height: 420px !important;
    position: relative !important;
    overflow: hidden !important;
  }

  /* Hide desktop text column on mobile */
  .hero-split-copy,
  .hero-content,
  .hero-split-text {
    display: none !important;
  }

  /* Full-bleed image column on mobile */
  .hero-split-media {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 0 !important;
  }

  /* Mobile text overlay on top of image */
  .hero-mobile-text {
    display: flex !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-end !important;
    padding: 24px 20px !important;
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.75) 0%,
      rgba(0,0,0,0.3) 60%,
      transparent 100%
    ) !important;
    z-index: 5 !important;
  }

  .hero-mobile-text h2 {
    font-size: clamp(28px, 3vw, 42px) !important;
    font-weight: 800 !important;
    color: #FFFFFF !important;
    margin: 0 0 6px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    line-height: 1.2 !important;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
  }

  .hero-mobile-text p {
    font-size: 16px !important;
    color: rgba(255,255,255,0.9) !important;
    margin: 0 0 14px !important;
    line-height: 1.5 !important;
    text-shadow: 0 1px 4px rgba(0,0,0,0.4) !important;
  }

  .hero-mobile-text a {
    display: inline-block !important;
    padding: 10px 22px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    text-decoration: none !important;
    border-radius: 2px !important;
  }
}

.hero-split-section .hero-split-heading {
  font-size: clamp(28px, 3vw, 42px) !important;
}

.hero-split-section .hero-split-sub {
  font-size: 16px !important;
}

@media (min-width: 769px) {
  .hero-mobile-text {
    display: none !important;
  }
}
`

function SplitHeroShell({
  minHeight,
  textCol,
  mediaCol,
  /** Beats global `body { color: … !important }` via globals.css vars */
  headingColorVar = HEADING_COLOR,
  subheadingColorVar = SUB_COLOR,
  mobileImagePositionVar = 'center center',
}) {
  const mh = minHeight === 'auto' ? undefined : minHeight
  const hasMedia = Boolean(mediaCol)
  return (
    <>
      <style>{HERO_BANNER_MOBILE_STYLE}</style>
      <section
        className={
          hasMedia
            ? 'hero-banner-root hero-split-section hero-split-section--with-media'
            : 'hero-banner-root hero-split-section'
        }
        style={{
          backgroundColor: SPLIT_BG,
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          ...(mh ? { minHeight: mh } : {}),
          ['--hero-heading-color']: headingColorVar,
          ['--hero-subheading-color']: subheadingColorVar,
          ['--hero-mobile-object-position']: mobileImagePositionVar,
        }}
      >
        <div
          className={
            hasMedia ? 'hero-split-inner' : 'hero-split-inner hero-split-inner--text-only'
          }
        >
          <div
            className={
              hasMedia
                ? 'hero-content hero-split-text hero-split-copy'
                : 'hero-content hero-split-text'
            }
          >
            {textCol}
          </div>
          {hasMedia ? (
            <div className="hero-split-media">{mediaCol}</div>
          ) : null}
        </div>
      </section>
    </>
  )
}

const defaultCtaStyle = {
  display: 'inline-block',
  padding: '13px 32px',
  background: '#111111',
  color: '#FFFFFF',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  borderRadius: 2,
}

function HeroCtas({ primaryButton }) {
  const hasPrimary =
    primaryButton &&
    String(primaryButton.text ?? '').trim().length > 0

  if (!hasPrimary) return null

  return (
    <Link
      href={primaryButton.url || primaryButton.link || '/products'}
      style={{
        ...defaultCtaStyle,
        background: primaryButton.bgColor || '#111111',
        color:
          primaryButton.color ||
          primaryButton.textColor ||
          '#FFFFFF',
      }}
    >
      {primaryButton.text}
    </Link>
  )
}

export default function HeroBanner() {
  const [banner, setBanner] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/banners')
      .then((r) => r.json())
      .then((data) => {
        const heroSliderBanners = Array.isArray(data?.hero_slider)
          ? data.hero_slider
          : []

        const statusOk = (b) => {
          const s = String(b?.status ?? '').toLowerCase()
          return s === 'active' || s === 'published'
        }

        const activeBanner =
          heroSliderBanners.find((b) => statusOk(b)) ||
          heroSliderBanners[0] ||
          null

        console.log('Banner data:', activeBanner)
        console.log('Desktop image:', activeBanner?.background?.image?.url)
        console.log('Mobile image:', activeBanner?.background?.mobileImage?.url)

        setBanner(activeBanner)
      })
      .catch((e) => {
        console.error('Banner fetch error:', e)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <style>{HERO_BANNER_MOBILE_STYLE}</style>
        <section
          className="hero-banner-root hero-split-section"
          style={{
            minHeight: '480px',
            backgroundColor: SPLIT_BG,
            ['--hero-heading-color']: HEADING_COLOR,
            ['--hero-subheading-color']: SUB_COLOR,
          }}
        />
      </>
    )
  }

  const minHeight = banner
    ? getSplitMinHeight(banner.imageDisplay?.height)
    : '520px'

  const {
    desktopImageUrl,
    mobileImageUrl,
    desktopPosition,
    mobilePosition,
  } = resolveBannerImages(banner)

  const heading =
    (banner?.content?.heading?.text ?? '').trim()

  const badge = banner?.content?.badge?.text?.trim() || ''
  const buttons = banner?.content?.buttons || []
  const primaryButton = buttons[0] ?? null

  const objectFit = banner?.imageDisplay?.objectFit || 'cover'

  const headingColor =
    banner?.content?.heading?.color?.trim() || '#111111'

  const subheadingColor =
    banner?.content?.subheading?.color?.trim() ||
    banner?.content?.description?.color?.trim() ||
    '#555555'

  /* Default hero — no banner row from API */
  if (!banner) {
    return (
      <SplitHeroShell
        minHeight="520px"
        headingColorVar={HEADING_COLOR}
        subheadingColorVar={SUB_COLOR}
        textCol={
          <>
            <h1 className="hero-split-heading">{NO_BANNER_HEADING}</h1>
            <p className="hero-split-sub">{NO_BANNER_SUB}</p>
            <Link href="/products" style={{ ...defaultCtaStyle, background: DEFAULT_BTN_BG }}>
              Shop Collection
            </Link>
          </>
        }
        mediaCol={null}
      />
    )
  }

  /* Banner without image — editorial column only */
  if (!desktopImageUrl) {
    return (
      <SplitHeroShell
        minHeight={minHeight}
        headingColorVar={headingColor}
        subheadingColorVar={subheadingColor}
        textCol={
          <>
            {badge ? (
              <div className="hero-split-badge">{badge}</div>
            ) : null}
            {heading ? (
              <h1 className="hero-split-heading">{heading}</h1>
            ) : null}
            {subheading ? (
              <p className="hero-split-sub">{subheading}</p>
            ) : null}
            <HeroCtas primaryButton={primaryButton} />
          </>
        }
        mediaCol={null}
      />
    )
  }

  const alt =
    (banner?.background?.image?.altText ?? '').trim() ||
    heading ||
    'Banner'

  return (
    <SplitHeroShell
      minHeight={minHeight}
      headingColorVar={headingColor}
      subheadingColorVar={subheadingColor}
      mobileImagePositionVar={mobilePosition}
      textCol={
        <>
          {badge ? <div className="hero-split-badge">{badge}</div> : null}
          {heading ? (
            <h1 className="hero-split-heading">{heading}</h1>
          ) : null}
          <BannerSubheadings banner={banner} />
          <HeroCtas primaryButton={primaryButton} />
        </>
      }
      mediaCol={
        <>
          <div
            className="hero-banner-media-wrap"
            style={{
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
              ['--hero-mobile-object-position']: mobilePosition,
            }}
          >
            <picture>
              {mobileImageUrl && mobileImageUrl !== desktopImageUrl ? (
                <source media="(max-width: 768px)" srcSet={mobileImageUrl} />
              ) : null}
              <img
                src={desktopImageUrl}
                alt={alt}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="hero-split-img hero-banner-img hero-banner-img--desktop"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  maxHeight: 560,
                  objectFit: 'cover',
                  objectPosition: desktopPosition,
                }}
              />
            </picture>
          </div>
          <div className="hero-mobile-text">
            {heading ? <h2>{heading}</h2> : null}
            <BannerSubheadings banner={banner} className="" />
            {primaryButton && primaryButton.text ? (
              <Link
                href={
                  primaryButton.url ||
                  primaryButton.link ||
                  '/products'
                }
                style={{
                  background: primaryButton.bgColor || '#111111',
                  color:
                    primaryButton.color ||
                    primaryButton.textColor ||
                    '#FFFFFF',
                }}
              >
                {primaryButton.text}
              </Link>
            ) : null}
          </div>
        </>
      }
    />
  )
}
