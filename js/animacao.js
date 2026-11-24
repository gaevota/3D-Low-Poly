/* ============================================================================
   animacao.js — altura dos pés em relação ao chão e o laço de animação (frame), que chama tudo a cada quadro.
   Define: footLift(), frame()
   Usa:    tudo o que os outros arquivos definem; por isso é o último da lista
   ============================================================================ */

/* Altura que o corpo precisa subir para o ponto mais baixo da sola (calcanhar ou ponta, dos dois pés) ficar no chão.
   Cada ponto passa pelas mesmas rotações do modelo: tênis (em torno do tornozelo), perna (em torno do quadril,
   y = 4) e inclinação do corpo ao correr (em torno dos pés). Antes só se descontava o encurtamento da perna,
   e a ponta do tênis afundava no chão ao andar e, mais ainda, ao correr. */
var HIP_Y = 4.0, ANKLE_Y = 0.7, SOLE_Z = [-0.38, 1.3], FOOT_PITCH = 0.5;
function footLift(a, lean) {
  var minY = 0, cl = Math.cos(lean), sl = Math.sin(lean);
  a.legs.forEach(function (l) {
    var th = l.g.rotation.x, ph = l.shoe ? l.shoe.rotation.x : 0;
    var ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    SOLE_Z.forEach(function (z) {
      var Y = ANKLE_Y - ANKLE_Y * cp - z * sp - HIP_Y, Z = -ANKLE_Y * sp + z * cp;   /* depois do giro do tênis (em torno do tornozelo), em relação ao quadril */
      var y2 = HIP_Y + Y * ct - Z * st, z2 = Y * st + Z * ct;  /* depois do giro da perna */
      var y3 = y2 * cl - z2 * sl;                              /* depois da inclinação do corpo */
      if (y3 < minY) minY = y3;
    });
  });
  return -minY;
}

var last = performance.now();
function frame(now) {
  var dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing) updatePlay(dt);
  if (auto && !drag && !playing) yaw += dt * 0.45;
  rig.rotation.y = yaw;
  var wz = 0, wt = 0;
  if (waveT0 >= 0) {
    var w = (now - waveT0) / 1000;
    if (w >= WAVE_DUR) { waveT0 = -1; }
    else {
      var up = Math.max(0, Math.min(1, w / 0.4, (WAVE_DUR - w) / 0.4));
      up = up * up * (3 - 2 * up);
      wt = up;
      wz = up * (2.55 + (reduce ? 0 : 0.3 * Math.sin(w * 9)));
    }
  }
  var a = active;
  a.armRG.rotation.z = wz;
  a.hand1.quaternion.setFromAxisAngle(a.handUp, wt * Math.PI / 2).multiply(a.handBaseQ);
  a.hand1.position.x = a.handX + 0.03 * (1 - wt);   /* afastamento só em repouso: no aceno a mão fica centrada no antebraço */
  var gaitOn = playing ? moving : (walking || running);
  var runOn = playing ? (moving && sprint) : running;
  walkK += ((gaitOn ? 1 : 0) - walkK) * Math.min(1, dt * 6);
  runK += ((runOn ? 1 : 0) - runK) * Math.min(1, dt * 6);
  var la = 0.35 + 0.25 * runK, aa = 0.4 + 0.4 * runK;
  /* Vestido: a saia comprida é parada e as pernas giram em torno do quadril (y = 4,0), 0,9 acima da barra (y = 3,1).
     Com o passo aberto, a coxa saía pela lateral da saia. Passo máximo de 0,28 rad (cerca de 16°): nessa conta a coxa
     fica a ~0,53 do centro e a saia tem ~0,57 de folga naquela altura. Vale também para correr. */
  if (a.outfit === 'vestido') la = Math.min(la, 0.28);
  if (walkK > 0.001) walkPh += dt * (6.5 + 5 * runK);
  var sw = Math.sin(walkPh) * walkK;
  a.legs.forEach(function (l) {
    l.g.rotation.x = l.s * sw * la;
    if (l.shoe) l.shoe.rotation.x = -FOOT_PITCH * l.g.rotation.x;   /* o pé gira contra a perna, em torno do tornozelo, para a sola ficar mais plana */
  });
  a.armLG.rotation.x = sw * aa;
  a.armRG.rotation.x = waveT0 >= 0 ? 0 : -sw * aa;
  a.character.position.y = (playing ? pl.y : -4.6) + footLift(a, 0.12 * runK);
  if (playing) {
    a.character.position.x = pl.x;
    a.character.position.z = pl.z;
    a.character.rotation.y = pl.face;
  }
  a.character.rotation.x = 0.12 * runK;
  rig.rotation.x = pitch;
  zoomCur += (zoom - zoomCur) * Math.min(1, dt * 8);
  if (playing) applyPlayCamera(); else applyCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
