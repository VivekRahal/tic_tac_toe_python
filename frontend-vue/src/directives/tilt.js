const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const TiltDirective = {
  mounted(el) {
    const handleMouseMove = (event) => {
      const bounds = el.getBoundingClientRect();
      const offsetX = event.clientX - bounds.left;
      const offsetY = event.clientY - bounds.top;

      const rotateY = ((offsetX / bounds.width) - 0.5) * 16;
      const rotateX = ((offsetY / bounds.height) - 0.5) * -16;

      el.style.setProperty('--rotate-x', `${clamp(rotateX, -16, 16).toFixed(2)}deg`);
      el.style.setProperty('--rotate-y', `${clamp(rotateY, -16, 16).toFixed(2)}deg`);
    };

    const handleMouseEnter = () => {
      el.classList.add('is-active');
    };

    const handleMouseLeave = () => {
      el.classList.remove('is-active');
      el.style.setProperty('--rotate-x', '0deg');
      el.style.setProperty('--rotate-y', '0deg');
    };

    el.__tiltHandlers = { handleMouseMove, handleMouseEnter, handleMouseLeave };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
  },
  unmounted(el) {
    const handlers = el.__tiltHandlers;
    if (!handlers) {
      return;
    }

    el.removeEventListener('mousemove', handlers.handleMouseMove);
    el.removeEventListener('mouseenter', handlers.handleMouseEnter);
    el.removeEventListener('mouseleave', handlers.handleMouseLeave);

    delete el.__tiltHandlers;
  }
};

export default TiltDirective;
