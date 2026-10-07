/* Y-AKIO · site de pedidos (demonstração Zync). JS compartilhado por todas as páginas.
   Lê e grava dados somente por window.YK (../shared/data.js). Estado do cliente em localStorage próprio:
   yk_cliente (dados, CEP, últimos pedidos), yk_carrinho (sacola), yk_voucher (prêmio escolhido). */
(() => {
  'use strict';
  const YK = window.YK;
  if (!YK) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px;font-weight:700">Não foi possível carregar os dados da loja (shared/data.js).</p>'); return; }
  const PAGE = document.body.dataset.page || 'home';

  /* ---------- utilidades ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = YK.brl;
  const LS = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const soNum = v => String(v || '').replace(/\D/g, '');
  const digits = v => { let d = soNum(v); if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2); return d.slice(0, 11); };
  const maskTel = v => {
    const d = digits(v);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  };
  const maskCep = v => { const d = soNum(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
  const telOk = v => { const n = digits(v).length; return n === 10 || n === 11; };
  const pad = n => (n < 10 ? '0' : '') + n;
  const hhmm = d => { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const horaCurta = d => d.getHours() + 'h' + (d.getMinutes() ? pad(d.getMinutes()) : '');
  const ddmm = d => { d = new Date(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
  const peso = g => g >= 1000 ? String(g / 1000).replace('.', ',') + ' kg' : g + ' g';
  const num = v => { const n = parseFloat(String(v || '').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const go = url => { location.href = url; };

  const P = {
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5h7l3-6h3M12.5 7H15l1.6 3.5M8 10.5h4"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    gift: '<path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13"/><path d="M12 7C10.5 3.5 6.6 3.6 7 6c.3 1.3 2.5 1 5 1zm0 0c1.5-3.5 5.4-3.4 5-1-.3 1.3-2.5 1-5 1z"/>',
    rep: '<path d="M4 11a8 8 0 0114-4l2 2M20 4v5h-5M20 13a8 8 0 01-14 4l-2-2M4 20v-5h5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    wa: '<path d="M4 20l1.3-4.2A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z"/><path d="M9.3 8.6c-.4 2.7 2.4 5.7 5.6 6.1l1.1-1.6-1.9-1-.8.8c-1-.4-1.8-1.2-2.2-2.2l.8-.8-1-1.9-1.6.6z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-4 14-12 14M5 19c2-4 5-7 9-9"/>',
    star: '<path d="M12 4l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 4z"/>',
    ticket: '<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z"/><path d="M14 7v2M14 11v2M14 15v2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15h4"/>',
    cash: '<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6.5 10v.01M17.5 15v.01"/>',
    pix: '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12 12 3.5z"/><path d="M8 8l4 4 4-4M8 16l4-4 4 4"/>',
    pos: '<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    warn: '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4.5M12 17.4h.01"/>',
    no: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
    map: '<path d="M9 5l-5 2v12l5-2 6 2 5-2V5l-5 2-6-2zM9 5v12M15 7v12"/>'
  };
  const ic = (n, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>';

  const FOTO = { camarao: 'prato-camarao.jpg', carne: 'prato-carne.jpg', frango: 'chapa2.jpg', mistao: 'prato-camarao.jpg', misto: 'prato-carne.jpg', vegetariano: 'legumes.jpg' };
  const foto = s => '../assets/' + (FOTO[s] || 'prato-carne.jpg');
  const OBS_RAPIDAS = ['Sem pimentão', 'Sem brócolis', 'Sem cenoura', 'Sem repolho'];
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const PM_INFO = {
    pix: ['pix', 'Aprovação na hora, por QR ou copia e cola'], credito: ['card', 'Visa, Mastercard, Elo e outras'], debito: ['card', 'Débito online, aprovado na hora'],
    dinheiro: ['cash', 'Com troco, se precisar'], cartao: ['pos', 'Débito ou crédito na maquininha']
  };
  /* cartão de teste publicado pelo Mercado Pago para ambiente de testes. Fica só em memória, nunca é gravado nem enviado. */
  const CARTAO_TESTE = { num: '5031 4332 1540 6351', nome: 'APRO', val: '11/30', cvv: '123' };

  /* ---------- estado ---------- */
  let db = YK.db();
  const cli = Object.assign({ nome: '', tel: '', tipo: '', bairro: '', cep: '', cepRes: null, rua: '', numero: '', compl: '', ref: '', pagamento: 'pix', troco: '', obs: '', ultimoPedidoId: null, ultimo: null, pedidos: [], cardTel: '' },
    LS.get('yk_cliente', {}) || {});
  if (!Array.isArray(cli.pedidos)) cli.pedidos = [];
  let cart = [];
  let vch = LS.get('yk_voucher', null);
  const ui = { sheet: null, b: null, seen: { tel: '', n: 0, v: 0 }, erro: '', lastSt: null, cepBusy: false, filtro: 'todos', pay: null, card: Object.assign({}, CARTAO_TESTE), cardErr: {}, feito: false, ckVazio: null, busy: false };
  const saveCli = () => LS.set('yk_cliente', cli);
  const saveCart = () => LS.set('yk_carrinho', cart);
  const setVch = v => { vch = v; if (v) LS.set('yk_voucher', v); else { try { localStorage.removeItem('yk_voucher'); } catch (e) {} } };

  const tam = id => db.tamanhos.find(t => t.id === id);
  const sab = id => db.sabores.find(s => s.id === id);
  const ext = id => db.extras.find(e => e.id === id);
  const pausado = k => (db.pausados || []).indexOf(k) >= 0;
  const yOff = (t, s) => pausado(t + ':' + s) || pausado(s) || pausado(t) || !YK.preco(db, t, s);
  const fid = () => db.config.fidelidade;
  const loadCart = () => { cart = (LS.get('yk_carrinho', []) || []).filter(i => i && i.qtd > 0 && (i.tipo === 'yaki' ? tam(i.tamanho) && sab(i.sabor) : i.tipo === 'extra' && ext(i.id))); };
  loadCart();

  const linhaPreco = i => i.tipo === 'yaki' ? YK.preco(db, i.tamanho, i.sabor) : (ext(i.id) || {}).preco || 0;
  const linhaOff = i => i.tipo === 'yaki' ? yOff(i.tamanho, i.sabor) : pausado(i.id);
  const linhaNome = i => i.tipo === 'yaki' ? 'Yakisoba ' + tam(i.tamanho).nome + ' · ' + sab(i.sabor).nome : ext(i.id).nome;
  const bairroSel = () => cli.tipo === 'entrega' ? db.bairros.find(x => x.nome === cli.bairro) || null : null;
  const foraZona = () => cli.tipo === 'entrega' && !!(cli.cepRes && cli.cepRes.ok && !cli.cepRes.naZona);
  function tot() {
    let sub = 0, n = 0;
    cart.forEach(i => { sub += linhaPreco(i) * i.qtd; n += i.qtd; });
    sub = Math.round(sub * 100) / 100;
    if (vch) n += 1;
    const b = bairroSel(), f = fid(), taxa = b ? b.taxa : 0, min = b ? b.min : 0, vale = f.canais.indexOf('site') >= 0;
    return { sub, n, b, taxa, min, faltaMin: Math.max(0, Math.round((min - sub) * 100) / 100), total: Math.round((sub + taxa) * 100) / 100, vale, selo: vale && sub >= f.pedidoMinimo, faltaSelo: Math.max(0, Math.round((f.pedidoMinimo - sub) * 100) / 100) };
  }
  const tempo = tipo => { const t = db.config.tempoPreparoMin || 25; return tipo === 'entrega' ? (t + 15) + ' a ' + (t + 25) + ' min' : 'cerca de ' + t + ' min'; };

  /* ---------- horário ---------- */
  function proxAbertura(now) {
    now = now || new Date(); const H = YK.LOJA.horarios;
    for (let d = 0; d < 9; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      if (H.fechado.indexOf(day.getDay()) >= 0) continue;
      for (let k = 0; k < H.turnos.length; k++) {
        const p = H.turnos[k][0].split(':'), dt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), +p[0], +p[1]);
        if (dt > now) return dt;
      }
    }
    return null;
  }
  function fechaAs(now) {
    now = now || new Date(); const H = YK.LOJA.horarios, hm = now.toTimeString().slice(0, 5);
    if (H.fechado.indexOf(now.getDay()) >= 0) return null;
    const t = H.turnos.find(x => hm >= x[0] && hm < x[1]);
    if (!t) return null;
    const p = t[1].split(':'); return (+p[0]) + 'h' + (+p[1] ? p[1] : '');
  }
  function quandoTxt(dt) {
    const now = new Date(), a = new Date(now.getFullYear(), now.getMonth(), now.getDate()), b = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const diff = Math.round((b - a) / 864e5);
    return (diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : DIAS[dt.getDay()]) + ' às ' + horaCurta(dt);
  }
  const quandoIso = iso => quandoTxt(new Date(iso));

  /* ---------- venda inteligente: só sugere tamanho maior quando a conta fecha ---------- */
  function upgrade(t, s, q) {
    const cur = tam(t); if (!cur || q < 1) return null;
    const total = YK.preco(db, t, s) * q, g = cur.gramas * q; let best = null;
    db.tamanhos.forEach(T => {
      if (T.gramas <= cur.gramas || yOff(T.id, s)) return;
      const p = YK.preco(db, T.id, s);
      if (p <= total * 1.15 && T.gramas >= g * 0.8 && (p < total || T.gramas > g)) best = { T, p, dif: Math.round((p - total) * 100) / 100, g, total, q, cur };
    });
    return best;
  }
  function upgradeHTML(u, act, extra) {
    const selo = u.dif < 0 ? 'Economize ' + brl(-u.dif) : u.dif === 0 ? 'Mesmo preço, mais comida' : 'Por mais ' + brl(u.dif) + ', mais comida';
    const serve = (u.T.desc.split(' · ')[1] || '');
    return '<div class="dica">' + ic('star') + '<div><b>Compensa levar 1 ' + esc(u.T.nome) + '. ' + selo + '.</b>' +
      u.q + 'x ' + esc(u.cur.nome) + ' = ' + brl(u.total) + ' (' + peso(u.g) + '). 1 ' + esc(u.T.nome) + ' = ' + brl(u.p) + ' (' + peso(u.T.gramas) + (serve ? ', ' + esc(serve) : '') + '), numa embalagem só.' +
      '<br><button type="button" class="btn sm alt" data-a="' + act + '" data-v="' + u.T.id + '"' + (extra || '') + '>Trocar por ' + esc(u.T.nome) + '</button></div></div>';
  }

  /* ---------- voucher ---------- */
  const cliLoja = () => telOk(cli.tel) ? YK.clientePorTel(db, digits(cli.tel)) : null;
  function checkVch() {
    if (!vch) return;
    const c = cliLoja(), ok = c && YK.vouchersAtivos(db, c).some(v => v.id === vch.id);
    if (!ok || yOff(fid().premioTamanho, vch.sabor)) setVch(null);
  }
  const saboresPremio = () => { const t = fid().premioTamanho; return db.sabores.filter(s => !yOff(t, s.id)); };

  /* ---------- casca: cabeçalho, rodapé, sacola ---------- */
  function shell() {
    const nav = [['index.html', 'Início', 'home'], ['cardapio.html', 'Cardápio', 'cardapio'], ['fidelidade.html', 'Fidelidade', 'fidelidade'], ['sobre.html', 'Sobre', 'sobre']];
    const links = nav.map(n => '<a href="' + n[0] + '"' + (n[2] === PAGE ? ' aria-current="page"' : '') + '>' + n[1] + '</a>').join('');
    const wa = esc(YK.waLink('Olá! Vim pelo site do Y-AKIO.'));
    $('#topo').innerHTML = '<div class="demo">Demonstração Zync · pedidos, taxas e pagamentos de exemplo</div>' +
      '<header class="hd sei"><div class="wrap hd-r"><a class="brand" href="index.html" aria-label="Y-AKIO, página inicial"><img src="../assets/logo.jpg" alt="" width="46" height="46"><span class="brand-n"><strong>Y-AKIO</strong><span id="hdSt"></span></span></a>' +
      '<nav class="nav" aria-label="Principal">' + links + '</nav>' +
      '<button type="button" class="hd-bag" data-a="carrinho" aria-label="Abrir sacola">' + ic('bag') + '<span>Sacola</span><b id="hdN" data-n="0">0</b></button></div></header>';
    $('#rodape').innerHTML = '<footer class="foot"><div class="wrap"><strong>Y-AKIO</strong>' +
      '<div class="foot-l"><span>' + esc(YK.LOJA.slogan) + ' · <em>' + esc(YK.LOJA.endereco) + '</em></span></div>' +
      '<div class="foot-l"><span>' + esc(YK.LOJA.horarios.texto) + '</span></div>' +
      '<nav aria-label="Rodapé">' + nav.map(n => '<a href="' + n[0] + '">' + n[1] + '</a>').join('') + '<a href="pedido.html">Acompanhar pedido</a>' +
      '<a target="_blank" rel="noopener" href="https://www.instagram.com/' + esc(YK.LOJA.instagram) + '/">@' + esc(YK.LOJA.instagram) + '</a><a target="_blank" rel="noopener" href="' + wa + '">' + esc(YK.LOJA.whatsappFmt) + '</a></nav>' +
      '<small>Site de demonstração. Bebidas, taxas de entrega, prazos e pagamentos são exemplos e serão ajustados com a loja. Nenhum pagamento é processado e nenhum dado de cartão é enviado.</small>' +
      '<div class="foot-l"><a href="../painel/index.html">Área da loja</a><span class="zy">Demonstração Zync</span></div></div></footer>' +
      '<div class="bar" id="bar" hidden></div>' +
      '<div class="ov" id="ov" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shT"><div class="sh-h"><h2 class="bg" id="shT"></h2><button type="button" data-a="fechar" aria-label="Fechar">' + ic('x') + '</button></div><div class="sh-b" id="shB"></div><div class="sh-f" id="shF"></div></div></div>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  }
  function renderHead() {
    const ab = YK.aberta(db), t = tot(), n = $('#hdN');
    $('#hdSt').innerHTML = '<i class="' + (ab ? '' : 'off') + '"></i>' + (ab ? 'Aberto agora' : 'Fechado agora');
    n.textContent = t.n; n.dataset.n = t.n;
    const info = $('#info');
    if (info) {
      const prox = ab ? null : proxAbertura(), f = fechaAs();
      info.innerHTML = '<li>' + ic('clock') + '<span><b>' + (ab ? 'Aberto agora' + (f && db.config.lojaAberta === 'auto' ? ', fecha às ' + f : '') : 'Fechado' + (prox ? ', abre ' + quandoTxt(prox) : '')) + '.</b> ' + esc(YK.LOJA.horarios.texto) + '</span></li><li>' + ic('pin') + '<em>' + esc(YK.LOJA.endereco) + '</em></li>';
    }
  }

  /* ---------- home: atalhos ---------- */
  function ultimoValido() {
    if (!cli.ultimo || !cli.ultimo.itens || !cli.ultimo.itens.length) return null;
    const its = cli.ultimo.itens.filter(i => i.tipo === 'yaki' ? tam(i.tamanho) && sab(i.sabor) && !yOff(i.tamanho, i.sabor) : ext(i.id) && !pausado(i.id));
    if (!its.length) return null;
    let total = 0;
    const txt = its.map(i => { total += linhaPreco(i) * i.qtd; return i.qtd + 'x ' + (i.tipo === 'yaki' ? tam(i.tamanho).nome + ' ' + sab(i.sabor).nome : ext(i.id).nome); }).join(' + ');
    return { itens: its, total, txt };
  }
  function renderAtalhos() {
    const el = $('#atalhos'); if (!el) return;
    const ab = YK.aberta(db), prox = ab ? null : proxAbertura();
    let h = '', cards = '';
    if (!ab) h += '<div class="aviso">' + ic('clock') + '<span><b>Estamos fechados agora.</b> Você pode montar o pedido e deixar agendado' + (prox ? ' para ' + quandoTxt(prox) : ' para a próxima abertura') + '.</span></div>';
    const ped = cli.ultimoPedidoId ? db.pedidos.find(p => p.id === cli.ultimoPedidoId) : null;
    if (ped) {
      const vivo = ['concluido', 'cancelado'].indexOf(ped.status) < 0;
      if (vivo || Date.now() - new Date(ped.criado) < 12 * 36e5)
        cards += '<a class="atl" href="pedido.html?id=' + encodeURIComponent(ped.id) + '">' + ic('moto') + '<span class="atl-t"><b>Pedido #' + ped.num + ' · ' + esc(ped.status === 'cancelado' ? 'Cancelado' : tituloStatus(ped, ped.status)) + '</b><small>' + (vivo ? 'Toque para acompanhar em tempo real' : 'Ver detalhes do pedido') + '</small></span><span class="go">Acompanhar</span></a>';
    }
    const ult = ultimoValido();
    if (ult && !cart.length) cards += '<button type="button" class="atl" data-a="denovo">' + ic('rep') + '<span class="atl-t"><b>' + (cli.nome ? esc(cli.nome.split(' ')[0]) + ', o de sempre?' : 'Pedir de novo o último?') + '</b><small>' + esc(ult.txt) + ' · ' + brl(ult.total) + '</small></span><span class="go">Pedir de novo</span></button>';
    if (cards) h += '<div class="atalhos">' + cards + '</div>';
    el.innerHTML = h;
  }

  /* ---------- receber: entrega (CEP ou bairro) ou retirada ---------- */
  function cepResHTML() {
    if (ui.cepBusy) return '<div class="cres"><span class="spin"></span><div>Consultando o CEP…</div></div>';
    const r = cli.cepRes, wa = esc(YK.waLink('Olá! Meu CEP é ' + maskCep(cli.cep) + '. Vocês entregam aqui?'));
    if (r && !r.ok) return '<div class="cres no">' + ic('info') + '<div><b>' + esc(r.erro) + '.</b> Confira os números ou escolha o bairro na lista abaixo.</div></div>';
    if (r && r.ok && !r.naZona) {
      return '<div class="cres no">' + ic('info') + '<div><b>Ainda não entregamos em ' + esc(r.bairro || r.cidade || 'seu endereço') + (r.cidade && r.bairro ? ', ' + esc(r.cidade) : '') + '.</b> Mas dá para retirar na loja, na Graça: fica pronto em ' + tempo('retirada') + ' e não tem taxa.' +
        '<div class="acts"><button type="button" class="btn sm" data-a="modo" data-v="retirada">Quero retirar na loja</button><a class="btn sm alt" target="_blank" rel="noopener" href="' + wa + '">Perguntar no WhatsApp</a></div></div></div>';
    }
    const b = bairroSel();
    if (!b) return '';
    const onde = r && r.ok ? (r.rua ? esc(r.rua) + ', ' : '') + esc(b.nome) + (r.cidade ? ', ' + esc(r.cidade) + '-' + esc(r.uf || '') : '') : esc(b.nome);
    return '<div class="cres ok">' + ic('check') + '<div><b>Entregamos aí.</b> ' + onde + '<div class="kv"><span>Taxa <b>' + brl(b.taxa) + '</b></span><span>Pedido mínimo <b>' + brl(b.min) + '</b></span><span>Chega em <b>' + tempo('entrega') + '</b></span></div>' +
      (r && r.fonte === 'reserva' ? '<small style="display:block;margin-top:6px">Consulta de CEP indisponível agora: achamos o bairro pela faixa do CEP. Confira a rua no pedido.</small>' : '') + '</div></div>';
  }
  function receberHTML() {
    let h = '<div class="seg2">' +
      '<button type="button" class="mcard' + (cli.tipo === 'entrega' ? ' on' : '') + '" data-a="modo" data-v="entrega" aria-pressed="' + (cli.tipo === 'entrega') + '">' + ic('moto') + '<b>Entrega</b><small>Taxa pelo CEP</small></button>' +
      '<button type="button" class="mcard' + (cli.tipo === 'retirada' ? ' on' : '') + '" data-a="modo" data-v="retirada" aria-pressed="' + (cli.tipo === 'retirada') + '">' + ic('bag') + '<b>Retirada</b><small>Pronto em ' + tempo('retirada') + '</small></button></div>';
    if (cli.tipo === 'entrega') {
      h += '<div class="mdet"><div class="cep-row"><label class="fld"><span>CEP da entrega</span><input class="inp" data-f="cep" type="text" inputmode="numeric" autocomplete="postal-code" placeholder="40150-000" maxlength="9" value="' + esc(maskCep(cli.cep)) + '"></label><button type="button" class="btn" data-a="cep">Consultar</button></div>' +
        '<div class="cep-res" aria-live="polite">' + cepResHTML() + '</div>' +
        '<label class="fld ou"><span>Não sabe o CEP? Escolha o bairro</span><select class="inp" data-f="bairro"><option value="">Escolha o bairro</option>' +
        db.bairros.map(b => '<option value="' + esc(b.nome) + '"' + (b.nome === cli.bairro ? ' selected' : '') + '>' + esc(b.nome) + ' · entrega ' + brl(b.taxa) + '</option>').join('') + '</select></label>' +
        '<details class="zonas"><summary>' + ic('map') + 'Bairros atendidos e taxas</summary><table><thead><tr><th>Bairro</th><th>Taxa</th><th>Mínimo</th></tr></thead><tbody>' +
        db.bairros.map(b => '<tr><td>' + esc(b.nome) + '</td><td>' + brl(b.taxa) + '</td><td>' + brl(b.min) + '</td></tr>').join('') + '</tbody></table></details></div>';
    } else if (cli.tipo === 'retirada') {
      h += '<div class="mdet"><p>' + ic('pin') + '<span><b>Retire na loja:</b> <em>' + esc(YK.LOJA.endereco) + '</em></span></p><p>' + ic('clock') + '<span>Fica pronto em ' + tempo('retirada') + '. Sem taxa de entrega e sem pedido mínimo.</span></p></div>';
    }
    return h;
  }
  function renderReceber() { $$('[data-receber]').forEach(el => { el.innerHTML = receberHTML(); }); }
  let cepSeq = 0;
  async function consultaCep() {
    const d = soNum(cli.cep);
    if (d.length !== 8) { cli.cepRes = { ok: false, erro: 'Digite os 8 números do CEP' }; saveCli(); renderReceber(); return; }
    const my = ++cepSeq; ui.cepBusy = true;
    $$('.cep-res').forEach(e => { e.innerHTML = cepResHTML(); });
    let r;
    try { r = await YK.cepInfo(d); } catch (e) { r = { ok: false, erro: 'Não foi possível consultar o CEP agora' }; }
    if (my !== cepSeq) return;
    ui.cepBusy = false; cli.cepRes = r;
    if (r.ok && r.naZona) { cli.bairro = r.bairro; if (r.rua) cli.rua = r.rua; }
    else if (r.ok) cli.bairro = '';
    saveCli(); ui.erro = ''; refresh();
    const rua = $('#ckRua');
    if (rua && r.ok && r.naZona) { rua.value = cli.rua; const n = $('#ckNum'); if (r.rua && n && !n.value) n.focus({ preventScroll: true }); }
  }

  /* ---------- cardápio ---------- */
  function sabCard(S, t) {
    const disp = db.tamanhos.filter(T => !yOff(T.id, S.id)), off = t ? yOff(t, S.id) : !disp.length;
    const tag = S.id === 'mistao' ? '<span class="tagm">O completo</span>' : S.id === 'vegetariano' ? '<span class="tagm g">' + ic('leaf') + 'Sem carne</span>' : '';
    let tit = esc(S.nome) + tag, desc = esc(S.desc), preco;
    if (t) {
      const T = tam(t), d = T.desc.split(' · ');
      tit = esc(T.nome) + ' de ' + esc(S.nome); desc = esc(d[0]) + (d[1] ? ' · ' + esc(d[1]) : '');
      preco = '<span class="sab-p"><strong>' + brl(YK.preco(db, t, S.id)) + '</strong></span>';
    } else if (!off) {
      const min = Math.min.apply(null, disp.map(T => YK.preco(db, T.id, S.id))), ind = !yOff('individual', S.id) ? YK.preco(db, 'individual', S.id) : 0;
      preco = '<span class="sab-p">' + (ind ? 'Individual <strong>' + brl(ind) + '</strong> · ' : '') + 'a partir de ' + (ind ? brl(min) : '<strong>' + brl(min) + '</strong>') + '</span>';
    }
    if (off) preco = '<span class="sab-p"><span class="esg">Esgotado hoje</span></span>';
    return '<button type="button" class="sab" data-a="montar" data-v="' + S.id + '"' + (t ? ' data-t="' + t + '"' : '') + (off ? ' disabled' : '') + '>' +
      '<img src="' + foto(S.id) + '" alt="" loading="lazy" width="92" height="92"><span class="sab-t"><b>' + tit + '</b><small>' + desc + '</small>' + preco + '</span>' +
      '<span class="sab-add" aria-hidden="true">' + ic('plus') + '</span><span class="vh">Montar yakisoba de ' + esc(S.nome) + '</span></button>';
  }
  function stepHTML(q, actM, actP, attrs, label) {
    return '<span class="step"><button type="button" data-a="' + actM + '"' + attrs + ' aria-label="' + (q === 1 && actM !== 'bQm' ? 'Remover ' : 'Diminuir ') + esc(label) + '">' + ic(q === 1 && actM !== 'bQm' ? 'trash' : 'minus') + '</button><output aria-live="polite">' + q + '</output><button type="button" data-a="' + actP + '"' + attrs + ' aria-label="Aumentar ' + esc(label) + '">' + ic('plus') + '</button></span>';
  }
  const cats = () => { const c = []; db.extras.forEach(e => { if (c.indexOf(e.cat) < 0) c.push(e.cat); }); return c; };
  function renderMenu() {
    const el = $('#menu'); if (!el) return;
    const f = ui.filtro, cs = cats(), fl = $('#filtros');
    if (fl) fl.innerHTML = [['todos', 'Tudo'], ['yaki', 'Yakisoba']].concat(cs.map(c => [c, c])).map(c => '<button type="button" class="chip' + (f === c[0] ? ' on' : '') + '" data-a="filtro" data-v="' + esc(c[0]) + '" aria-pressed="' + (f === c[0]) + '">' + esc(c[1]) + '</button>').join('');
    let h = '';
    if (f === 'todos' || f === 'yaki') {
      h += '<h2 class="cat-h">Yakisoba</h2><div class="guia">' + db.tamanhos.map(T => { const d = T.desc.split(' · '); return '<div><b>' + esc(T.nome) + '</b><small>' + esc(d[0]) + (d[1] ? '<br>' + esc(d[1]) : '') + '</small></div>'; }).join('') + '</div>' +
        '<div class="sabs">' + db.sabores.map(S => sabCard(S)).join('') + '</div>';
    }
    cs.forEach(c => {
      if (f !== 'todos' && f !== c) return;
      const its = db.extras.filter(e => e.cat === c), exemplo = its.some(e => !e.real);
      h += '<h2 class="cat-h">' + esc(c) + '</h2><div class="ext">' + (exemplo ? '<h3 style="margin-top:-6px"><small>Preços de exemplo, a confirmar com a loja</small></h3>' : '') + '<ul>' + its.map(e => {
        const it = cart.find(i => i.tipo === 'extra' && i.id === e.id), q = it ? it.qtd : 0, at = ' data-id="' + e.id + '"';
        return '<li><span class="n"><b>' + esc(e.nome) + '</b><span>' + brl(e.preco) + '</span></span>' + (pausado(e.id) ? '<span class="esg">Esgotado hoje</span>' : q ? stepHTML(q, 'eM', 'eP', at, e.nome) : '<button type="button" class="btn sm alt" data-a="eP"' + at + '>Adicionar</button>') + '</li>';
      }).join('') + '</ul></div>';
    });
    el.innerHTML = h;
  }
  function renderPops() {
    const el = $('#pops'); if (!el) return;
    const cnt = {};
    db.pedidos.forEach(p => (p.itens || []).forEach(i => { if (i.tipo === 'yaki' && !i.gratis) { const k = i.tamanho + ':' + i.sabor; cnt[k] = (cnt[k] || 0) + i.qtd; } }));
    const keys = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).concat(['individual:carne', 'individual:camarao', 'meia:mistao', 'individual:frango', 'individual:vegetariano'])
      .filter((k, i, a) => a.indexOf(k) === i).filter(k => { const p = k.split(':'); return tam(p[0]) && sab(p[1]) && !yOff(p[0], p[1]); }).slice(0, 3);
    el.innerHTML = keys.map(k => { const p = k.split(':'); return sabCard(sab(p[1]), p[0]); }).join('');
  }

  /* ---------- fidelidade ---------- */
  function renderFid() {
    const f = fid(), el = $('#regras');
    const diretos = f.canais.filter(c => c !== 'ifood').map(c => c === 'site' ? 'site' : c === 'whatsapp' ? 'WhatsApp' : c === 'balcao' ? 'balcão' : c).join(' ou ');
    $$('[data-fid-tit]').forEach(e => { e.textContent = 'A cada ' + f.meta + ' selos, 1 yakisoba é por nossa conta'; });
    if (el) el.innerHTML =
      '<li>' + ic('check') + '<span><b>Pedido direto vale selo.</b> Pediu pelo ' + esc(diretos) + ' a partir de ' + brl(f.pedidoMinimo) + ', ganhou 1 selo quando o pedido é concluído.</span></li>' +
      (f.canais.indexOf('ifood') < 0 ? '<li>' + ic('no') + '<span><b>Pedido pelo iFood não vale selo.</b> Aqui o preço é o do cardápio fixo e o selo é seu.</span></li>' : '') +
      '<li>' + ic('gift') + '<span><b>Completou ' + f.meta + '?</b> Ganha 1 ' + esc(f.premio) + ', sabor à escolha, para usar em até ' + f.validadeDias + ' dias.</span></li>';
    const dc = $('#dchips');
    if (dc) {
      const com = db.clientes.filter(c => c.selos > 0 && !YK.vouchersAtivos(db, c).length).sort((a, b) => b.selos - a.selos)[1] || db.clientes.find(c => c.selos > 0);
      const comV = db.clientes.find(c => YK.vouchersAtivos(db, c).length);
      let h = '';
      if (db.demo && (com || comV)) {
        h = '<span>Demonstração, veja um exemplo:</span>';
        if (com) h += '<button type="button" data-a="demoCard" data-v="' + esc(com.tel) + '">Cartão com ' + com.selos + ' selos</button>';
        if (comV) h += '<button type="button" data-a="demoCard" data-v="' + esc(comV.tel) + '">Cartão completo</button>';
      }
      dc.innerHTML = h;
    }
    const pb = $('#premioBox');
    if (pb) pb.innerHTML = '<img src="../assets/prato-camarao.jpg" alt="" width="104" height="104" loading="lazy"><div><b>1 ' + esc(f.premio) + ' grátis</b><span>' + peso((tam(f.premioTamanho) || {}).gramas || 500) + ' de yakisoba, no sabor que você escolher na hora de resgatar. Vale por ' + f.validadeDias + ' dias depois de completar o cartão.</span></div>';
    const faq = $('#faq');
    if (faq && !faq.dataset.ok) {
      faq.dataset.ok = '1';
      const qs = [
        ['Preciso baixar aplicativo ou criar senha?', 'Não. O cartão fica guardado no seu número de WhatsApp. É só digitar o número aqui nesta página para ver seus selos.'],
        ['Como eu ganho um selo?', 'Faça um pedido direto, pelo ' + diretos + ', a partir de ' + brl(f.pedidoMinimo) + '. Quando o pedido é concluído, o selo cai sozinho no seu cartão. Você não precisa pedir nem mostrar nada.'],
        ['Pedido pelo iFood vale selo?', 'Não vale. No iFood a loja paga comissão alta e por isso o preço lá é maior. Pedindo direto você paga o preço do cardápio fixo e ainda junta selo.'],
        ['O que eu ganho quando completo?', 'Ao juntar ' + f.meta + ' selos você ganha 1 ' + f.premio + ', no sabor que quiser. O prêmio aparece no seu cartão e fica válido por ' + f.validadeDias + ' dias.'],
        ['Como uso o meu prêmio?', 'Na hora de finalizar um pedido, o site reconhece o seu número e pergunta se você quer resgatar. Você escolhe o sabor e o yakisoba entra de graça no pedido. Na retirada dá para pedir só o prêmio. Na entrega, vale o pedido mínimo do bairro nos outros itens.'],
        ['Eu já tinha selos no cartão antigo, do WhatsApp. Perdi?', 'Não. Fale com a loja pelo WhatsApp que os selos antigos são carimbados no seu cartão digital.'],
        ['Troquei de número. E agora?', 'Chame a loja no WhatsApp ' + YK.LOJA.whatsappFmt + ' e avise. A gente passa seus selos para o número novo.']
      ];
      faq.innerHTML = qs.map(q => '<details><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>').join('');
    }
  }
  function slotsHTML(n, prev, pend) {
    const meta = fid().meta; let h = '';
    for (let i = 0; i < meta; i++) {
      const on = i < n, last = i === meta - 1, pop = on && i >= prev;
      const cls = 'slot' + (on ? ' on' : '') + (last ? ' premio' : '') + (pop ? ' pop' : '') + (!on && pend && i === n ? ' pend' : '');
      const st = '--rot:' + (((i * 37) % 17) - 8) + 'deg;' + (pop ? 'animation-delay:' + ((i - prev) * 85) + 'ms' : '');
      const inner = last ? (on ? ic('gift') : ic('gift') + '<span>Grátis</span>') : on ? '<img src="../assets/mascote-rosto.jpg" alt="">' : String(i + 1);
      h += '<div class="' + cls + '" style="' + st + '" role="img" aria-label="' + (on ? 'Selo ' + (i + 1) + ' carimbado' : last ? 'Prêmio' : 'Espaço ' + (i + 1) + ' vazio') + '">' + inner + '</div>';
    }
    return '<div class="slots">' + h + '</div>';
  }
  function cartaoHTML(t, mini) {
    const f = fid(), meta = f.meta;
    const head = (sub, n) => '<div class="lc-top"><img src="../assets/logo.jpg" alt="" width="40" height="40"><div><b>Cartão fidelidade</b><span>' + sub + '</span></div><div class="lc-n">' + n + '<small>/' + meta + '</small></div></div>';
    if (!t) return '<div class="lcard">' + head('Y-AKIO · seu cartão digital', 0) + slotsHTML(0, 0, false) + '<p class="lc-msg">' + (mini ? 'Seu cartão começa no primeiro pedido direto.' : 'Digite seu WhatsApp para ver seus selos.') + '</p><p class="lc-sub">' + (meta - 1) + ' carimbos e o último espaço é o prêmio: 1 ' + esc(f.premio) + '.</p></div>';
    const c = YK.clientePorTel(db, t);
    if (!c) {
      if (!mini) ui.seen = { tel: t, n: 0, v: 0 };
      return '<div class="lcard">' + head(esc(maskTel(t)), 0) + slotsHTML(0, 0, false) + '<p class="lc-msg">Ainda não há pedidos neste número.</p><p class="lc-sub">Seu cartão é criado sozinho no primeiro pedido direto, com este WhatsApp.</p>' + (mini ? '' : '<p style="margin-top:12px"><a class="btn sm" href="cardapio.html">Fazer meu primeiro pedido</a></p>') + '</div>';
    }
    const ativos = YK.vouchersAtivos(db, c), completo = c.selos === 0 && ativos.length > 0, n = completo ? meta : c.selos;
    const same = !mini && ui.seen.tel === t, prev = mini ? n : same ? Math.min(ui.seen.n, n) : 0, vNovo = !mini && (!same || ativos.length > ui.seen.v);
    const pend = db.pedidos.filter(p => p.clienteId === c.id && ['concluido', 'cancelado'].indexOf(p.status) < 0 && f.canais.indexOf(p.canal) >= 0 && p.subtotal >= f.pedidoMinimo);
    const falta = meta - n;
    const msg = completo ? '<b>Cartão completo!</b> Seu ' + esc(f.premio) + ' está liberado.' : (falta === 1 ? 'Falta <b>1 selo</b>' : 'Faltam <b>' + falta + ' selos</b>') + ' para o seu ' + esc(f.premio) + ' grátis.';
    const sub = pend.length && !completo ? 'Pedido #' + pend[0].num + ' em andamento: o próximo selo cai quando ele for concluído.' : completo ? 'O próximo pedido já começa um cartão novo.' : 'Cada pedido direto a partir de ' + brl(f.pedidoMinimo) + ' vale 1 selo.';
    const vh = ativos.map(v => {
      const val = new Date(new Date(v.criado).getTime() + f.validadeDias * 864e5), usando = vch && vch.id === v.id;
      return '<div class="vch' + (vNovo ? ' pop' : '') + '"><div class="vch-l">Vale<b>1</b></div><div class="vch-r"><b>' + esc(v.premio) + ' grátis</b><span>Sabor à escolha · válido até ' + ddmm(val) + '/' + val.getFullYear() + '</span>' +
        (mini ? '<a class="btn sm w" href="fidelidade.html">Usar meu prêmio</a>' : usando ? '<button type="button" class="btn sm w" data-a="carrinho">' + ic('check') + 'Na sua sacola</button>' : '<button type="button" class="btn sm w" data-a="usarVch" data-v="' + v.id + '">Usar no próximo pedido</button>') + '</div></div>';
    }).join('');
    let hist = '';
    if (!mini) {
      const ev = [];
      (c.histSelos || []).forEach(h => ev.push({ t: h.t, i: 'check', a: 'Selo carimbado', b: h.motivo }));
      (c.vouchers || []).forEach(v => { ev.push({ t: v.criado, i: 'gift', a: 'Cartão completo, prêmio liberado', b: v.premio }); if (v.usado) ev.push({ t: v.usado, i: 'ticket', a: 'Prêmio resgatado', b: v.premio }); });
      ev.sort((a, b) => new Date(b.t) - new Date(a.t));
      hist = ev.slice(0, 6).map(e => '<li>' + ic(e.i) + '<span>' + esc(e.a) + '<small>' + esc(e.b || '') + '</small></span><time>' + ddmm(e.t) + '</time></li>').join('');
      const legado = c.selos - (c.histSelos || []).length;
      if (legado > 0) hist += '<li>' + ic('check') + '<span>' + legado + (legado === 1 ? ' selo anterior' : ' selos anteriores') + '<small>Carimbados antes do cartão digital</small></span></li>';
      if (c.cartoesCompletos > 0) hist += '<li>' + ic('star') + '<span>' + c.cartoesCompletos + (c.cartoesCompletos === 1 ? ' cartão já completado' : ' cartões já completados') + '<small>' + c.pedidos + ' pedidos com a gente</small></span></li>';
      ui.seen = { tel: t, n, v: ativos.length };
    }
    return '<div class="lcard">' + head(esc(c.nome.split(' ')[0]) + ' · ' + esc(maskTel(c.tel)), n) + slotsHTML(n, prev, pend.length > 0 && !completo) +
      '<div class="lc-bar"><i style="width:' + Math.round(n / meta * 100) + '%"></i></div><p class="lc-msg">' + msg + '</p><p class="lc-sub">' + sub + '</p>' + vh +
      (hist ? '<div class="hist"><h3>Histórico</h3><ul>' + hist + '</ul></div>' : '') + '</div>';
  }
  function renderCartao() {
    const t = cli.cardTel || (telOk(cli.tel) ? digits(cli.tel) : '');
    const a = $('#cartao'), b = $('#cartaoMini');
    if (a) a.innerHTML = cartaoHTML(t, false);
    if (b) b.innerHTML = cartaoHTML(t, true);
  }
  function verCartao(t, rolar) {
    const d = digits(t), inp = $('#cardTel');
    if (d.length < 10) { toast('Digite o WhatsApp com DDD'); if (inp) inp.focus(); return; }
    cli.cardTel = d; saveCli(); if (inp) inp.value = maskTel(d); renderCartao();
    const el = $('#cartao');
    if (rolar && el) { const r = el.getBoundingClientRect(); if (r.top > window.innerHeight * .5 || r.top < 0) window.scrollTo(0, r.top + window.scrollY - 90); }
  }

  function renderLoc() {
    const el = $('#loc'); if (!el) return;
    const mapa = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(YK.LOJA.endereco.replace(' — ', ', '));
    el.innerHTML = '<div><h3 class="bg">Onde estamos</h3><p>' + ic('pin') + '<em>' + esc(YK.LOJA.endereco) + '</em></p><p>' + ic('clock') + '<span>' + esc(YK.LOJA.horarios.texto) + '</span></p></div>' +
      '<div class="acts"><a class="btn sm w" target="_blank" rel="noopener" href="' + esc(mapa) + '">' + ic('map') + 'Abrir no mapa</a><a class="btn sm w" target="_blank" rel="noopener" href="' + esc(YK.waLink('Olá! Vim pelo site do Y-AKIO.')) + '">' + ic('wa') + esc(YK.LOJA.whatsappFmt) + '</a></div>';
  }

  /* ---------- barra fixa ---------- */
  function renderBar(bump) {
    const t = tot(), bar = $('#bar'), show = t.n > 0 && !ui.sheet && PAGE !== 'checkout';
    document.body.classList.toggle('hasbar', show);
    bar.hidden = !show;
    if (!show) return;
    const sub = t.selo ? 'Este pedido vale 1 selo' : cli.tipo === 'entrega' && t.b ? 'com entrega em ' + t.b.nome : cli.tipo === 'retirada' ? 'Retirada na loja' : t.n + (t.n === 1 ? ' item na sacola' : ' itens na sacola');
    bar.innerHTML = '<button type="button" data-a="carrinho"><span class="q">' + t.n + '</span><span class="t"><b>' + brl(t.total) + '</b><small>' + esc(sub) + '</small></span><span class="go">Ver sacola</span></button>';
    if (bump) { bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump'); }
  }

  /* ---------- sheets (montador, sacola, prêmio, pagamento) ---------- */
  const VIEWS = {};
  function renderSheet() {
    const ov = $('#ov');
    if (!ui.sheet) { ov.hidden = true; document.body.classList.remove('lock'); renderBar(); return; }
    const v = VIEWS[ui.sheet](), b = $('#shB'), same = !ov.hidden && ov.dataset.v === ui.sheet, st = same ? b.scrollTop : 0;
    $('#shT').textContent = v.t; b.innerHTML = v.b; const f = $('#shF'); f.innerHTML = v.f || ''; f.hidden = !v.f;
    ov.dataset.v = ui.sheet; ov.hidden = false; document.body.classList.add('lock'); b.scrollTop = st; renderBar();
  }
  const abrir = n => { ui.sheet = n; renderSheet(); };
  function fechar() {
    if (ui.sheet === 'pay') { if (ui.pay && ui.pay.st === 'aprovado') return; pararPay(); ui.pay = null; ui.busy = false; }
    ui.sheet = null; renderSheet();
  }

  VIEWS.builder = () => {
    const b = ui.b, S = sab(b.s);
    if (yOff(b.t, b.s)) { const d = db.tamanhos.find(T => !yOff(T.id, b.s)); b.t = d ? d.id : b.t; }
    const off = yOff(b.t, b.s), p = YK.preco(db, b.t, b.s), u = off ? null : upgrade(b.t, b.s, b.q);
    const partes = (b.obs || '').split(',').map(x => x.trim().toLowerCase());
    const body = '<div class="b-top"><img src="' + foto(b.s) + '" alt="" width="76" height="76"><div><b>Yakisoba de ' + esc(S.nome) + '</b><p>' + esc(S.desc) + '</p></div></div>' +
      '<p class="lbl">Sabor</p><div class="chips">' + db.sabores.map(s => {
        const all = db.tamanhos.every(T => yOff(T.id, s.id));
        return '<button type="button" class="chip' + (s.id === b.s ? ' on' : '') + '" data-a="bS" data-v="' + s.id + '"' + (all ? ' disabled' : '') + ' aria-pressed="' + (s.id === b.s) + '">' + esc(s.nome) + '</button>';
      }).join('') + '</div><p class="lbl">Tamanho</p><div class="trows">' + db.tamanhos.map(T => {
        const o = yOff(T.id, b.s), d = T.desc.split(' · ');
        return '<button type="button" class="trow' + (T.id === b.t && !o ? ' on' : '') + '" data-a="bT" data-v="' + T.id + '"' + (o ? ' disabled' : '') + ' aria-pressed="' + (T.id === b.t && !o) + '"><span class="rd"></span><span class="trow-t"><b>' + esc(T.nome) + '</b><small>' + esc(d[0]) + (d[1] ? ' · ' + esc(d[1]) : '') + '</small></span><span class="trow-p">' + (o ? 'Esgotado hoje' : brl(YK.preco(db, T.id, b.s))) + '</span></button>';
      }).join('') + '</div>' + (u ? upgradeHTML(u, 'bUp') : '') +
      '<p class="lbl">Alguma observação?</p><div class="chips" style="margin-bottom:8px">' + OBS_RAPIDAS.map(o => '<button type="button" class="chip' + (partes.indexOf(o.toLowerCase()) >= 0 ? ' on' : '') + '" data-a="bO" data-v="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>' +
      '<label class="vh" for="bobs">Observação</label><input class="inp" id="bobs" data-f="bobs" maxlength="120" placeholder="Ex.: pouco molho, bem passado" value="' + esc(b.obs) + '">';
    const foot = stepHTML(b.q, 'bQm', 'bQp', '', 'quantidade') + '<button type="button" class="btn" data-a="bAdd"' + (off ? ' disabled' : '') + '>' + (off ? 'Esgotado hoje' : 'Adicionar · ' + brl(p * b.q)) + '</button>';
    return { t: 'Monte seu yaki', b: body, f: foot };
  };

  function seloHTML(t) {
    if (!t.vale) return '';
    const st = '<span class="st"><img src="../assets/mascote-rosto.jpg" alt=""></span>';
    return t.selo ? '<div class="selo">' + st + '<div>Este pedido vale 1 selo no cartão fidelidade<small>Pedido direto dá selo. Pelo iFood, não.</small></div></div>'
      : '<div class="selo no">' + st + '<div>Faltam ' + brl(t.faltaSelo) + ' para este pedido valer 1 selo<small>Vale a partir de ' + brl(fid().pedidoMinimo) + ' em pedido direto.</small></div></div>';
  }
  function vchLinha(rm) {
    if (!vch) return '';
    const t = fid().premioTamanho, p = YK.preco(db, t, vch.sabor);
    return '<div class="ci"><div class="ci-t"><b>1x Yakisoba ' + esc(tam(t).nome) + ' · ' + esc(sab(vch.sabor).nome) + '</b><small class="w">Prêmio do cartão fidelidade</small></div>' + (rm ? '<button type="button" class="rmv" data-a="vchOff" aria-label="Remover prêmio do pedido">' + ic('trash') + '</button>' : '') + '<div class="ci-p">' + (rm ? '<s>' + brl(p) + '</s>' : '') + '<em>Grátis</em></div></div>';
  }
  function totHTML(t) {
    return '<div class="tot"><div><span>Subtotal</span><span>' + brl(t.sub) + '</span></div>' +
      (cli.tipo === 'entrega' ? '<div><span>Entrega' + (t.b ? ' · ' + esc(t.b.nome) : '') + '</span><span>' + (t.b ? brl(t.taxa) : foraZona() ? 'fora da área' : 'informe o CEP') + '</span></div>'
        : cli.tipo === 'retirada' ? '<div><span>Retirada na loja</span><span>sem taxa</span></div>' : '<div><span>Entrega ou retirada</span><span>a escolher</span></div>') +
      '<div class="T"><span>Total</span><span>' + brl(t.total) + '</span></div></div>';
  }
  const minHTML = t => t.faltaMin > 0 ? '<p class="note" style="margin-top:12px">' + ic('info') + '<span>Faltam <b>' + brl(t.faltaMin) + '</b> para o pedido mínimo de entrega em ' + esc(t.b.nome) + ' (' + brl(t.min) + '). Na retirada não há mínimo.</span></p>' : '';
  VIEWS.cart = () => {
    const t = tot();
    if (!t.n) return { t: 'Sua sacola', b: '<div class="empty"><p>Sua sacola ainda está vazia.</p><button type="button" class="btn" data-a="irMenu">Ver cardápio</button></div>' };
    let h = cart.map(i => {
      const p = linhaPreco(i), off = linhaOff(i), at = ' data-k="' + i.k + '"', yk = i.tipo === 'yaki';
      const det = yk ? peso(tam(i.tamanho).gramas) + ' · ' + brl(p) + ' cada' : brl(p) + ' cada';
      const u = yk && !off ? upgrade(i.tamanho, i.sabor, i.qtd) : null;
      return '<div class="ci-wrap"><div class="ci' + (yk ? ' yk' : '') + '" style="border-bottom:0"><div class="ci-t"><b>' + esc(linhaNome(i)) + '</b><small>' + det + '</small>' + (off ? '<small class="w">Esgotado hoje. Remova para continuar.</small>' : '') + '</div>' + stepHTML(i.qtd, 'cM', 'cP', at, linhaNome(i)) + '<div class="ci-p">' + brl(p * i.qtd) + '</div></div>' +
        (yk ? '<div class="ci-obs"><label class="vh" for="o' + i.k + '">Observação</label><input class="inp" id="o' + i.k + '" data-o="' + i.k + '" maxlength="120" placeholder="Observação (ex.: sem pimentão)" value="' + esc(i.obs || '') + '"></div>' : '') + (u ? upgradeHTML(u, 'cUp', at) + '<div style="height:10px"></div>' : '') + '</div>';
    }).join('') + vchLinha(true);
    const temRol = cart.some(i => /^rol-/.test(i.id || '')), rols = db.extras.filter(e => /^rol-/.test(e.id) && !pausado(e.id));
    if (!temRol && rols.length && (cart.some(i => i.tipo === 'yaki') || vch)) {
      h += '<div class="dica" style="background:#fff;border-color:var(--line)">' + ic('plus') + '<div><b>Vai um rolinho primavera? ' + brl(rols[0].preco) + '</b><div class="chips" style="margin-top:8px">' + rols.map(e => '<button type="button" class="chip" data-a="eP" data-id="' + e.id + '">' + esc(e.nome.replace(/^Rolinho (de )?/, '')) + '</button>').join('') + '</div></div></div>';
    }
    h += seloHTML(t) + totHTML(t) + minHTML(t);
    const foot = PAGE === 'checkout' ? '<button type="button" class="btn" data-a="fechar">Voltar ao pedido</button>'
      : '<button type="button" class="btn alt" data-a="irMenu">+ Itens</button><button type="button" class="btn" data-a="irCheckout">Finalizar · ' + brl(t.total) + '</button>';
    return { t: 'Sua sacola', b: h, f: foot };
  };
  VIEWS.premio = () => {
    const f = fid();
    const h = '<div class="b-top"><img src="../assets/mascote-rosto.jpg" alt="" width="76" height="76" style="object-position:20% 50%"><div><b>Seu prêmio chegou</b><p>1 ' + esc(f.premio) + ' por conta da casa. Escolha o sabor e ele entra na sua sacola.</p></div></div><p class="lbl">Sabor do yakisoba grátis</p><div class="trows">' +
      saboresPremio().map(s => '<button type="button" class="trow" data-a="vchS" data-go="1" data-id="' + esc(ui.vchId) + '" data-v="' + s.id + '"><span class="trow-t"><b>' + esc(s.nome) + '</b><small>' + esc(s.desc) + '</small></span><span class="trow-p">Grátis</span></button>').join('') + '</div>';
    return { t: 'Resgatar prêmio', b: h };
  };

  /* ---------- pagamento online (demonstração, estilo Mercado Pago) ---------- */
  const mpSelo = () => '<div class="mp">' + ic('lock') + '<span>Pagamento processado pelo Mercado Pago<small>Ambiente de demonstração: nada é cobrado e nenhum dado sai deste aparelho.</small></span></div>';
  const pmNome = (id, tipo) => id === 'cartao' ? 'Maquininha na ' + (tipo === 'retirada' ? 'retirada' : 'entrega') : (YK.PAGAMENTOS.find(x => x.id === id) || {}).nome || id;
  function pmDisponiveis() {
    const pg = db.config.pagamentos || { aceita: {}, mercadoPago: {} }, mp = !!(pg.mercadoPago && pg.mercadoPago.conectado);
    return YK.PAGAMENTOS.filter(m => pg.aceita && pg.aceita[m.id] && (!m.online || mp));
  }
  function bandeira(n) {
    n = soNum(n);
    if (/^(4011|4389|4514|5067|5090|6277|6362|6363|6504|6505|6516|6550)/.test(n)) return 'Elo';
    if (/^(606282|3841)/.test(n)) return 'Hipercard';
    if (/^4/.test(n)) return 'Visa';
    if (/^(5[0-5]|2[2-7])/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    return '';
  }
  function luhn(n) { let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d) { x *= 2; if (x > 9) x -= 9; } s += x; d = !d; } return n.length >= 13 && s % 10 === 0; }
  function valOk(v) {
    const m = /^(\d{2})\/(\d{2})$/.exec(v || ''); if (!m) return false;
    const mm = +m[1], yy = 2000 + (+m[2]); if (mm < 1 || mm > 12) return false;
    return new Date(yy, mm, 1) > new Date();
  }
  function cardCheck() {
    const c = ui.card, n = soNum(c.num);
    return { num: luhn(n) ? '' : 'Número de cartão inválido', nome: c.nome.trim().length >= 2 ? '' : 'Informe o nome como está no cartão', val: valOk(c.val) ? '' : 'Validade inválida', cvv: /^\d{3,4}$/.test(c.cvv) ? '' : 'Código de 3 ou 4 números' };
  }
  function updCard() {
    const c = ui.card, k = cardCheck(), n = soNum(c.num);
    const set = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    set('#ccN', (c.num || '').padEnd(19, '•').replace(/ /g, ' ') || '•••• •••• •••• ••••'); set('#ccB', bandeira(c.num) || 'Cartão'); set('#ccNome', c.nome || 'NOME NO CARTÃO'); set('#ccVal', c.val || 'MM/AA');
    [['num', n.length >= 13], ['nome', false], ['val', (c.val || '').length === 5], ['cvv', false]].forEach(x => {
      const e = $('[data-c="' + x[0] + '"]'); if (!e) return;
      e.classList.toggle('ok', !k[x[0]]); e.classList.toggle('bad', !!k[x[0]] && (x[1] || !!ui.cardErr[x[0]]));
      const em = $('[data-e="' + x[0] + '"]'); if (em) em.textContent = ui.cardErr[x[0]] && k[x[0]] ? k[x[0]] : '';
    });
  }
  function pagHTML() {
    const t = tot(), ms = pmDisponiveis();
    if (t.total <= 0) return '<p class="note">' + ic('gift') + '<span>Nada a pagar neste pedido: é o seu prêmio do cartão fidelidade.</span></p>';
    if (!ms.length) return '<p class="note">' + ic('info') + '<span>A loja está sem forma de pagamento ativa no site. Chame no WhatsApp.</span></p>';
    if (!ms.some(m => m.id === cli.pagamento)) cli.pagamento = ms[0].id;
    const row = m => '<button type="button" class="pm' + (cli.pagamento === m.id ? ' on' : '') + '" data-a="pag" data-v="' + m.id + '" aria-pressed="' + (cli.pagamento === m.id) + '"><span class="rd"></span>' + ic(PM_INFO[m.id][0]) + '<span class="pm-t"><b>' + esc(pmNome(m.id, cli.tipo)) + '</b><small>' + PM_INFO[m.id][1] + '</small></span></button>' + (cli.pagamento === m.id ? detalhe(m.id) : '');
    const detalhe = id => {
      if (id === 'pix') return '<div class="pm-d"><p class="note">' + ic('info') + '<span>Ao tocar em <b>Pagar e fazer pedido</b> mostramos o QR com o valor exato. O pagamento é confirmado sozinho e o pedido segue para a loja.</span></p></div>';
      if (id === 'credito' || id === 'debito') {
        const c = ui.card;
        return '<div class="pm-d"><div class="demo-w">' + ic('warn') + '<span>Demonstração: não digite um cartão real.<small>O formulário já vem com um cartão de teste. Nada é enviado nem guardado.</small></span></div>' +
          '<div class="cc" aria-hidden="true"><div class="cc-top"><span class="cc-chip"></span><span class="cc-b" id="ccB"></span></div><div class="cc-n" id="ccN"></div><div class="cc-f"><span><small>Nome</small><span id="ccNome"></span></span><span><small>Validade</small><span id="ccVal"></span></span></div></div>' +
          '<div class="ccf"><label class="fld"><span>Número do cartão</span><input class="inp" data-c="num" inputmode="numeric" autocomplete="off" maxlength="23" value="' + esc(c.num) + '"><em data-e="num"></em></label>' +
          '<label class="fld"><span>Nome como está no cartão</span><input class="inp" data-c="nome" autocomplete="off" maxlength="40" value="' + esc(c.nome) + '"><em data-e="nome"></em></label>' +
          '<div class="r2"><label class="fld"><span>Validade</span><input class="inp" data-c="val" inputmode="numeric" autocomplete="off" placeholder="MM/AA" maxlength="5" value="' + esc(c.val) + '"><em data-e="val"></em></label>' +
          '<label class="fld"><span>Código (CVV)</span><input class="inp" data-c="cvv" inputmode="numeric" autocomplete="off" maxlength="4" value="' + esc(c.cvv) + '"><em data-e="cvv"></em></label></div>' +
          (id === 'credito' ? '<p class="note">' + ic('card') + '<span>Crédito à vista: 1x de <b>' + brl(t.total) + '</b>, sem juros.</span></p>' : '') + '</div></div>';
      }
      if (id === 'dinheiro') return '<div class="pm-d"><label class="fld"><span>Troco para quanto? (deixe vazio se não precisa)</span><input class="inp" data-f="troco" id="ckTroco" inputmode="decimal" placeholder="Ex.: 100" maxlength="8" value="' + esc(cli.troco) + '"></label></div>';
      return '<div class="pm-d"><p class="note">' + ic('info') + '<span>Leve o cartão: o pagamento é na maquininha, na hora de receber.</span></p></div>';
    };
    const on = ms.filter(m => m.online), offl = ms.filter(m => !m.online);
    return (on.length ? '<div class="pm-g"><p>' + ic('lock') + 'Pagar agora, pelo site</p>' + on.map(row).join('') + mpSelo() + '</div>' : '') +
      (offl.length ? '<div class="pm-g"><p>Pagar na ' + (cli.tipo === 'retirada' ? 'retirada' : 'entrega') + '</p>' + offl.map(row).join('') + '</div>' : '');
  }
  function renderPag() { const el = $('#ckPag'); if (!el) return; el.innerHTML = pagHTML(); updCard(); }
  function pixCode(total) {
    const v = total.toFixed(2);
    return '00020126580014BR.GOV.BCB.PIX0136demo0000-0000-0000-yakio-demonstracao520400005303986540' + v.length + v + '5802BR5906Y-AKIO6008SALVADOR62140510YAKIODEMO016304DEMO';
  }
  function qrFake(seed) {
    const n = 29; let s = 7, r = '';
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const canto = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = rnd() > 0.52; if (v && !canto(x, y) && !(y > 11 && y < 17 && x > 7 && x < 21)) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; }
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(c => { r += '<rect x="' + c[0] + '" y="' + c[1] + '" width="7" height="7"/><rect x="' + (c[0] + 1) + '" y="' + (c[1] + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (c[0] + 2) + '" y="' + (c[1] + 2) + '" width="3" height="3"/>'; });
    return '<svg class="qr" viewBox="-1 -1 31 31" role="img" aria-label="QR Code de demonstração" shape-rendering="crispEdges" fill="#1E1412">' + r + '<text x="14.5" y="16" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="3.8" fill="#D71D1E">DEMO</text></svg>';
  }
  let payTick = null, payAuto = null;
  function pararPay() { clearInterval(payTick); clearTimeout(payAuto); payTick = payAuto = null; }
  const restante = () => { const s = Math.max(0, Math.round((ui.pay.fim - Date.now()) / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
  function iniciarPay(p, tipo, total) {
    pararPay();
    ui.pay = { p, tipo, total, st: tipo === 'pix' ? 'aguardando' : 'processando', fim: Date.now() + 10 * 60e3, code: pixCode(total), final: soNum(ui.card.num).slice(-4), band: bandeira(ui.card.num) };
    abrir('pay'); $('#shB').scrollTop = 0;
    if (tipo === 'pix') {
      payTick = setInterval(() => {
        if (!ui.pay || ui.pay.st !== 'aguardando') return pararPay();
        const el = $('#payT'); if (el) el.textContent = restante();
        if (ui.pay.fim <= Date.now()) { pararPay(); ui.pay.st = 'expirado'; renderSheet(); }
      }, 1000);
      payAuto = setTimeout(pagar, 9000);
    } else payAuto = setTimeout(pagar, 2400);
  }
  function pagar() {
    if (!ui.pay || ui.pay.st === 'aprovado') return;
    pararPay();
    const p = ui.pay.p; p.pago = true; p.pagoEm = new Date().toISOString();
    let ped;
    try { ped = finalizar(p); } catch (e) { ui.pay = null; ui.sheet = null; ui.busy = false; renderSheet(); setErro('Não foi possível registrar o pedido. Tente de novo.'); return; }
    ui.pay.st = 'aprovado'; ui.pay.ped = ped; renderSheet();
    setTimeout(() => go('pedido.html?id=' + encodeURIComponent(ped.id)), 1600);
  }
  VIEWS.pay = () => {
    const y = ui.pay;
    if (y.st === 'aprovado') return { t: 'Pagamento aprovado', b: '<div class="pay pay-ok"><div class="big">' + ic('check') + '</div><h3>Pagamento aprovado</h3><p>' + brl(y.total) + ' via ' + esc(pmNome(y.tipo)) + '. Pedido #' + y.ped.num + ' enviado para a loja.</p><p>Levando você para o acompanhamento…</p></div>' };
    if (y.tipo !== 'pix') return { t: 'Processando', b: '<div class="pay pay-pr"><span class="spin"></span><p class="pay-v">' + brl(y.total) + '</p><p class="pay-s">Processando no ' + (y.tipo === 'credito' ? 'crédito' : 'débito') + (y.band ? ' · ' + esc(y.band) : '') + ' final ' + esc(y.final) + '…</p>' + mpSelo() + '</div>' };
    if (y.st === 'expirado') return { t: 'Pix expirado', b: '<div class="pay"><p class="pay-s" style="margin:20px 0">O código Pix venceu antes do pagamento. Nenhum valor foi cobrado.</p></div>', f: '<button type="button" class="btn" data-a="payNovo">Gerar novo código</button>' };
    const b = '<div class="pay"><p class="pay-s" style="margin-top:0">Valor exato do pedido</p><p class="pay-v">' + brl(y.total) + '</p>' + qrFake(y.code) +
      '<p class="pay-s" style="margin-bottom:6px">Ou use o Pix copia e cola:</p><code id="pixC">' + esc(y.code) + '</code>' +
      '<p style="margin-top:10px"><button type="button" class="btn sm alt full" data-a="copiarPix">' + ic('copy') + 'Copiar código Pix</button></p>' +
      '<div class="pay-st"><span class="spin"></span><span>Aguardando pagamento. Confirmamos sozinho.<br>Código válido por <b id="payT">' + restante() + '</b></span></div>' + mpSelo() +
      '<div class="demo-w" style="margin-top:12px;text-align:left">' + ic('warn') + '<span>Demonstração: este QR não é pagável.<small>Em alguns segundos a tela confirma sozinha, como acontece quando o cliente paga de verdade.</small></span></div></div>';
    return { t: 'Pague com Pix', b, f: '<button type="button" class="btn" data-a="pagar">Simular pagamento</button>' };
  };

  /* ---------- checkout ---------- */
  function ckVHTML() {
    const c = cliLoja(), ativos = c ? YK.vouchersAtivos(db, c) : [], f = fid();
    if (!telOk(cli.tel)) return '';
    if (!ativos.length) return '<p class="note">' + ic('ticket') + '<span>' + (c ? 'Seu cartão fidelidade está com <b>' + c.selos + ' de ' + f.meta + '</b> selos.' : 'Primeiro pedido com este número: seu cartão fidelidade é criado automaticamente.') + '</span></p>';
    const v = ativos[0], on = vch && vch.id === v.id;
    return '<div class="vch"><div class="vch-l">Vale<b>1</b></div><div class="vch-r"><b>' + (on ? 'Prêmio no pedido' : 'Você tem 1 ' + esc(v.premio) + ' grátis') + '</b><span>' + (on ? 'Toque em outro sabor para trocar.' : 'Resgatar neste pedido? Escolha o sabor:') + '</span><div class="chips">' +
      saboresPremio().map(s => '<button type="button" class="chip' + (on && vch.sabor === s.id ? ' on' : '') + '" data-a="vchS" data-id="' + v.id + '" data-v="' + s.id + '">' + esc(s.nome) + '</button>').join('') +
      '</div>' + (on ? '<button type="button" class="lnk" style="color:#fff" data-a="vchOff">Não usar agora</button>' : '') + '</div></div>';
  }
  function ckResHTML() {
    const t = tot();
    return cart.map(i => '<div class="ci"><div class="ci-t"><b>' + i.qtd + 'x ' + esc(linhaNome(i)) + '</b>' + (i.obs ? '<small>' + esc(i.obs) + '</small>' : '') + (linhaOff(i) ? '<small class="w">Esgotado hoje</small>' : '') + '</div><div class="ci-p">' + brl(linhaPreco(i) * i.qtd) + '</div></div>').join('') +
      vchLinha(false) + totHTML(t) + minHTML(t) + seloHTML(t) + '<p style="text-align:center;margin-top:8px"><button type="button" class="lnk" data-a="carrinho">Alterar itens da sacola</button></p>';
  }
  function initCheckout() {
    const el = $('#checkout'); if (!el) return;
    checkVch();
    const t = tot(); ui.ckVazio = !t.n;
    if (!t.n) { el.innerHTML = '<div class="card empty"><p>Sua sacola está vazia. Escolha um yakisoba para continuar.</p><a class="btn" href="cardapio.html">Ver cardápio</a></div>'; return; }
    const ab = YK.aberta(db), prox = ab ? null : proxAbertura();
    el.innerHTML = '<div class="ck-g"><div>' +
      (!ab ? '<p class="note ag" style="margin-bottom:14px">' + ic('clock') + '<span><b>Loja fechada agora.</b> Seu pedido fica agendado e entra na chapa ' + (prox ? quandoTxt(prox) : 'na próxima abertura') + '.</span></p>' : '') +
      '<section class="card"><h2 class="stp"><i>1</i>Como você quer receber?</h2><div class="rec" data-receber></div>' +
      '<div class="stack" id="ckEnd" style="margin-top:14px"><div class="row2"><label class="fld"><span>Rua</span><input class="inp" data-f="rua" id="ckRua" autocomplete="address-line1" maxlength="80" value="' + esc(cli.rua) + '"></label><label class="fld"><span>Número</span><input class="inp" data-f="numero" id="ckNum" inputmode="numeric" maxlength="8" value="' + esc(cli.numero) + '"></label></div>' +
      '<label class="fld"><span>Complemento (prédio, apto, bloco)</span><input class="inp" data-f="compl" autocomplete="address-line2" maxlength="60" value="' + esc(cli.compl) + '"></label>' +
      '<label class="fld"><span>Ponto de referência (opcional)</span><input class="inp" data-f="ref" maxlength="80" value="' + esc(cli.ref) + '"></label></div></section>' +
      '<section class="card"><h2 class="stp"><i>2</i>Seus dados</h2><div class="stack"><label class="fld"><span>Nome</span><input class="inp" data-f="nome" id="ckNome" autocomplete="name" maxlength="50" value="' + esc(cli.nome) + '"></label>' +
      '<label class="fld"><span>WhatsApp com DDD</span><input class="inp" data-f="tel" id="ckTel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="(71) 90000-0000" maxlength="16" value="' + esc(maskTel(cli.tel)) + '"></label><div id="ckV"></div></div></section>' +
      '<section class="card"><h2 class="stp"><i>3</i>Pagamento</h2><div id="ckPag"></div></section>' +
      '<section class="card"><label class="fld"><span>Observação do pedido (opcional)</span><input class="inp" data-f="obs" maxlength="140" placeholder="Ex.: interfone quebrado, ligar ao chegar" value="' + esc(cli.obs) + '"></label></section>' +
      '</div><aside class="card ck-side"><h2 class="stp"><i>4</i>Confira e finalize</h2><div id="ckRes"></div><div class="err" id="ckErr" role="alert" hidden></div><button type="button" class="btn full" id="ckBtn" data-a="enviar"></button></aside></div>';
    renderReceber(); renderPag(); updCk();
  }
  function updCk() {
    if (PAGE !== 'checkout' || ui.feito) return;
    checkVch();
    const t = tot();
    if (!!ui.ckVazio !== !t.n) return initCheckout();
    if (!t.n) return;
    const end = $('#ckEnd'); if (end) end.hidden = cli.tipo !== 'entrega' || foraZona();
    $('#ckV').innerHTML = ckVHTML(); $('#ckRes').innerHTML = ckResHTML();
    const on = t.total > 0 && (YK.PAGAMENTOS.find(m => m.id === cli.pagamento) || {}).online;
    $('#ckBtn').textContent = (on ? 'Pagar e fazer pedido · ' : 'Fazer pedido · ') + brl(t.total);
    const e = $('#ckErr'); e.hidden = !ui.erro; e.textContent = ui.erro;
    const pg = $('#ckPag'), sig = (t.total <= 0 ? 'zero' : pmDisponiveis().map(m => m.id).join(',')) + '|' + cli.tipo;
    if (pg && pg.dataset.sig !== sig) { pg.dataset.sig = sig; renderPag(); updCk(); }
  }
  function setErro(m, sel) {
    ui.erro = m; ui.busy = false;
    const e = $('#ckErr'); if (e) { e.hidden = !m; e.textContent = m; }
    const el = sel ? $(sel) : e;
    if (el) { el.scrollIntoView({ block: 'center' }); if (sel) { try { el.focus({ preventScroll: true }); } catch (x) {} } }
  }
  function finalizar(p) {
    const ped = YK.criarPedido(p);
    db = YK.db(); ui.feito = true;
    cli.ultimoPedidoId = ped.id; cli.pedidos = [ped.id].concat(cli.pedidos.filter(x => x !== ped.id)).slice(0, 8);
    if (cart.length) cli.ultimo = { itens: cart.map(i => i.tipo === 'yaki' ? { tipo: 'yaki', tamanho: i.tamanho, sabor: i.sabor, qtd: i.qtd, obs: i.obs || '' } : { tipo: 'extra', id: i.id, qtd: i.qtd }), tipo: cli.tipo };
    cli.obs = ''; cli.tel = maskTel(cli.tel); if (!cli.cardTel) cli.cardTel = digits(cli.tel);
    saveCli(); cart = []; saveCart(); setVch(null);
    return ped;
  }
  function enviar() {
    if (ui.busy) return;
    db = YK.db(); checkVch();
    const t = tot(), f = fid(), ent = cli.tipo === 'entrega';
    if (!cart.length && !vch) return setErro('Sua sacola está vazia.');
    if (cart.some(linhaOff)) return setErro('Um item da sacola esgotou hoje. Toque em "Alterar itens da sacola" e remova para continuar.');
    if (!cli.tipo) return setErro('Escolha entrega ou retirada.', '[data-receber]');
    if (ent) {
      if (foraZona()) return setErro('Esse CEP está fora da área de entrega. Escolha retirada na loja ou informe outro endereço.', '[data-receber]');
      if (!t.b) return setErro('Informe o CEP ou escolha o bairro da entrega.', '[data-f="cep"]');
      if (t.faltaMin > 0) return setErro('Faltam ' + brl(t.faltaMin) + ' para o pedido mínimo de entrega em ' + t.b.nome + '.');
      if (cli.rua.trim().length < 3) return setErro('Informe a rua da entrega.', '#ckRua');
      if (!cli.numero.trim()) return setErro('Informe o número.', '#ckNum');
    }
    if (cli.nome.trim().length < 2) return setErro('Informe o seu nome.', '#ckNome');
    if (!telOk(cli.tel)) return setErro('Informe o WhatsApp com DDD.', '#ckTel');
    const zero = t.total <= 0, ms = pmDisponiveis(), m = ms.find(x => x.id === cli.pagamento);
    if (!zero && !m) return setErro('Escolha a forma de pagamento.', '#ckPag');
    const troco = !zero && cli.pagamento === 'dinheiro' ? num(cli.troco) : 0;
    if (troco && troco < t.total) return setErro('O troco precisa ser para um valor maior que o total (' + brl(t.total) + ').', '#ckTroco');
    const cartao = !zero && (cli.pagamento === 'credito' || cli.pagamento === 'debito');
    if (cartao) {
      const k = cardCheck(); ui.cardErr = k; updCard();
      const bad = ['num', 'nome', 'val', 'cvv'].find(x => k[x]);
      if (bad) return setErro('Confira os dados do cartão: ' + k[bad].toLowerCase() + '.', '[data-c="' + bad + '"]');
    }
    const itens = cart.map(i => i.tipo === 'yaki' ? { tipo: 'yaki', tamanho: i.tamanho, sabor: i.sabor, qtd: i.qtd, obs: (i.obs || '').trim(), preco: YK.preco(db, i.tamanho, i.sabor) }
      : { tipo: 'extra', id: i.id, nome: ext(i.id).nome, qtd: i.qtd, preco: ext(i.id).preco });
    if (vch) itens.push({ tipo: 'yaki', tamanho: f.premioTamanho, sabor: vch.sabor, qtd: 1, obs: '', preco: YK.preco(db, f.premioTamanho, vch.sabor), gratis: true });
    const p = {
      canal: 'site', cliente: { nome: cli.nome.trim(), tel: digits(cli.tel) }, tipo: cli.tipo,
      endereco: { bairro: ent ? cli.bairro : '', rua: ent ? cli.rua.trim() : '', numero: ent ? cli.numero.trim() : '', compl: ent ? cli.compl.trim() : '', ref: ent ? cli.ref.trim() : '', cep: ent ? soNum(cli.cep) : '' },
      itens, pagamento: zero ? (ms.find(x => !x.online) || { id: 'dinheiro' }).id : cli.pagamento, troco: troco || null, obs: cli.obs.trim(), pago: false
    };
    if (vch) p.voucherId = vch.id;
    if (!YK.aberta(db)) { const prox = proxAbertura(); if (prox) p.agendadoPara = prox.toISOString(); }
    ui.erro = ''; ui.busy = true; updCk();
    if (!zero && m.online) return iniciarPay(p, m.id === 'pix' ? 'pix' : m.id, t.total);
    let ped;
    try { ped = finalizar(p); } catch (e) { return setErro('Não foi possível registrar o pedido. Tente de novo.'); }
    go('pedido.html?id=' + encodeURIComponent(ped.id));
  }

  /* ---------- acompanhamento ---------- */
  function tituloStatus(ped, s) {
    const ret = ped.tipo === 'retirada';
    if (s === 'novo') return ped.agendadoPara ? 'Pedido agendado' : 'Pedido recebido';
    if (s === 'pronto') return ret ? 'Pronto para retirada' : 'Pronto';
    if (s === 'concluido') return ret ? 'Retirado' : 'Entregue';
    return (YK.STATUS.find(x => x.id === s) || {}).nome || s;
  }
  function descStatus(ped, s) {
    const ret = ped.tipo === 'retirada', ent = ped.entregadorId ? (db.entregadores.find(e => e.id === ped.entregadorId) || {}).nome : '';
    if (s === 'novo') return ped.agendadoPara ? 'A loja está fechada. Seu pedido entra na chapa ' + quandoIso(ped.agendadoPara) + '.' : 'A loja já recebeu e vai confirmar em instantes.';
    if (s === 'preparo') return 'Seu yakisoba está na chapa agora.';
    if (s === 'pronto') return ret ? 'Pode vir buscar: ' + YK.LOJA.endereco + '.' : 'Embalado e esperando o entregador.';
    if (s === 'rota') return (ent ? ent + ' está' : 'O entregador está') + ' a caminho do seu endereço.';
    if (s === 'concluido') return 'Bom apetite! Obrigado por pedir direto com a gente.';
    return '';
  }
  function pgtoTxt(ped) {
    const n = pmNome(ped.pagamento, ped.tipo);
    if (ped.pago) return n + ' (PAGO pelo site)';
    if (ped.total <= 0) return 'Nada a pagar';
    return n + (ped.pagamento === 'dinheiro' ? (ped.troco ? ' (troco para ' + brl(ped.troco) + ')' : ' (sem troco)') : '') + ' · pagar na ' + (ped.tipo === 'retirada' ? 'retirada' : 'entrega');
  }
  function resumoWA(ped) {
    const L = ['*Pedido #' + ped.num + ' · Y-AKIO*', ''];
    if (ped.tipo === 'entrega') { const e = ped.endereco || {}; L.push('*Entrega:* ' + [e.rua, e.numero, e.compl].filter(Boolean).join(', ') + ' - ' + e.bairro + (e.cep ? ' · CEP ' + maskCep(e.cep) : '') + (e.ref ? ' (ref.: ' + e.ref + ')' : '')); }
    else L.push('*Retirada na loja*');
    if (ped.agendadoPara) L.push('*Agendado para:* ' + quandoIso(ped.agendadoPara));
    L.push('');
    ped.itens.forEach(i => {
      const nome = i.tipo === 'yaki' ? 'Yakisoba ' + (tam(i.tamanho) || {}).nome + ' de ' + (sab(i.sabor) || {}).nome : i.nome;
      L.push(i.qtd + 'x ' + nome + ' · ' + (i.gratis ? 'GRÁTIS (cartão fidelidade)' : brl(i.preco * i.qtd)));
      if (i.obs) L.push('   obs.: ' + i.obs);
    });
    L.push('', 'Subtotal: ' + brl(ped.subtotal));
    if (ped.tipo === 'entrega') L.push('Entrega: ' + brl(ped.taxa));
    L.push('*Total: ' + brl(ped.total) + '*', 'Pagamento: ' + pgtoTxt(ped));
    if (ped.obs) L.push('Obs.: ' + ped.obs);
    L.push('', 'Nome: ' + ped.cliente.nome, 'Pedido feito pelo site.');
    return L.join('\n');
  }
  let pedId = null;
  function renderPedido() {
    const el = $('#pedido'); if (!el) return;
    const ped = pedId ? db.pedidos.find(p => p.id === pedId) : null;
    const tit = $('#pedTit');
    if (!ped) {
      if (tit) tit.textContent = 'Acompanhar pedido';
      el.innerHTML = '<div class="card empty"><p>' + (pedId ? 'Não encontramos esse pedido. Ele pode ter sido apagado ao reiniciar a demonstração.' : 'Você ainda não fez nenhum pedido neste aparelho.') + '</p><a class="btn" href="cardapio.html">Ver cardápio</a></div>';
      return;
    }
    if (tit) tit.textContent = 'Pedido #' + ped.num;
    const ret = ped.tipo === 'retirada', f = fid();
    const steps = ret ? ['novo', 'preparo', 'pronto', 'concluido'] : ['novo', 'preparo', 'pronto', 'rota', 'concluido'];
    const st = ped.status === 'rota' && ret ? 'pronto' : ped.status, idx = steps.indexOf(st), canc = ped.status === 'cancelado', fim = ped.status === 'concluido';
    const base = new Date(ped.agendadoPara || ped.criado).getTime(), prep = (db.config.tempoPreparoMin || 25) * 6e4;
    const prev = ret ? 'Previsão para retirar: ' + hhmm(base + prep) : 'Previsão de entrega: ' + hhmm(base + prep + 15 * 6e4) + ' a ' + hhmm(base + prep + 25 * 6e4);
    let a = '<div class="tk-top"><div style="flex:1;min-width:0"><small>' + (ret ? 'Retirada na loja' : 'Entrega em ' + esc((ped.endereco || {}).bairro || '')) + ' · ' + esc(ped.cliente.nome.split(' ')[0]) + '</small><div class="num">#' + ped.num + '</div><b>' + (canc ? 'Pedido cancelado' : fim ? 'Pedido concluído' : prev) + '</b>' + (canc || fim ? '' : '<small>Estimativa de exemplo. Esta página atualiza sozinha.</small>') + '</div></div>';
    a += ped.pago ? '<div class="pgto ok">' + ic('check') + '<span>Pago pelo site · ' + esc(pmNome(ped.pagamento, ped.tipo)) + '<small>' + brl(ped.total) + (ped.pagoEm ? ' às ' + hhmm(ped.pagoEm) : '') + ' · processado pelo Mercado Pago (demonstração)</small></span></div>'
      : '<div class="pgto">' + ic(ped.total <= 0 ? 'gift' : (PM_INFO[ped.pagamento] || ['cash'])[0]) + '<span>' + (ped.total <= 0 ? 'Nada a pagar: prêmio do cartão fidelidade' : brl(ped.total) + ' · ' + esc(pgtoTxt(ped))) + '</span></div>';
    if (canc) a += '<p class="err" style="margin-top:14px">Este pedido foi cancelado pela loja. Se tiver dúvida, fale com a gente no WhatsApp.' + (ped.voucherId ? ' Seu prêmio voltou para o cartão.' : '') + (ped.pago ? ' O valor pago é devolvido pela loja.' : '') + '</p>';
    else a += '<div class="card" style="margin-top:14px"><ol class="tl" style="margin-top:0">' + steps.map((s, i) => {
      const done = i < idx || fim, cur = i === idx && !fim; let hi = null;
      ped.hist.forEach(x => { if (x.s === s || (ret && s === 'pronto' && x.s === 'rota' && !hi)) hi = x.t; });
      return '<li class="' + (done ? 'ok' : cur ? 'cur' : '') + (fim && i === steps.length - 1 ? ' last' : '') + '"><span class="d">' + (done ? ic('check') : '') + '</span><span class="tx"><b>' + esc(tituloStatus(ped, s)) + '</b><small>' + esc(descStatus(ped, s)) + '</small></span><time>' + (hi && (done || cur) ? hhmm(hi) : '') + '</time></li>';
    }).join('') + '</ol></div>';
    if (!canc) {
      const elegivel = f.canais.indexOf(ped.canal) >= 0 && ped.subtotal >= f.pedidoMinimo, stp = '<span class="st"><img src="../assets/mascote-rosto.jpg" alt=""></span>';
      if (ped.seloDado) a += '<div class="selo" style="margin-top:14px">' + stp + '<div>Selo carimbado no seu cartão!<small>Pedido direto dá selo. Pelo iFood, não.</small></div><button type="button" class="btn sm" data-a="meuCartao">Ver cartão</button></div>';
      else if (elegivel && !fim) a += '<div class="selo" style="margin-top:14px">' + stp + '<div>Este pedido vale 1 selo<small>O carimbo cai no seu cartão quando o pedido for concluído.</small></div><button type="button" class="btn sm alt" data-a="meuCartao">Ver cartão</button></div>';
    }
    let b = '<div class="card"><p class="lbl">Resumo do pedido</p>' + ped.itens.map(i => {
      const nome = i.tipo === 'yaki' ? 'Yakisoba ' + ((tam(i.tamanho) || {}).nome || '') + ' · ' + ((sab(i.sabor) || {}).nome || '') : i.nome;
      return '<div class="ci"><div class="ci-t"><b>' + i.qtd + 'x ' + esc(nome) + '</b>' + (i.gratis ? '<small class="w">Prêmio do cartão fidelidade</small>' : '') + (i.obs ? '<small>' + esc(i.obs) + '</small>' : '') + '</div><div class="ci-p">' + (i.gratis ? '<em>Grátis</em>' : brl(i.preco * i.qtd)) + '</div></div>';
    }).join('') + '<div class="tot"><div><span>Subtotal</span><span>' + brl(ped.subtotal) + '</span></div>' + (ret ? '' : '<div><span>Entrega</span><span>' + brl(ped.taxa) + '</span></div>') + '<div class="T"><span>Total</span><span>' + brl(ped.total) + '</span></div></div>' +
      (ret ? '' : '<p class="lc-sub" style="margin-top:10px">' + esc([ped.endereco.rua, ped.endereco.numero, ped.endereco.compl].filter(Boolean).join(', ') + ' · ' + ped.endereco.bairro) + '</p>') +
      '<a class="btn wa full" style="margin-top:14px" target="_blank" rel="noopener" href="' + esc(YK.waLink(resumoWA(ped))) + '">' + ic('wa') + 'Enviar pedido no WhatsApp</a>' +
      '<p class="lc-sub" style="text-align:center;margin-top:8px">A loja já recebeu o pedido. O WhatsApp é para você falar com a gente.</p></div>';
    const outros = cli.pedidos.map(id => db.pedidos.find(p => p.id === id)).filter(p => p && p.id !== ped.id);
    if (outros.length) b += '<div class="card meus"><p class="lbl">Seus pedidos recentes</p>' + outros.slice(0, 5).map(p => '<a href="pedido.html?id=' + encodeURIComponent(p.id) + '">' + ic('bag') + '<span>Pedido #' + p.num + '<small>' + ddmm(p.criado) + ' · ' + brl(p.total) + ' · ' + esc(p.status === 'cancelado' ? 'Cancelado' : tituloStatus(p, p.status)) + '</small></span>' + ic('chev') + '</a>').join('') + '</div>';
    b += '<p style="text-align:center;margin-top:10px"><a class="lnk" href="cardapio.html">Fazer outro pedido</a></p>';
    el.innerHTML = '<div class="pd-g"><div>' + a + '</div><div>' + b + '</div></div>';
  }

  /* ---------- ações ---------- */
  let toastT;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }
  function refresh(bump) {
    checkVch(); renderHead(); renderAtalhos(); renderReceber(); renderMenu(); renderPops(); renderFid(); renderCartao(); renderPedido(); renderBar(bump);
    if (ui.sheet && ui.sheet !== 'pay') renderSheet();
    updCk();
  }
  function cartChanged(bump) { saveCart(); refresh(bump); }
  function addExtra(id, d) {
    const e = ext(id); if (!e || (d > 0 && pausado(id))) return;
    const it = cart.find(i => i.tipo === 'extra' && i.id === id);
    if (it) { it.qtd += d; if (it.qtd <= 0) cart.splice(cart.indexOf(it), 1); }
    else if (d > 0) cart.push({ k: YK.uid('i'), tipo: 'extra', id, qtd: 1 });
    cartChanged(d > 0);
  }
  const ACT = {
    fechar,
    modo(el) { cli.tipo = el.dataset.v; saveCli(); ui.erro = ''; refresh(); if (PAGE === 'checkout') renderPag(); },
    cep() { consultaCep(); },
    filtro(el) { ui.filtro = el.dataset.v; renderMenu(); const m = $('#menu'); if (m && m.getBoundingClientRect().top < 0) window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - 150); },
    montar(el) { ui.b = { s: el.dataset.v, t: el.dataset.t || 'individual', q: 1, obs: '' }; abrir('builder'); $('#shB').scrollTop = 0; },
    bS(el) { ui.b.s = el.dataset.v; renderSheet(); },
    bT(el) { ui.b.t = el.dataset.v; renderSheet(); },
    bQm() { if (ui.b.q > 1) { ui.b.q--; renderSheet(); } },
    bQp() { if (ui.b.q < 20) { ui.b.q++; renderSheet(); const d = $('#shB .dica'); if (d) d.scrollIntoView({ block: 'nearest' }); } },
    bUp(el) { ui.b.t = el.dataset.v; ui.b.q = 1; renderSheet(); toast('Trocado por 1 ' + tam(ui.b.t).nome); },
    bO(el) {
      const o = el.dataset.v, ps = (ui.b.obs || '').split(',').map(x => x.trim()).filter(Boolean);
      const i = ps.map(x => x.toLowerCase()).indexOf(o.toLowerCase());
      if (i >= 0) ps.splice(i, 1); else ps.push(o);
      ui.b.obs = ps.join(', '); renderSheet();
    },
    bAdd() {
      const b = ui.b; if (yOff(b.t, b.s)) return;
      const o = (b.obs || '').trim(), ex = cart.find(i => i.tipo === 'yaki' && i.tamanho === b.t && i.sabor === b.s && (i.obs || '') === o);
      if (ex) ex.qtd += b.q; else cart.push({ k: YK.uid('i'), tipo: 'yaki', tamanho: b.t, sabor: b.s, qtd: b.q, obs: o });
      ui.sheet = null; renderSheet(); cartChanged(true);
      toast(b.q + 'x ' + tam(b.t).nome + ' de ' + sab(b.s).nome + ' na sacola');
    },
    eP(el) { addExtra(el.dataset.id, 1); },
    eM(el) { addExtra(el.dataset.id, -1); },
    cP(el) { const i = cart.find(x => x.k === el.dataset.k); if (!i) return; if (i.tipo === 'extra') return addExtra(i.id, 1); if (i.qtd < 30) i.qtd++; cartChanged(); },
    cM(el) { const i = cart.find(x => x.k === el.dataset.k); if (!i) return; if (i.tipo === 'extra') return addExtra(i.id, -1); i.qtd--; if (i.qtd <= 0) cart.splice(cart.indexOf(i), 1); cartChanged(); },
    cUp(el) {
      const i = cart.find(x => x.k === el.dataset.k); if (!i) return;
      i.tamanho = el.dataset.v; i.qtd = 1;
      const dup = cart.find(x => x !== i && x.tipo === 'yaki' && x.tamanho === i.tamanho && x.sabor === i.sabor && (x.obs || '') === (i.obs || ''));
      if (dup) { dup.qtd += 1; cart.splice(cart.indexOf(i), 1); }
      cartChanged(); toast('Trocado por 1 ' + tam(el.dataset.v).nome);
    },
    carrinho() { abrir('cart'); },
    irCheckout() { if (cart.some(linhaOff)) return toast('Remova o item esgotado para continuar'); go('checkout.html'); },
    irMenu() { if (PAGE === 'cardapio') { ui.sheet = null; renderSheet(); window.scrollTo(0, 0); } else go('cardapio.html'); },
    pag(el) { cli.pagamento = el.dataset.v; saveCli(); ui.erro = ''; ui.cardErr = {}; renderPag(); updCk(); },
    vchS(el) {
      setVch({ id: el.dataset.id, sabor: el.dataset.v }); checkVch();
      if (!vch) { toast('Este prêmio não está disponível para o WhatsApp informado'); if (ui.sheet) fechar(); refresh(); return; }
      if (el.dataset.go) { toast('Yakisoba grátis na sua sacola'); ui.sheet = 'cart'; }
      refresh();
    },
    vchOff() { setVch(null); refresh(); },
    usarVch(el) {
      cli.tel = maskTel(cli.cardTel); saveCli(); ui.vchId = el.dataset.v;
      if (!saboresPremio().length) return toast('O prêmio está esgotado hoje. Tente amanhã.');
      abrir('premio');
    },
    enviar,
    pagar,
    payNovo() { if (!ui.pay) return; iniciarPay(ui.pay.p, 'pix', ui.pay.total); },
    copiarPix() {
      const k = ui.pay ? ui.pay.code : '';
      try { navigator.clipboard.writeText(k).then(() => toast('Código Pix copiado'), () => toast('Selecione e copie o código acima')); } catch (e) { toast('Selecione e copie o código acima'); }
    },
    denovo() {
      const u = ultimoValido(); if (!u) return;
      cart = u.itens.map(i => Object.assign({ k: YK.uid('i') }, i));
      if (cli.ultimo.tipo) cli.tipo = cli.ultimo.tipo;
      saveCli(); saveCart(); go('checkout.html');
    },
    meuCartao() { const ped = db.pedidos.find(p => p.id === pedId); if (ped) { cli.cardTel = digits(ped.cliente.tel); saveCli(); } go('fidelidade.html'); },
    demoCard(el) { verCartao(el.dataset.v, true); }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('[data-a]') : null;
    if (el) { if (el.disabled) return; const fn = ACT[el.dataset.a]; if (fn) fn(el); return; }
    if (e.target.id === 'ov') fechar();
  });
  document.addEventListener('input', e => {
    const el = e.target, ds = el.dataset || {};
    if (ds.c) {
      let v = el.value;
      if (ds.c === 'num') v = soNum(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
      else if (ds.c === 'val') { const d = soNum(v).slice(0, 4); v = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }
      else if (ds.c === 'cvv') v = soNum(v).slice(0, 4);
      else v = v.toUpperCase();
      el.value = v; ui.card[ds.c] = v; updCard(); return;
    }
    if (ds.o) { const i = cart.find(x => x.k === ds.o); if (i) { i.obs = el.value; saveCart(); if (PAGE === 'checkout') updCk(); } return; }
    const f = ds.f; if (!f) return;
    if (f === 'tel') { el.value = maskTel(el.value); cli.tel = el.value; saveCli(); ui.erro = ''; updCk(); renderHead(); return; }
    if (f === 'cardTel') { el.value = maskTel(el.value); return; }
    if (f === 'bobs') { ui.b.obs = el.value; return; }
    if (f === 'cep') { el.value = maskCep(el.value); cli.cep = el.value; saveCli(); if (soNum(el.value).length === 8) consultaCep(); return; }
    if (f === 'bairro') { cli.bairro = el.value; cli.cepRes = null; cli.cep = ''; saveCli(); ui.erro = ''; refresh(); return; }
    cli[f] = el.value; saveCli();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ui.sheet) fechar();
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.f === 'cep') { e.preventDefault(); consultaCep(); }
  });
  window.addEventListener('storage', e => { if (e.key === 'yk_carrinho') { loadCart(); refresh(); } });

  YK.on(d => {
    db = d || YK.db();
    const ped = cli.ultimoPedidoId ? db.pedidos.find(p => p.id === cli.ultimoPedidoId) : null;
    if (ped && ui.lastSt && ped.status !== ui.lastSt && !(PAGE === 'pedido' && pedId === ped.id)) toast('Pedido #' + ped.num + ': ' + (ped.status === 'cancelado' ? 'cancelado' : tituloStatus(ped, ped.status)));
    if (ped) ui.lastSt = ped.status;
    if (!ui.feito) refresh();
  });
  setInterval(() => { db = YK.db(); renderHead(); renderAtalhos(); }, 30000);

  /* ---------- início ---------- */
  shell();
  (() => {
    const ped = cli.ultimoPedidoId ? db.pedidos.find(p => p.id === cli.ultimoPedidoId) : null;
    if (ped) ui.lastSt = ped.status;
    if (PAGE === 'pedido') { let id = null; try { id = new URLSearchParams(location.search).get('id'); } catch (e) {} pedId = id || cli.ultimoPedidoId || null; }
    const form = $('#fidForm');
    if (form) {
      const t = cli.cardTel || (telOk(cli.tel) ? digits(cli.tel) : '');
      if (t) $('#cardTel').value = maskTel(t);
      form.addEventListener('submit', e => { e.preventDefault(); verCartao($('#cardTel').value, true); });
    }
    renderLoc();
    if (PAGE === 'checkout') initCheckout();
    refresh();
  })();
})();
