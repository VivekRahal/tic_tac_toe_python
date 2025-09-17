<template>
  <div class="sticky-cta" id="download" role="region" aria-label="Mobile download call to action">
    <a href="#" class="btn">Download the app</a>
  </div>
</template>

<style scoped>
.sticky-cta { position: fixed; left: 0; right: 0; bottom: 0; display: none; padding: .6rem 1rem; background: rgba(255,255,255,.96); border-top: 1px solid rgba(15,23,42,.06); box-shadow: 0 -6px 16px rgba(2,6,23,.06); z-index: 30; }
.btn { display: block; width: 100%; text-align: center; background: #0BB889; color: #fff; font-weight: 800; padding: .9rem 1.1rem; border-radius: 999px; text-decoration: none; }
@media (max-width: 640px) { .sticky-cta { display: block; } }
</style>

