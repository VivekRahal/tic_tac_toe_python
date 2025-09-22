<template>
  <footer id="contact" class="footer" role="contentinfo">
    <div class="container">
      <div class="cols">
        <div class="col">
          <h3 class="brand">HomeScan AI</h3>
          <p class="muted">Helping UK buyers make confident decisions with clear, visual insights.</p>
        </div>
        <nav class="col" aria-label="Footer">
          <h4>Links</h4>
          <ul class="links">
            <li><a href="#product">Product</a></li>
            <li><a href="#resources">Resources</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#download">Download</a></li>
          </ul>
        </nav>
        <div class="col small-print">
          <p>HomeScan AI does not provide professional surveying services. Findings are indicative and based only on image content.</p>
        </div>
      </div>
      <div class="legal">© {{ new Date().getFullYear() }} HomeScan AI. All rights reserved.</div>
    </div>
  </footer>
</template>

<style scoped>
.container { max-width: 100%; width: 100%; margin: 0; padding: 2rem 0; }
.cols { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; }
.col { grid-column: span 4; }
.brand { margin: 0 0 .4rem; color: #0B1F3B; }
.muted { color: #334155; margin: 0; }
h4 { margin: 0 0 .4rem; color: #0B1F3B; }
.links { list-style: none; padding: 0; margin: 0; display: grid; gap: .35rem; }
.links a { color: #334155; text-decoration: none; }
.links a:hover { color: #0B1F3B; }
.small-print { grid-column: span 4; color: #64748b; }
.legal { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(15,23,42,.06); color: #64748b; font-size: .9rem; }
@media (max-width: 960px) { .col { grid-column: span 6; } .small-print { grid-column: span 12; } }
</style>
