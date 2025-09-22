<template>
  <section class="benefits" aria-labelledby="benefits-title">
    <div class="container">
      <h2 id="benefits-title" class="section-title">Why HomeScan</h2>
      <div class="cards">
        <article class="card" tabindex="0">
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="#0BB889" d="M9 16.2l-3.5-3.5L4 14.2 9 19l11-11-1.4-1.4z"/></svg>
          </span>
          <h3>Instant AI insights</h3>
          <p>Get a quick read on visible issues directly from your photos.</p>
        </article>
        <article class="card" tabindex="0">
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="#0BB889" d="M12 2L2 7v6c0 5 3.8 9.7 10 11 6.2-1.3 10-6 10-11V7l-10-5zm0 18a8 8 0 01-8-8V8.3l8-4 8 4V12a8 8 0 01-8 8z"/></svg>
          </span>
          <h3>Avoid costly surprises</h3>
          <p>Flag damp, mould or cracking early so you can plan next steps.</p>
        </article>
        <article class="card" tabindex="0">
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="#0BB889" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
          </span>
          <h3>Smarter viewings</h3>
          <p>Focus your questions on what matters while you’re on site.</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container { max-width: 100%; width: 100%; margin: 0; padding: 1rem 0 2.25rem; }
.section-title { margin: 0 0 1rem; font-size: 1.6rem; color: #0B1F3B; }
.cards { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; }
.card { grid-column: span 4; background: rgba(255,255,255,0.82); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.65); border-radius: 16px; padding: 1.25rem; box-shadow: 0 8px 22px rgba(2,6,23,.06); }
.card h3 { margin: .4rem 0 .3rem; color: #0B1F3B; font-size: 1.1rem; }
.card p { margin: 0; color: #334155; }
.icon { display: inline-grid; place-items: center; width: 36px; height: 36px; background: #ecfdf5; border-radius: 10px; }
.icon svg { width: 22px; height: 22px; }
@media (max-width: 960px) { .card { grid-column: span 6; } }
@media (max-width: 640px) { .card { grid-column: 1 / -1; } }
</style>
