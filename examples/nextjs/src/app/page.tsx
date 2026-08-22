import Image from 'next/image';
import {ComponentShowcase} from './showcase';

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow">
              <Image src="/brand/incld-mark.svg" alt="" width={24} height={24} />
              @incld component reference
            </div>
            <h1>Operational workflows that feel native to your product.</h1>
            <p>
              One trusted backend integration and one browser provider power schedules,
              approvals, bulk progress, and a shared audit trail.
            </p>
          </div>
          <div className="contract-card" aria-label="Integration contract">
            <span>Browser</span><strong>/api/incld/v1</strong>
            <span>Identity</span><strong>Resolved on your server</strong>
            <span>Delivery</span><strong>Signed webhook</strong>
          </div>
        </div>
      </header>
      <ComponentShowcase />
    </main>
  );
}
