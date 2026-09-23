/* smooth same-site page transitions */
(function(){
  function fade(e, href){
    if (!href || href.indexOf('http')===0 || href.indexOf('#')===0) return;
    e.preventDefault();
    document.documentElement.style.transition='opacity .25s ease';
    document.documentElement.style.opacity='0';
    setTimeout(function(){ location.href = href; }, 240);
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0)==='#') return;
    if (href.indexOf('mailto:')===0) return;
    fade(e, href);
  });
  document.documentElement.style.opacity='0';
  requestAnimationFrame(function(){
    document.documentElement.style.transition='opacity .4s ease';
    document.documentElement.style.opacity='1';
  });
})();
