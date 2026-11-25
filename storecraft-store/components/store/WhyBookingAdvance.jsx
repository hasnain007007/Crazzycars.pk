import { COD_ADVANCE_TIERS } from "@/config/checkout-money";
import { codAdvanceTierList } from "@/lib/storePolicyCopy";

/**
 * "Why we ask for a small booking advance" — the owner's honest, human explanation in
 * English and Urdu. Amounts come from COD_ADVANCE_TIERS (never hard-coded), so this
 * always matches checkout. Used on /founder and /advance-payment.
 */
const num = (n) => Number(n).toLocaleString("en-PK");
const MIN = COD_ADVANCE_TIERS[0].amount;
const MAX = COD_ADVANCE_TIERS[COD_ADVANCE_TIERS.length - 1].amount;
const RANGE_EN = `Rs ${num(MIN)}–${num(MAX)}`;
const RANGE_UR = `${num(MIN)} سے ${num(MAX)} روپے`;

const EN = [
  "Almost every product at CrazzyCars is chosen by hand, and many of them are unique. We usually have only a few pieces of each — and very often, several people want the same one.",
  "When an order is placed but the parcel is not received at the door, it comes back to us. We lose the delivery charges both ways and the packaging. And what hurts even more: that piece spent days on the road while another customer, who truly wanted it, had to hear “sorry, out of stock”.",
  "We are not a giant company with thousands of pieces in a warehouse. We are a small Pakistani team, and every returned parcel is a real loss for us.",
  `That is why we ask for a small booking advance of ${RANGE_EN}, depending on your order. It is not an extra charge — it is deducted from your total, and you pay the rest in cash when your parcel arrives. It simply tells us you really want it, so we can keep that piece just for you.`,
  "Thank you for understanding — and for helping a small business keep its promise to every customer.",
];

const UR = [
  "CrazzyCars کی تقریباً ہر پروڈکٹ ہم خود چن کر لاتے ہیں، اور ان میں سے بہت سی منفرد ہوتی ہیں۔ ہمارے پاس اکثر ہر چیز کے صرف چند پیس ہوتے ہیں — اور بہت دفعہ ایک ہی چیز کے کئی خریدار ہوتے ہیں۔",
  "جب کوئی آرڈر لگا کر دروازے پر پارسل وصول نہیں کرتا تو وہ پارسل ہمارے پاس واپس آ جاتا ہے۔ آنے جانے کا ڈیلیوری خرچ اور پیکنگ، دونوں کا نقصان ہمیں اٹھانا پڑتا ہے۔ اور سب سے زیادہ دکھ اس بات کا ہوتا ہے کہ وہ پیس کئی دن راستے میں رہا، جبکہ کوئی دوسرا گاہک جو سچ میں وہ چیز لینا چاہتا تھا، اسے ہمیں کہنا پڑا: “معذرت، اسٹاک ختم ہے”۔",
  "ہم کوئی بڑی کمپنی نہیں جس کے گودام میں ہزاروں پیس پڑے ہوں۔ ہم ایک چھوٹی پاکستانی ٹیم ہیں، اور ہر واپس آنے والا پارسل ہمارے لیے اصل نقصان ہوتا ہے۔",
  `اسی لیے ہم آپ کے آرڈر کے حساب سے صرف ${RANGE_UR} کا چھوٹا سا بُکنگ ایڈوانس لیتے ہیں۔ یہ کوئی اضافی چارج نہیں — یہ آپ کے کل بل میں سے کاٹ لیا جاتا ہے، اور باقی رقم آپ پارسل ملنے پر کیش میں ادا کرتے ہیں۔ اس سے ہمیں یقین ہو جاتا ہے کہ آپ واقعی یہ چیز لینا چاہتے ہیں، اور ہم وہ پیس صرف آپ کے لیے رکھ لیتے ہیں۔`,
  "آپ کی سمجھ داری کا دل سے شکریہ — اور ایک چھوٹے کاروبار کو اپنے ہر گاہک سے کیا وعدہ نبھانے میں ساتھ دینے کا بھی۔",
];

export default function WhyBookingAdvance({ signature = null, id = "why-booking-advance" }) {
  const tiers = codAdvanceTierList();
  return (
    <section className="wba" id={id} aria-labelledby={`${id}-title`}>
      <div className="wba__head">
        <p className="wba__kicker">From the owner</p>
        <h2 className="wba__title" id={`${id}-title`}>
          Why we ask for a small booking advance
        </h2>
        <p className="wba__title-ur" lang="ur" dir="rtl">
          ہم چھوٹا سا بُکنگ ایڈوانس کیوں لیتے ہیں؟
        </p>
      </div>

      <ul className="wba__tiers" aria-label="Booking advance by order total">
        {tiers.map((t) => (
          <li key={t.amount}>
            <strong>{t.amount}</strong>
            <span>{t.range}</span>
          </li>
        ))}
      </ul>
      <p className="wba__note">Deducted from your total — not an extra charge.</p>

      <div className="wba__cols">
        <div className="wba__col" lang="en">
          <p className="wba__lang">English</p>
          {EN.map((p) => (
            <p key={p.slice(0, 30)}>{p}</p>
          ))}
        </div>
        <div className="wba__col wba__col--ur" lang="ur" dir="rtl">
          <p className="wba__lang">اردو</p>
          {UR.map((p) => (
            <p key={p.slice(0, 30)}>{p}</p>
          ))}
        </div>
      </div>

      {signature ? <div className="wba__sign">{signature}</div> : null}
    </section>
  );
}
