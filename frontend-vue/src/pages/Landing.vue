<script setup>
import NavBar from '../components/landing/NavBar.vue'
import Hero from '../components/landing/Hero.vue'
import Benefits from '../components/landing/Benefits.vue'
import HowItWorks from '../components/landing/HowItWorks.vue'
import FooterSection from '../components/landing/FooterSection.vue'
import StickyCTA from '../components/landing/StickyCTA.vue'
</script>

<template>
  <div>
    <div class="background" aria-hidden="true"></div>
    <div class="app" role="application">
      <NavBar />
      <Hero />
      <!-- QuickScan is only available on the authenticated Scan page -->
      <Benefits />
      <HowItWorks />
      <FooterSection />
      <StickyCTA />
    </div>
  </div>
  
</template>
