const ads = [
  { id: 'reseau-120-mpaka', image: 'images/pub/Re%CC%81sau%20120.png', href: null, alt: 'Réseau 120 MPAKA - Campagne de pré-adhésion', label: 'Réseau 120 MPAKA' },
  { id: 'les-cancres-heureux', image: 'images/pub/les%20canceres%20heureux.png', href: 'https://www.fnac.com/a21699840/Cedric-Mpindy-Les-Cancres-heureux', alt: 'Les Cancres heureux de Cédric Mpindy', label: 'Les Cancres heureux' },
  { id: 'le-sabre-et-le-goupillon', image: 'images/pub/Le%20sabre%20et%20le%20goupillon.png', href: 'https://www.leslettresmouchetees.com/product-page/le-sabre-et-le-goupillon', alt: 'Le Sabre et le Goupillon de Philippe Moukoko', label: 'Le Sabre et le Goupillon' },
];

const carousel = document.querySelector('[data-ad-carousel]');

if (carousel) {
  const track = carousel.querySelector('[data-ad-carousel-track]');
  const dots = carousel.querySelector('[data-ad-carousel-dots]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentIndex = 0;
  let autoplayTimer = null;
  let touchStartX = null;

  function onAdImpression(adId) { console.debug('[ad impression]', adId); }
  function onAdClick(adId) { console.debug('[ad click]', adId); }

  function createSlide(ad, index) {
    const slide = document.createElement('article');
    slide.className = 'ad-carousel__slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} sur ${ads.length} : ${ad.label}`);

    const image = document.createElement('img');
    image.src = ad.image;
    image.alt = ad.alt;
    image.width = 1190;
    image.height = 256;
    image.decoding = 'async';
    image.loading = index === 0 ? 'eager' : 'lazy';
    if (index === 0) image.fetchPriority = 'high';

    if (ad.href) {
      const link = document.createElement('a');
      link.href = ad.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.addEventListener('click', () => onAdClick(ad.id));
      link.append(image);
      slide.append(link);
    } else {
      slide.append(image);
    }
    return slide;
  }

  function showSlide(index, announce = true) {
    currentIndex = (index + ads.length) % ads.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    [...dots.children].forEach((dot, dotIndex) => {
      const active = dotIndex === currentIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (announce) onAdImpression(ads[currentIndex].id);
  }

  function stopAutoplay() {
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function startAutoplay() {
    if (reduceMotion.matches || autoplayTimer) return;
    autoplayTimer = window.setInterval(() => showSlide(currentIndex + 1), 6000);
  }

  ads.forEach((ad, index) => {
    track.append(createSlide(ad, index));
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'ad-carousel__dot';
    dot.setAttribute('aria-label', `Afficher la publicité ${ad.label}`);
    dot.addEventListener('click', () => {
      showSlide(index);
      stopAutoplay();
      startAutoplay();
    });
    dots.append(dot);
  });

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', (event) => {
    if (!carousel.contains(event.relatedTarget)) startAutoplay();
  });
  carousel.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 40) showSlide(currentIndex + (distance < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });
  reduceMotion.addEventListener('change', () => {
    stopAutoplay();
    startAutoplay();
  });

  showSlide(0);
  startAutoplay();
}