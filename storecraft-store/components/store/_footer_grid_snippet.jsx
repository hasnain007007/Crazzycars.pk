        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1.4fr',
            gap: 40,
            paddingBottom: 48,
          }}
          className="footer-grid"
        >

          {/* COL 1: Brand Info */}
          <div>
            {logoUrl ? (
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
            ) : showStoreName ? (
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: '0 0 16px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {storeName}
              </h3>
            ) : null}
            <p
              style={{
                fontSize: 13,
                color: '#FFFFFF',
                lineHeight: 1.9,
                margin: '0 0 20px',
                fontWeight: 500,
                opacity: 0.75,
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
                  color: 'rgba(255,255,255,0.6)',
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
                  color: 'rgba(255,255,255,0.6)',
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
          <div>
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
          <div>
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
          <div>
            <h4 style={colHeading}>Categories</h4>
            <nav>
              {categoriesLinks.map((link, i) => (
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
              {categoriesLinks.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.3)',
                    fontStyle: 'italic',
                  }}
                >
                  No categories added
                </p>
              ) : null}
            </nav>
          </div>

          {/* COL 5: Company Information */}
          <div>
            <h4 style={colHeading}>Company Information</h4>

            {footer.companyName ? (
              <p
                style={{
                  fontSize: 13,
                  color: '#FFFFFF',
                  fontWeight: 600,
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
                  color: 'rgba(255,255,255,0.6)',
                  margin: '0 0 4px',
                  lineHeight: 1.6,
                }}
              >
                Company No: {footer.companyNumber}
              </p>
            ) : null}

            {footer.vatNumber ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  margin: '0 0 12px',
                  lineHeight: 1.6,
                }}
              >
                VAT No: {footer.vatNumber}
              </p>
            ) : null}

            {footer.registeredAddress ? (
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 6px',
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
                        color: 'rgba(255,255,255,0.6)',
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
