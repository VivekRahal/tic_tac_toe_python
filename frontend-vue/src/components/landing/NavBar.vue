<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const user = ref(null)
const menuOpen = ref(false)
const menuRef = ref(null)

const refreshUser = () => {
  try { user.value = JSON.parse(localStorage.getItem('hs_user') || 'null') } catch { user.value = null }
}

const logout = () => {
  localStorage.removeItem('hs_token')
  localStorage.removeItem('hs_user')
  refreshUser()
  menuOpen.value = false
  router.push({ name: 'home' })
}

onMounted(() => {
  refreshUser()
  document.addEventListener('click', onGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick)
})

const onGlobalClick = (e) => {
  if (!menuRef.value) return
  if (!menuRef.value.contains(e.target)) menuOpen.value = false
}

const onScanPage = computed(() => route.name === 'scan')

const userInitial = computed(() => {
  const u = user.value
  const src = (u?.name || u?.email || '').trim()
  return src ? src[0].toUpperCase() : 'U'
})
</script>

<template>
  <header class="nav" role="banner">
    <div class="container nav__inner">
      <router-link to="/" class="brand" aria-label="HomeScan AI">
        <span class="brand__logo" aria-hidden="true">◼</span>
        <span class="brand__text">HomeScan AI</span>
      </router-link>
      <nav class="nav__links" aria-label="Primary">
        <a href="#product" class="nav__link">Product</a>
        <a href="#resources" class="nav__link">Resources</a>
        <a href="#about" class="nav__link">About</a>
        <a href="#contact" class="nav__link">Contact</a>
        <template v-if="user?.name || user?.email">
          <router-link v-if="!onScanPage" class="btn btn--small btn--blue" :to="{ name: 'scan' }">Quick Scan</router-link>
          <div class="user-menu" ref="menuRef">
            <button class="avatar" type="button" @click="menuOpen = !menuOpen" :aria-expanded="menuOpen ? 'true' : 'false'" aria-haspopup="true" :title="user.name || user.email">
              <span class="avatar__initial">{{ userInitial }}</span>
            </button>
            <div v-if="menuOpen" class="menu" role="menu">
              <div class="menu__header">{{ user.name || user.email }}</div>
              <button class="menu__item" role="menuitem" @click="logout">Logout</button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link class="btn btn--small btn--primary" :to="{ name: 'login' }">Log In</router-link>
          <router-link class="btn btn--small btn--primary" :to="{ name: 'signup' }">Sign Up</router-link>
        </template>
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
.btn--blue { background: #2563eb; color: #fff; }
/* User avatar + menu (top-right) */
.user-menu { position: relative; display: inline-flex; align-items: center; }
.avatar { width: 36px; height: 36px; border-radius: 999px; border: none; cursor: pointer; display: grid; place-items: center; box-shadow: 0 10px 24px rgba(37,99,235,.25); background: radial-gradient(120px 80px at 30% 30%, #60a5fa 0%, #2563eb 40%, #1d4ed8 100%); color: #fff; }
.avatar__initial { font-weight: 900; letter-spacing: .02em; text-shadow: 0 1px 0 rgba(0,0,0,.15); }
.menu { position: absolute; right: 0; top: calc(100% + 8px); background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 10px; min-width: 200px; box-shadow: 0 16px 36px rgba(2,6,23,.14); overflow: hidden; z-index: 50; }
.menu__header { padding: .6rem .8rem; font-weight: 800; color: #0B1F3B; border-bottom: 1px dashed rgba(2,6,23,.08); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu__item { display: block; width: 100%; text-align: left; padding: .6rem .8rem; background: #fff; border: none; cursor: pointer; font-weight: 800; color: #0B1F3B; }
.menu__item:hover { background: #f1f5f9; }
@media (max-width: 720px) { .nav__links { gap: .6rem; } .brand__text { font-weight: 800; } }
</style>
