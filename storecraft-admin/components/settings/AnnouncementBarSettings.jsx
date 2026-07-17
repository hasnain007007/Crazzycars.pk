'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { clearStorefrontBrowserCache } from '@/lib/clearStorefrontBrowserCache'
import { clearAdminSettingsCache } from '@/lib/adminSettingsCache'

const DEFAULT_ITEMS = [
  { text: 'Free Delivery on Orders Over Rs. 2,999', link: '', enabled: true },
  { text: 'Welcome to Crazzycars.pk', link: '/shop', enabled: true },
  { text: 'Cash on Delivery Available', link: '', enabled: true }
]

export default function AnnouncementBarSettings() {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    enabled: true,
    items: DEFAULT_ITEMS,
    backgroundColor: '#111111',
    textColor: '#FFFFFF'
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings', {
          credentials: 'include'
        })
        const data = await res.json()
        const bar = data?.settings?.announcementBar
          || data?.data?.announcementBar

        if (bar) {
          setForm(prev => ({
            ...prev,
            ...bar,
            items: bar.items?.length > 0
              ? bar.items
              : DEFAULT_ITEMS
          }))
        }
      } catch (e) {}
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ announcementBar: form })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Announcement bar saved!')
        clearStorefrontBrowserCache()
        clearAdminSettingsCache()
      } else {
        toast.error('Save failed')
      }
    } catch (e) {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const updateItem = (index, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addItem = () => {
    if (form.items.length >= 5) {
      toast.error('Maximum 5 items allowed')
      return
    }
    setForm(f => ({
      ...f,
      items: [
        ...f.items,
        { text: '', link: '', enabled: true }
      ]
    }))
  }

  const removeItem = (index) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }))
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
    fontFamily: 'inherit'
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6
  }

  return (
    <div>
      {/* Save bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 24
      }}>
        <div>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#166534',
            margin: 0
          }}>
            Announcement Bar Settings
          </p>
          <p style={{
            fontSize: 12,
            color: '#16a34a',
            margin: '2px 0 0'
          }}>
            Edit the top bar shown on every page
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            padding: '10px 24px',
            background: saving ? '#9ca3af' : '#009688',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'default' : 'pointer'
          }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Live Preview */}
      <div style={{
        marginBottom: 24
      }}>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: '0 0 8px'
        }}>
          Preview
        </p>
        <div style={{
          background: form.backgroundColor || '#111111',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
          borderRadius: 6,
          flexWrap: 'wrap',
          gap: 24
        }}>
          {form.items
            .filter(item => item.enabled && item.text)
            .map((item, i) => (
              <span key={i} style={{
                fontSize: 11,
                color: form.textColor || '#FFFFFF',
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                {item.text}
              </span>
            ))
          }
        </div>
      </div>

      {/* Enable/Disable */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div>
            <p style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 2px'
            }}>
              Show Announcement Bar
            </p>
            <p style={{
              fontSize: 12,
              color: '#6b7280',
              margin: 0
            }}>
              Toggle the entire announcement bar
            </p>
          </div>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: 44,
            height: 24,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm(f => ({
                ...f, enabled: e.target.checked
              }))}
              style={{ display: 'none' }}
            />
            <span style={{
              position: 'absolute',
              inset: 0,
              background: form.enabled
                ? '#009688' : '#d1d5db',
              borderRadius: 99,
              transition: 'background 0.2s'
            }} />
            <span style={{
              position: 'absolute',
              top: 2,
              left: form.enabled ? 22 : 2,
              width: 20,
              height: 20,
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </label>
        </div>

        {/* Colors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 0
        }}>
          <div>
            <label style={labelStyle}>
              Background Color
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <input
                type="color"
                value={form.backgroundColor || '#111111'}
                onChange={e => setForm(f => ({
                  ...f,
                  backgroundColor: e.target.value
                }))}
                style={{
                  width: 40,
                  height: 36,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: 2
                }}
              />
              <input
                type="text"
                value={form.backgroundColor || '#111111'}
                onChange={e => setForm(f => ({
                  ...f,
                  backgroundColor: e.target.value
                }))}
                style={{
                  ...inputStyle,
                  fontFamily: 'monospace',
                  flex: 1
                }}
                placeholder="#111111"
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>
              Text Color
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <input
                type="color"
                value={form.textColor || '#FFFFFF'}
                onChange={e => setForm(f => ({
                  ...f,
                  textColor: e.target.value
                }))}
                style={{
                  width: 40,
                  height: 36,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: 2
                }}
              />
              <input
                type="text"
                value={form.textColor || '#FFFFFF'}
                onChange={e => setForm(f => ({
                  ...f,
                  textColor: e.target.value
                }))}
                style={{
                  ...inputStyle,
                  fontFamily: 'monospace',
                  flex: 1
                }}
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#111827',
            margin: 0
          }}>
            Bar Items ({form.items.length}/5)
          </h3>
          <button
            type="button"
            onClick={addItem}
            style={{
              padding: '6px 14px',
              background: '#009688',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}>
            + Add Item
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {form.items.map((item, index) => (
            <div key={index} style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151'
                }}>
                  Item {index + 1}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {/* Enable toggle */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#6b7280'
                  }}>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={e => updateItem(
                        index, 'enabled', e.target.checked
                      )}
                      style={{ accentColor: '#009688' }}
                    />
                    Enabled
                  </label>
                  {/* Remove */}
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 8px',
                        fontSize: 12,
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}>
                <div>
                  <label style={labelStyle}>
                    Text *
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Free Delivery on Orders Over Rs. 2,999"
                    value={item.text}
                    onChange={e => updateItem(
                      index, 'text', e.target.value
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Link (optional)
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="/shipping-policy"
                    value={item.link || ''}
                    onChange={e => updateItem(
                      index, 'link', e.target.value
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
