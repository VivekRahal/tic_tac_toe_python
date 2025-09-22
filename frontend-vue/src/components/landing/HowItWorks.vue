<template>
  <section class="how" aria-labelledby="how-title">
    <div class="container">
      <h2 id="how-title" class="section-title">How it works</h2>
      <ol class="steps">
        <li class="step"><span class="num">1</span><div><h3>Snap photos</h3><p>Take clear shots of areas you want to check.</p></div></li>
        <li class="step"><span class="num">2</span><div><h3>Get findings</h3><p>AI highlights visible signs of damp, mould, and cracks.</p></div></li>
        <li class="step"><span class="num">3</span><div><h3>Decide next steps</h3><p>Use the summary to focus questions or plan a survey.</p></div></li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.container { max-width: 100%; width: 100%; margin: 0; padding: 1rem 0 2.25rem; }
.section-title { margin: 0 0 1rem; font-size: 1.6rem; color: #0B1F3B; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; }
.step { grid-column: span 4; display: grid; grid-template-columns: auto 1fr; align-items: start; gap: .75rem; background: rgba(255,255,255,0.82); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.65); border-radius: 16px; padding: 1rem; }
.num { width: 32px; height: 32px; display: inline-grid; place-items: center; background: #0BB889; color: white; border-radius: 8px; font-weight: 800; }
.step h3 { margin: 0 0 .25rem; color: #0B1F3B; font-size: 1.05rem; }
.step p { margin: 0; color: #334155; }
@media (max-width: 960px) { .step { grid-column: span 6; } }
@media (max-width: 640px) { .step { grid-column: 1 / -1; } }
</style>
