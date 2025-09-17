<template>
  <header class="nav" role="banner">
    <div class="container nav__inner">
      <a href="#top" class="brand" aria-label="HomeScan AI">
        <span class="brand__logo" aria-hidden="true">◼</span>
        <span class="brand__text">HomeScan AI</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        <a href="#product" class="nav__link">Product</a>
        <a href="#resources" class="nav__link">Resources</a>
        <a href="#about" class="nav__link">About</a>
        <a href="#contact" class="nav__link">Contact</a>
        <a href="#download" class="btn btn--small btn--primary">Download</a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav { position: sticky; top: 0; background: #ffffff; border-bottom: 1px solid rgba(15,23,42,0.06); z-index: 20; }
.container { max-width: 1100px; margin: 0 auto; padding: .9rem 1rem; display: flex; align-items: center; justify-content: space-between; }
.brand { display: inline-flex; align-items: center; gap: .6rem; color: #0B1F3B; font-weight: 800; text-decoration: none; letter-spacing: .01em; }
.brand__logo { width: 20px; height: 20px; display: inline-grid; place-items: center; background: #0BB889; color: white; border-radius: 4px; font-size: .8rem; }
.nav__links { display: inline-flex; align-items: center; gap: 1rem; }
.nav__link { color: #334155; text-decoration: none; font-weight: 600; }
.nav__link:hover { color: #0B1F3B; }
.btn { border: none; border-radius: 999px; padding: .6rem 1rem; font-weight: 700; cursor: pointer; text-decoration: none; }
.btn--small { padding: .5rem .9rem; font-size: .95rem; }
.btn--primary { background: #0BB889; color: white; }
@media (max-width: 720px) { .nav__links { gap: .6rem; } .brand__text { font-weight: 800; } }
</style>

