export const metadata = { title: 'What friends can see · Toli' };

/** Placeholder until milestone 6 fills in the DPDP copy and grievance contact from Privacy.dc.html. */
export default function PrivacyPage() {
  return (
    <main
      style={{
        padding: '52px 24px',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <h1
        style={{ margin: 0, fontFamily: 'var(--toli-font-serif)', fontWeight: 500, fontSize: 28 }}
      >
        What friends can see
      </h1>
      <p style={{ margin: 0, color: 'var(--toli-ink-3)', fontSize: 15, lineHeight: 1.5 }}>
        Your name and the names of the cards you choose to share, in the groups you share them with.
        Toli keeps a hash of your phone number so friends can find you. It never stores a card
        number, expiry, CVV, limit or spend. There is no field for them.
      </p>
    </main>
  );
}
