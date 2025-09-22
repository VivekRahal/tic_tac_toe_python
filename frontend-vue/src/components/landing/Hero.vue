<script setup>
import { ref } from 'vue'

// Prefer a UK house photo (Unsplash), with local JPG/PNG fallbacks
const heroCandidates = [
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1600&auto=format&fit=crop',
  '/hero-attachment.jpg',
  '/hero-attachment.png'
]
const heroIndex = ref(0)
const heroSrc = ref(heroCandidates[heroIndex.value])

const onHeroError = () => {
  if (heroIndex.value < heroCandidates.length - 1) {
    heroIndex.value += 1
    heroSrc.value = heroCandidates[heroIndex.value]
  }
}
</script>

<template>
  <section id="product" class="hero" aria-labelledby="hero-title">
    <div class="container hero__grid">
      <div class="hero__copy">
        <h1 id="hero-title">Spot property defects in seconds</h1>
        <p class="sub">Upload photos from a viewing and get instant, AI‑backed observations about damp, mould, cracks and other visible issues.</p>
        <div class="badges" aria-label="App store badges">
          <a class="badge-link" href="#" rel="noopener" aria-label="Download on the App Store">
            <img class="badge" loading="lazy" alt="Download on the App Store" src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" />
          </a>
          <a class="badge-link" href="#" rel="noopener" aria-label="Get it on Google Play">
            <img class="badge" loading="lazy" alt="Get it on Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" />
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container { max-width: 100%; width: 100%; margin: 0; padding: 2.5rem 0; }
.hero__grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 2rem; align-items: center; justify-items: center; min-height: auto; }
.hero__copy { grid-column: 1 / -1; max-width: 720px; margin: 0 auto; text-align: center; }

h1 { color: #0B1F3B; font-weight: 800; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; margin: 0 0 .75rem; }
.sub { color: #334155; font-size: 1.05rem; margin: 0 0 1.25rem; }
.badges { display: inline-flex; gap: .8rem; margin-top: 1.1rem; align-items: center; justify-content: center; flex-wrap: wrap; }
.badge-link { display: inline-flex; align-items: center; }
.badge { height: 56px; width: auto; filter: drop-shadow(0 8px 18px rgba(0,0,0,.25)); }

/* (phone mock removed in favor of AI hero image) */

@media (max-width: 960px) {
  .hero__copy { grid-column: 1 / -1; }
  .container { padding-top: 1.6rem; }
  .badge { height: 48px; }
}
</style>
