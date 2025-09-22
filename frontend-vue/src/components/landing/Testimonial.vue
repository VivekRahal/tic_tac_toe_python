<template>
  <section class="testimonial" aria-labelledby="testimonial-title">
    <div class="container">
      <h2 id="testimonial-title" class="sr-only">Testimonial</h2>
      <blockquote class="quote">
        <p>“Quick scan flagged a kitchen damp patch I missed.”</p>
        <footer>
          <div class="avatar" aria-hidden="true">UK</div>
          <cite>UK buyer</cite>
        </footer>
      </blockquote>
    </div>
  </section>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.container { max-width: 100%; width: 100%; margin: 0; padding: 1rem 0 2.25rem; }
.quote { margin: 0; background: #f8fafc; border: 1px solid rgba(15,23,42,.06); border-radius: 16px; padding: 1.4rem; box-shadow: 0 6px 16px rgba(2,6,23,.05); }
.quote p { margin: 0 0 .8rem; font-size: 1.1rem; color: #0B1F3B; font-weight: 700; }
footer { display: inline-flex; align-items: center; gap: .6rem; color: #334155; }
.avatar { width: 28px; height: 28px; border-radius: 999px; background: #0BB889; color: white; display: inline-grid; place-items: center; font-weight: 800; font-size: .8rem; }
</style>
