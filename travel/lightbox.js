// 이벤트 사진 링크를 라이트박스로 연다. 스크립트가 없어도 링크는 원본 WebP로 열린다.
(() => {
  const box = document.querySelector('.lightbox');
  if (!box) return;
  const links = [...document.querySelectorAll('.shots a')];
  const img = box.querySelector('img');
  const cap = box.querySelector('.lb-cap');
  const count = box.querySelector('.lb-count');
  let i = 0;

  const dayOf = (a) => a.closest('.day');

  function show(n) {
    i = (n + links.length) % links.length;
    const a = links[i];
    const day = dayOf(a);
    const inDay = [...day.querySelectorAll('.shots a')];
    img.src = a.href;
    img.alt = a.querySelector('img').alt;
    cap.textContent = a.dataset.caption || '';
    count.textContent = `${day.querySelector('h2').textContent} ${a.dataset.time || ''} · ${inDay.indexOf(a) + 1} / ${inDay.length}`;
    // 다음 장을 미리 받아 둔다
    new Image().src = links[(i + 1) % links.length].href;
  }

  links.forEach((a, n) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      show(n);
      box.showModal();
    })
  );

  box.querySelector('.lb-prev').onclick = () => show(i - 1);
  box.querySelector('.lb-next').onclick = () => show(i + 1);
  box.querySelector('.lb-close').onclick = () => box.close();
  box.addEventListener('close', () => links[i].focus());

  // 사진 바깥 빈 곳을 누르면 닫는다
  box.addEventListener('click', (e) => {
    if (e.target === box) box.close();
  });

  document.addEventListener('keydown', (e) => {
    if (!box.open) return;
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });

  let x0 = null;
  img.addEventListener('pointerdown', (e) => (x0 = e.clientX));
  img.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
  });
})();
