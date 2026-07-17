'use client'
import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

const cardStyle = {
  style: {
    base: {
      fontSize: '15px',
      color: '#111111',
      fontFamily: "'Inter', sans-serif",
      '::placeholder': { color: '#AAAAAA' }
    },
    invalid: { color: '#dc2626' }
  }
}

// Inner form - receives clientSecret as prop
function CardForm({ 
  clientSecret,
  onSuccess, 
  onError, 
  amount, 
  orderId 
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cardName, setCardName] = useState('')

  /**
   * Primary path: update order + clear cart storage + inline success + redirect.
   * Secondary: parent onSuccess (overlays / React cart) — must not block redirect.
   */
  const completePaymentSuccess = async (paymentIntent) => {
    console.log('=== PAYMENT SUCCEEDED - nuclear path ===', paymentIntent?.id)
    setProcessing(false)
    setSuccess(true)

    const oid =
      typeof window !== 'undefined'
        ? (window.__currentOrderId || orderId || '')
        : (orderId || '')
    console.log('nuclear order id (oid):', oid)

    if (oid) {
      try {
        const amountPaid =
          typeof paymentIntent.amount_received === 'number' && paymentIntent.amount_received > 0
            ? paymentIntent.amount_received / 100
            : (paymentIntent.amount || 0) / 100
        const res = await fetch(`/api/orders/${oid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentStatus: 'paid',
            orderStatus: 'processing',
            status: 'processing',
            'payment.stripePaymentIntentId': paymentIntent.id,
            'payment.paidAt': new Date().toISOString(),
            'payment.amount': amountPaid,
          }),
        })
        const data = await res.json().catch(() => ({}))
        console.log('nuclear order update result:', res.ok, data)
      } catch (e) {
        console.error('nuclear order PUT error:', e)
      }
    }

    try {
      localStorage.removeItem('cart')
      localStorage.removeItem('cartItems')
      localStorage.removeItem('cart_items')
      localStorage.removeItem('sialkot_store_cart_v1')
      window.dispatchEvent(new Event('cartUpdated'))
    } catch (e) {
      console.error('nuclear localStorage clear:', e)
    }

    if (onSuccess) {
      try {
        console.log('=== secondary onSuccess (parent) ===')
        await onSuccess(paymentIntent)
        console.log('onSuccess completed')
      } catch (e) {
        console.error('onSuccess threw:', e)
      }
    } else {
      console.warn('onSuccess is not defined (parent callback)')
    }

    const redirectUrl = `/checkout/success?order_id=${encodeURIComponent(String(oid))}&paid=true`
    console.log('Will redirect to:', redirectUrl)
    setTimeout(() => {
      console.log('REDIRECTING NOW', redirectUrl)
      window.location.href = redirectUrl
    }, 1500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('=== CARD SUBMIT ===')
    console.log('stripe:', !!stripe)
    console.log('elements:', !!elements)
    console.log('clientSecret:', clientSecret ? `${clientSecret.substring(0, 30)}…` : '')
    console.log('cardName:', cardName)

    if (!stripe || !elements) {
      setError('Payment system not ready. Please refresh.')
      return
    }

    if (!clientSecret) {
      setError('Payment not initialized. Please refresh.')
      return
    }

    const cardElement = elements.getElement(CardNumberElement)
    console.log('cardElement:', !!cardElement)
    if (!cardElement) {
      setError('Please enter your card details.')
      return
    }

    setError('')
    setProcessing(true)

    try {
      console.log('=== CALLING CONFIRM CARD PAYMENT ===')
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardName || 'Customer',
          },
        },
      })

      console.log('=== STRIPE RESULT ===', result)
      console.log('error:', result.error)
      console.log('paymentIntent:', result.paymentIntent)
      console.log('status:', result.paymentIntent?.status)

      if (result.error) {
        console.error('Stripe error:', result.error)
        const msg = result.error.message || 'Payment failed'
        setError(msg)
        setProcessing(false)
        if (onError) onError(msg)
        return
      }

      if (result.paymentIntent?.status === 'requires_action') {
        let nextResult
        if (typeof stripe.handleNextAction === 'function') {
          nextResult = await stripe.handleNextAction({ clientSecret })
        } else if (typeof stripe.handleCardAction === 'function') {
          nextResult = await stripe.handleCardAction(clientSecret)
        } else {
          const msg =
            'Additional card authentication is required. Please try again or use another card.'
          setError(msg)
          setProcessing(false)
          if (onError) onError(msg)
          return
        }

        if (nextResult.error) {
          const msg = nextResult.error.message || 'Authentication failed'
          setError(msg)
          setProcessing(false)
          if (onError) onError(msg)
          return
        }

        const pi = nextResult.paymentIntent
        console.log('=== after 3DS / next action ===', pi?.status)
        if (pi?.status === 'succeeded') {
          console.log('=== PAYMENT SUCCEEDED (after action) - calling completePaymentSuccess ===')
          await completePaymentSuccess(pi)
          return
        }

        const msg = `Payment status: ${pi?.status || 'unknown'}`
        setError(msg)
        setProcessing(false)
        if (onError) onError(msg)
        return
      }

      if (result.paymentIntent?.status === 'succeeded') {
        console.log('=== PAYMENT SUCCEEDED - calling completePaymentSuccess ===')
        await completePaymentSuccess(result.paymentIntent)
        return
      }

      const msg = `Payment status: ${result.paymentIntent?.status || 'unknown'}`
      setError(msg)
      setProcessing(false)
      if (onError) onError(msg)
    } catch (err) {
      console.error('Payment exception:', err)
      const msg = err.message || 'Payment failed. Please try again.'
      setError(msg)
      setProcessing(false)
      if (onError) onError(msg)
    }
  }

  // SUCCESS SCREEN
  if (success) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 24px'
      }}>
        <div style={{
          width: 72,
          height: 72,
          background: '#f0fdf4',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          border: '2px solid #86efac'
        }}>
          <svg 
            width="32" height="32" 
            viewBox="0 0 24 24"
            fill="none" 
            stroke="#16a34a" 
            strokeWidth="2.5"
            strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#111111',
          margin: '0 0 10px',
          textTransform: 'uppercase',
          letterSpacing: '0.03em'
        }}>
          Payment Successful!
        </h3>
        <p style={{
          fontSize: 14,
          color: '#555555',
          margin: '0 0 8px',
          lineHeight: 1.6
        }}>
          Your order has been confirmed.
        </p>
        <p style={{
          fontSize: 13,
          color: '#888888',
          margin: 0
        }}>
          Redirecting to your confirmation…
        </p>
      </div>
    )
  }

  // PAYMENT FORM
  return (
    <div style={{ position: 'relative' }}>
      {processing ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 40,
            background: 'rgba(255,255,255,0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            gap: 14,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid #E5E5E5',
              borderTop: '3px solid #111111',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: '#111111',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Processing payment…
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#888888' }}>
            Please do not close this page
          </p>
        </div>
      ) : null}
    <form
      onSubmit={handleSubmit}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') {
          ev.stopPropagation()
        }
      }}
    >

      {/* Cardholder name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8
        }}>
          Name on Card
        </label>
        <input
          type="text"
          value={cardName}
          onChange={e => setCardName(e.target.value)}
          placeholder="John Smith"
          required
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1px solid #E5E5E5',
            borderRadius: 4,
            fontSize: 15,
            color: '#111111',
            outline: 'none',
            boxSizing: 'border-box',
            background: '#FFFFFF'
          }}
        />
      </div>

      {/* Card Number */}
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8
        }}>
          Card Number
        </label>
        <div style={{
          padding: '13px 14px',
          border: '1px solid #E5E5E5',
          borderRadius: 4,
          background: '#FFFFFF'
        }}>
          <CardNumberElement options={cardStyle} />
        </div>
      </div>

      {/* Expiry + CVC row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 24
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#888888',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8
          }}>
            Expiry Date
          </label>
          <div style={{
            padding: '13px 14px',
            border: '1px solid #E5E5E5',
            borderRadius: 4,
            background: '#FFFFFF'
          }}>
            <CardExpiryElement options={cardStyle} />
          </div>
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#888888',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8
          }}>
            CVC
          </label>
          <div style={{
            padding: '13px 14px',
            border: '1px solid #E5E5E5',
            borderRadius: 4,
            background: '#FFFFFF'
          }}>
            <CardCvcElement options={cardStyle} />
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '16px 18px',
          marginBottom: 16,
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            background: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            border: '2px solid #fecaca'
          }}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#b91c1c',
            margin: '0 0 8px'
          }}>
            Payment failed
          </p>
          <p style={{
            fontSize: 13,
            color: '#dc2626',
            margin: '0 0 14px',
            lineHeight: 1.5
          }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setError('')
              if (onError) onError('')
            }}
            style={{
              padding: '8px 20px',
              background: '#111111',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.04em'
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* PAY BUTTON */}
      <button
        type="submit"
        disabled={!stripe || processing}
        style={{
          width: "100%",
          padding: "14px",
          background: processing ? "#888888" : "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 6,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: processing ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          boxShadow: processing ? "none" : "0 4px 15px rgba(99, 91, 255, 0.3)",
          transition: "all 0.2s",
        }}
      >
        {processing ? (
          <>
            <div
              style={{
                width: 18,
                height: 18,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTop: "2px solid #FFFFFF",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }}
            />
            Processing...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Pay Rs. {Number(amount || 0).toFixed(2)} Securely
            <span
              style={{
                fontSize: 10,
                opacity: 0.8,
                marginLeft: 4,
                fontWeight: 400,
                letterSpacing: "0.02em",
              }}
            >
              via Stripe
            </span>
          </>
        )}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid #F0F0F0",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888888" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          SSL Secured
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888888" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#635BFF" strokeWidth="2" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Powered by Stripe
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888888" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D72323" strokeWidth="2" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          256-bit Encrypted
        </div>
      </div>
    </form>
    </div>
  )
}

// OUTER COMPONENT
export default function StripeCheckout({
  amount,
  orderId,
  customerEmail,
  customerName,
  onSuccess,
  onError,
}) {
  const [stripePromise, setStripePromise] = 
    useState(null)
  const [clientSecret, setClientSecret] = 
    useState('')
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState('')

  useEffect(() => {
    if (!amount || amount <= 0) {
      setInitError('Invalid order amount.')
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        // Step 1: Get publishable key
        const configRes = await fetch(
          '/api/payment/stripe/config'
        )
        const configData = await configRes.json()

        if (!configData?.publishableKey) {
          setInitError(
            'Payment not configured. ' +
            'Please contact the store.'
          )
          setLoading(false)
          return
        }

        const promise = loadStripe(
          configData.publishableKey
        )
        setStripePromise(promise)

        // Step 2: Create payment intent
        const intentRes = await fetch(
          '/api/payment/stripe/create-intent',
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              amount,
              currency: 'eur',
              orderId,
              customerEmail,
              customerName
            })
          }
        )
        const intentData = await intentRes.json()

        if (intentData?.success && intentData?.clientSecret) {
          setClientSecret(intentData.clientSecret)
        } else {
          setInitError(
            intentData?.error || 
            'Could not initialize payment.'
          )
        }
      } catch (e) {
        console.error('Stripe init error:', e)
        setInitError(
          'Failed to load payment. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [amount, orderId, customerEmail, customerName])

  // LOADING STATE
  if (loading) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid #E5E5E5',
          borderTop: '3px solid #111111',
          borderRadius: '50%',
          margin: '0 auto 14px',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{
          fontSize: 14,
          color: '#888888',
          margin: 0
        }}>
          Initializing secure payment...
        </p>
      </div>
    )
  }

  // INIT ERROR STATE
  if (initError) {
    return (
      <div style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: '20px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: 14,
          color: '#dc2626',
          margin: '0 0 14px',
          lineHeight: 1.5
        }}>
          {initError}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '9px 22px',
            background: '#111111',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.04em'
          }}>
          Try Again
        </button>
      </div>
    )
  }

  if (!clientSecret || !stripePromise) return null

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: 'en',
        appearance: { theme: 'none' }
      }}>
      <CardForm
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
        amount={amount}
        orderId={orderId}
      />
    </Elements>
  )
}
