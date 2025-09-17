<template>
  <section id="resources" class="faq" aria-labelledby="faq-title">
    <div class="container">
      <h2 id="faq-title" class="section-title">FAQ</h2>
      <div class="grid">
        <details class="item">
          <summary>Does this replace a professional survey?</summary>
          <p>No. It helps you spot visible issues early. Always seek professional advice before making decisions.</p>
        </details>
        <details class="item">
          <summary>What photos work best?</summary>
          <p>Well‑lit, in‑focus images taken straight on. Include close‑ups and a wider context if possible.</p>
        </details>
        <details class="item">
          <summary>Is my data private?</summary>
          <p>We process images securely and never sell personal data. You can delete uploads any time.</p>
        </details>
        <details class="item">
          <summary>Will it detect hidden problems?</summary>
          <p>It only analyses what’s visible in the image. Hidden issues require further investigation.</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 1rem 1rem 2.25rem; }
.section-title { margin: 0 0 1rem; font-size: 1.6rem; color: #0B1F3B; }
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; }
.item { grid-column: span 6; background: #fff; border: 1px solid rgba(15,23,42,.08); border-radius: 12px; padding: .9rem 1rem; }
.item>summary { cursor: pointer; font-weight: 700; color: #0B1F3B; outline: none; }
.item p { margin: .6rem 0 0; color: #334155; }
@media (max-width: 960px) { .item { grid-column: span 12; } }
</style>

