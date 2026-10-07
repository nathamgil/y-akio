/* Y-AKIO — camada de dados compartilhada entre site/ e painel/ (demo em localStorage).
   Mesma origem => pedido feito no site aparece no painel na hora (BroadcastChannel + storage event).
   Em produção isso vira Supabase; a API abaixo é o contrato. NÃO alterar assinaturas. */
(function () {
  const KEY = 'yk_db_v1';
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('yk_sync') : null;
  const listeners = [];

  const LOJA = {
    nome: 'Y-AKIO', slogan: 'Delivery de Yakisoba', instagram: 'yakio.delivery',
    whatsapp: '5571982186074', whatsappFmt: '(71) 98218-6074',
    endereco: 'Rua Oito de Dezembro, 88 — Graça, Salvador-BA',
    horarios: { fechado: [1], turnos: [['11:00', '14:00'], ['18:00', '21:00']], texto: 'Terça a domingo · 11h–14h e 18h–21h · Segunda fechado' },
  };

  const TAMANHOS = [
    { id: 'mini', nome: 'Mini', gramas: 150, desc: 'aprox. 150 g · pra beliscar ou pra criança' },
    { id: 'individual', nome: 'Individual', gramas: 500, desc: 'aprox. 500 g · a fome de uma pessoa' },
    { id: 'meia', nome: '1/2 Família', gramas: 1300, desc: 'aprox. 1,3 kg · 3 a 4 pessoas' },
    { id: 'familia', nome: 'Família', gramas: 2600, desc: 'aprox. 2,6 kg · 7 pratos' },
  ];
  const SABORES = [
    { id: 'camarao', nome: 'Camarão', desc: 'Camarão salteado na chapa, legumes e molho da casa' },
    { id: 'carne', nome: 'Carne', desc: 'Tiras de carne, legumes e molho da casa' },
    { id: 'frango', nome: 'Frango', desc: 'Frango em cubos, legumes e molho da casa' },
    { id: 'mistao', nome: 'Mistão', desc: 'Camarão, carne e frango — o completo' },
    { id: 'misto', nome: 'Misto', desc: 'Carne e frango' },
    { id: 'vegetariano', nome: 'Vegetariano', desc: 'Só legumes: repolho, brócolis, cenoura, pimentão' },
  ];
  // Preços do cardápio fixo (venda direta) enviado pela Catarina em 06/10/2026.
  // ATENÇÃO: no 1/2 Família a arte mostra Mistão 122 / Misto 137 (invertido em relação aos outros tamanhos).
  // Aqui está corrigido para manter a lógica (mistão = preço do camarão). CONFIRMAR com ela.
  const PRECOS = {
    mini:       { camarao: 20,  carne: 18,  frango: 16,  mistao: 20,  misto: 18,  vegetariano: 15 },
    individual: { camarao: 46,  carne: 40,  frango: 38,  mistao: 46,  misto: 40,  vegetariano: 34 },
    meia:       { camarao: 137, carne: 122, frango: 110, mistao: 137, misto: 122, vegetariano: 102 },
    familia:    { camarao: 274, carne: 244, frango: 220, mistao: 274, misto: 244, vegetariano: 204 },
  };
  const EXTRAS = [
    { id: 'rol-mussarela', cat: 'Rolinho primavera', nome: 'Rolinho de Mussarela', preco: 9.9, real: true },
    { id: 'rol-repolho', cat: 'Rolinho primavera', nome: 'Rolinho de Repolho', preco: 9.9, real: true },
    { id: 'rol-romeu', cat: 'Rolinho primavera', nome: 'Rolinho Romeu e Julieta', preco: 9.9, real: true },
    // bebidas: preços de EXEMPLO (não vieram no cardápio)
    { id: 'coca-lata', cat: 'Bebidas', nome: 'Coca-Cola lata 350 ml', preco: 7, real: false },
    { id: 'guarana-lata', cat: 'Bebidas', nome: 'Guaraná lata 350 ml', preco: 7, real: false },
    { id: 'agua', cat: 'Bebidas', nome: 'Água mineral 500 ml', preco: 4, real: false },
  ];
  // Taxas de entrega de EXEMPLO por bairro (ela hoje combina caso a caso com entregador terceirizado).
  const BAIRROS = [
    { nome: 'Graça', taxa: 7, min: 20 }, { nome: 'Vitória', taxa: 8, min: 25 }, { nome: 'Canela', taxa: 8, min: 25 },
    { nome: 'Barra', taxa: 10, min: 30 }, { nome: 'Garcia', taxa: 10, min: 30 }, { nome: 'Campo Grande', taxa: 10, min: 30 },
    { nome: 'Federação', taxa: 12, min: 35 }, { nome: 'Ondina', taxa: 12, min: 35 }, { nome: 'Rio Vermelho', taxa: 15, min: 45 },
    { nome: 'Barris', taxa: 12, min: 35 }, { nome: 'Nazaré', taxa: 13, min: 40 }, { nome: 'Pituba', taxa: 18, min: 55 },
  ];
  // Ficha técnica (g por 100 g de yakisoba pronto) — EXEMPLO, ela ajusta no painel.
  const FICHA = {
    base: { macarrao: 45, legumes: 25, molho: 8 },
    proteina: { camarao: { camarao: 22 }, carne: { carne: 22 }, frango: { frango: 22 }, mistao: { camarao: 8, carne: 8, frango: 8 }, misto: { carne: 11, frango: 11 }, vegetariano: { legumes: 15 } },
    embalagem: { mini: 'emb-p', individual: 'emb-m', meia: 'emb-g', familia: 'emb-gg' },
  };
  const ESTOQUE = [
    { id: 'macarrao', nome: 'Macarrão para yakisoba', un: 'g', qtd: 18000, min: 6000, custo: 0.012 },
    { id: 'legumes', nome: 'Mix de legumes (repolho, brócolis, cenoura, pimentão)', un: 'g', qtd: 9000, min: 4000, custo: 0.009 },
    { id: 'molho', nome: 'Molho da casa', un: 'g', qtd: 3500, min: 1500, custo: 0.02 },
    { id: 'camarao', nome: 'Camarão limpo', un: 'g', qtd: 2800, min: 3000, custo: 0.075 },
    { id: 'carne', nome: 'Carne em tiras', un: 'g', qtd: 5200, min: 2500, custo: 0.045 },
    { id: 'frango', nome: 'Frango em cubos', un: 'g', qtd: 6100, min: 2500, custo: 0.022 },
    { id: 'emb-p', nome: 'Embalagem P (mini)', un: 'un', qtd: 140, min: 50, custo: 0.6 },
    { id: 'emb-m', nome: 'Embalagem M (individual)', un: 'un', qtd: 38, min: 60, custo: 0.95 },
    { id: 'emb-g', nome: 'Embalagem G (1/2 família)', un: 'un', qtd: 45, min: 15, custo: 2.4 },
    { id: 'emb-gg', nome: 'Embalagem GG (família)', un: 'un', qtd: 22, min: 10, custo: 3.8 },
    { id: 'rolinho', nome: 'Rolinho primavera (un)', un: 'un', qtd: 64, min: 30, custo: 3.2 },
    { id: 'hashi', nome: 'Hashi + sachê shoyu', un: 'un', qtd: 310, min: 100, custo: 0.35 },
  ];
  const ENTREGADORES = [
    { id: 'e1', nome: 'Jeferson (moto)', tel: '5571900000001', ativo: true },
    { id: 'e2', nome: 'Davi (moto)', tel: '5571900000002', ativo: true },
    { id: 'e3', nome: 'Motoboy iFood (sob demanda)', tel: '', ativo: true, ifood: true },
  ];
  const CONFIG = {
    fidelidade: { meta: 10, premio: 'Yakisoba Individual', premioTamanho: 'individual', pedidoMinimo: 30, canais: ['site', 'whatsapp'], validadeDias: 90 },
    taxaIfoodPct: 26.2, // plano Entrega do iFood: 23% + 3,2% pagamento online (tabela oficial; plano dela a confirmar) — é o número que alimenta "economia vs iFood"
    // Pagamento online (Mercado Pago). Na demo é simulado; taxas de EXEMPLO, editáveis no painel.
    pagamentos: { mercadoPago: { conectado: true, conta: 'Y-AKIO (demonstração)' }, aceita: { pix: true, credito: true, debito: true, dinheiro: true, cartao: true }, taxasPct: { pix: 0.99, credito: 4.98, debito: 1.99 } },
    tempoPreparoMin: 25, pixChave: 'CHAVE-PIX-DA-LOJA (exemplo)', lojaAberta: 'auto', // 'auto' | 'aberta' | 'fechada'
  };
  const STATUS = [
    { id: 'novo', nome: 'Novo' }, { id: 'preparo', nome: 'Na chapa' }, { id: 'pronto', nome: 'Pronto' },
    { id: 'rota', nome: 'Saiu p/ entrega' }, { id: 'concluido', nome: 'Concluído' }, { id: 'cancelado', nome: 'Cancelado' },
  ];

  // formas de pagamento. pix/credito/debito = pagos online (pedido chega com pago:true); dinheiro/cartao = na entrega/retirada.
  const PAGAMENTOS = [
    { id: 'pix', nome: 'Pix', online: true }, { id: 'credito', nome: 'Cartão de crédito', online: true }, { id: 'debito', nome: 'Cartão de débito', online: true },
    { id: 'dinheiro', nome: 'Dinheiro', online: false }, { id: 'cartao', nome: 'Maquininha na entrega', online: false },
  ];
  // faixa de CEP (5 primeiros dígitos) -> bairro: só reserva para quando o ViaCEP não responde. Aproximado.
  const CEP_RESERVA = { '40150': 'Graça', '40080': 'Vitória', '40081': 'Vitória', '40110': 'Canela', '40140': 'Barra', '40100': 'Garcia', '40210': 'Federação', '40170': 'Ondina', '41940': 'Rio Vermelho', '41950': 'Rio Vermelho', '40070': 'Barris', '40040': 'Nazaré', '40050': 'Nazaré', '41810': 'Pituba', '41830': 'Pituba' };
  const norm = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const tel = t => String(t || '').replace(/\D/g, '').replace(/^55/, '');
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function seed() {
    const now = Date.now(), d = n => new Date(now - n * 864e5).toISOString();
    const clientes = [
      ['Marina Souza', '71991110001', 'Graça', 7, 14], ['Rafael Lima', '71991110002', 'Vitória', 9, 22], ['Dona Célia', '71991110003', 'Canela', 3, 5],
      ['Thiago Barreto', '71991110004', 'Barra', 10, 31], ['Luana Reis', '71991110005', 'Garcia', 1, 1], ['Dr. Paulo Menezes', '71991110006', 'Graça', 5, 9],
      ['Bianca Farias', '71991110007', 'Federação', 0, 4], ['Escritório Almeida Adv.', '71991110008', 'Campo Grande', 6, 12],
    ].map(([nome, t, bairro, selos, pedidos], i) => ({
      id: 'c' + (i + 1), nome, tel: t, bairro, endereco: '', selos: selos % 10, cartoesCompletos: Math.floor(pedidos / 10),
      vouchers: selos >= 10 ? [{ id: uid('v'), premio: 'Yakisoba Individual', criado: d(2), usado: null }] : [],
      pedidos, gasto: pedidos * 52, primeiro: d(120 - i * 9), ultimo: d([1, 2, 38, 0, 6, 3, 52, 4][i]), obs: i === 2 ? 'Sem pimentão' : '', tags: [],
    }));
    return {
      v: 1, criado: new Date().toISOString(), loja: LOJA, tamanhos: TAMANHOS, sabores: SABORES, precos: PRECOS, extras: EXTRAS,
      pausados: [], bairros: BAIRROS, ficha: FICHA, estoque: ESTOQUE, movEstoque: [], entregadores: ENTREGADORES, config: CONFIG,
      clientes, pedidos: [], seq: 1040, demo: true,
    };
  }

  function db() {
    try {
      const r = JSON.parse(localStorage.getItem(KEY));
      if (r && r.v === 1) { if (!r.config.pagamentos) r.config.pagamentos = JSON.parse(JSON.stringify(CONFIG.pagamentos)); return r; }
    } catch (e) {}
    const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s;
  }
  function save(d) {
    localStorage.setItem(KEY, JSON.stringify(d));
    if (bc) bc.postMessage('chg');
    listeners.forEach(f => f(d));
  }
  function on(f) { listeners.push(f); }
  if (bc) bc.onmessage = () => { const d = db(); listeners.forEach(f => f(d)); };
  window.addEventListener('storage', e => { if (e.key === KEY) { const d = db(); listeners.forEach(f => f(d)); } });
  function reset() { localStorage.removeItem(KEY); const d = db(); save(d); return d; }

  function aberta(d = db(), quando = new Date()) {
    if (d.config.lojaAberta !== 'auto') return d.config.lojaAberta === 'aberta';
    if (LOJA.horarios.fechado.includes(quando.getDay())) return false;
    const hm = quando.toTimeString().slice(0, 5);
    return LOJA.horarios.turnos.some(([a, b]) => hm >= a && hm < b);
  }
  function preco(d, tamanho, sabor) { return (d.precos[tamanho] || {})[sabor] || 0; }
  function clientePorTel(d, t) { t = tel(t); return d.clientes.find(c => tel(c.tel) === t) || null; }

  /* pedido = { canal:'site'|'whatsapp'|'balcao'|'ifood', cliente:{nome,tel}, tipo:'entrega'|'retirada',
       endereco:{bairro,rua,numero,compl,ref}, itens:[{tipo:'yaki',tamanho,sabor,qtd,obs,preco,gratis?}|{tipo:'extra',id,nome,qtd,preco}],
       pagamento:'pix'|'cartao'|'dinheiro', troco, voucherId?, obs, agendadoPara? }  → devolve o pedido salvo */
  function criarPedido(p) {
    const d = db();
    const subtotal = p.itens.reduce((s, i) => s + (i.gratis ? 0 : i.preco * i.qtd), 0);
    const b = p.tipo === 'entrega' ? d.bairros.find(x => x.nome === (p.endereco || {}).bairro) : null;
    const taxa = p.tipo === 'entrega' ? (p.taxa != null ? p.taxa : b ? b.taxa : 0) : 0;
    let c = clientePorTel(d, p.cliente.tel);
    if (!c) {
      c = { id: uid('c'), nome: p.cliente.nome, tel: tel(p.cliente.tel), bairro: (p.endereco || {}).bairro || '', endereco: '', selos: 0, cartoesCompletos: 0, vouchers: [], pedidos: 0, gasto: 0, primeiro: new Date().toISOString(), ultimo: null, obs: '', tags: ['novo'] };
      d.clientes.push(c);
    }
    if (p.endereco && p.endereco.rua) { c.endereco = [p.endereco.rua, p.endereco.numero, p.endereco.compl].filter(Boolean).join(', '); c.bairro = p.endereco.bairro; }
    if (p.voucherId) { const v = c.vouchers.find(x => x.id === p.voucherId && !x.usado); if (v) v.usado = new Date().toISOString(); }
    const ped = Object.assign({}, p, {
      id: uid('p'), num: ++d.seq, clienteId: c.id, subtotal, taxa, total: subtotal + taxa, status: 'novo',
      criado: new Date().toISOString(), hist: [{ s: 'novo', t: new Date().toISOString() }], entregadorId: null, repasse: 0, seloDado: false, estoqueBaixado: false,
    });
    d.pedidos.unshift(ped); save(d); return ped;
  }

  // consumo de insumos de um pedido: { insumoId: quantidade }
  function consumo(d, ped) {
    const out = {}, add = (k, v) => { out[k] = (out[k] || 0) + v; };
    ped.itens.forEach(i => {
      if (i.tipo === 'yaki') {
        const g = (d.tamanhos.find(t => t.id === i.tamanho) || {}).gramas || 0, f = g / 100 * i.qtd;
        Object.entries(d.ficha.base).forEach(([k, v]) => add(k, v * f));
        Object.entries(d.ficha.proteina[i.sabor] || {}).forEach(([k, v]) => add(k, v * f));
        add(d.ficha.embalagem[i.tamanho], i.qtd); add('hashi', i.tamanho === 'familia' ? 7 * i.qtd : i.tamanho === 'meia' ? 4 * i.qtd : i.qtd);
      } else if (/^rol-/.test(i.id || '')) add('rolinho', i.qtd);
    });
    return out;
  }

  /* muda status; efeitos: 'preparo' baixa estoque (1x); 'concluido' dá selo de fidelidade (1x) e atualiza CRM;
     'cancelado' devolve estoque e voucher. Devolve { pedido, cliente, ganhouVoucher } */
  function mudarStatus(id, status, extra) {
    const d = db(), ped = d.pedidos.find(p => p.id === id); if (!ped) return null;
    const c = d.clientes.find(x => x.id === ped.clienteId); let ganhouVoucher = false;
    Object.assign(ped, extra || {}); ped.status = status; ped.hist.push({ s: status, t: new Date().toISOString() });
    if (status === 'preparo' && !ped.estoqueBaixado) {
      Object.entries(consumo(d, ped)).forEach(([k, q]) => { const e = d.estoque.find(x => x.id === k); if (e) e.qtd = Math.max(0, e.qtd - q); });
      d.movEstoque.unshift({ t: new Date().toISOString(), tipo: 'saida', ref: 'Pedido #' + ped.num, itens: consumo(d, ped) }); ped.estoqueBaixado = true;
    }
    if (status === 'cancelado') {
      if (ped.estoqueBaixado) { Object.entries(consumo(d, ped)).forEach(([k, q]) => { const e = d.estoque.find(x => x.id === k); if (e) e.qtd += q; }); ped.estoqueBaixado = false; }
      if (ped.voucherId && c) { const v = c.vouchers.find(x => x.id === ped.voucherId); if (v) v.usado = null; }
    }
    if (status === 'concluido' && c && !ped.seloDado) {
      c.pedidos++; c.gasto += ped.total; c.ultimo = new Date().toISOString(); c.tags = (c.tags || []).filter(t => t !== 'novo');
      const f = d.config.fidelidade;
      if (f.canais.includes(ped.canal) && ped.subtotal >= f.pedidoMinimo) { ganhouVoucher = darSelo(d, c, 'Pedido #' + ped.num); ped.seloDado = true; }
    }
    save(d); return { pedido: ped, cliente: c, ganhouVoucher };
  }
  // dá 1 selo; ao completar a meta zera o cartão e gera voucher. Use direto no painel p/ carimbo manual (pedido de WhatsApp antigo).
  function darSelo(d, c, motivo) {
    const f = d.config.fidelidade; c.selos++; c.histSelos = c.histSelos || []; c.histSelos.unshift({ t: new Date().toISOString(), motivo });
    if (c.selos >= f.meta) { c.selos = 0; c.cartoesCompletos++; c.vouchers.push({ id: uid('v'), premio: f.premio, criado: new Date().toISOString(), usado: null }); return true; }
    return false;
  }
  function vouchersAtivos(d, c) {
    const lim = d.config.fidelidade.validadeDias * 864e5;
    return (c ? c.vouchers : []).filter(v => !v.usado && Date.now() - new Date(v.criado) < lim);
  }
  /* CEP -> endereço + zona de entrega. Devolve Promise de
     { ok, cep, rua, bairro, cidade, uf, naZona, taxa, min, fonte:'viacep'|'reserva' } ou { ok:false, erro } */
  async function cepInfo(cep) {
    cep = String(cep || '').replace(/\D/g, ''); if (cep.length !== 8) return { ok: false, erro: 'CEP incompleto' };
    let r = null;
    try {
      const x = await (await fetch('https://viacep.com.br/ws/' + cep + '/json/')).json();
      if (!x.erro) r = { rua: x.logradouro || '', bairro: x.bairro || '', cidade: x.localidade, uf: x.uf, fonte: 'viacep' };
      else return { ok: false, erro: 'CEP não encontrado' };
    } catch (e) { const b = CEP_RESERVA[cep.slice(0, 5)]; if (b) r = { rua: '', bairro: b, cidade: 'Salvador', uf: 'BA', fonte: 'reserva' }; }
    if (!r) return { ok: false, erro: 'Não foi possível consultar o CEP agora' };
    const b = r.uf === 'BA' && norm(r.cidade) === 'salvador' ? db().bairros.find(z => norm(z.nome) === norm(r.bairro)) : null;
    return Object.assign({ ok: true, cep, naZona: !!b, taxa: b ? b.taxa : null, min: b ? b.min : null }, r, b ? { bairro: b.nome } : {});
  }
  function waLink(texto, numero) { return 'https://wa.me/' + (numero || LOJA.whatsapp) + '?text=' + encodeURIComponent(texto); }

  window.YK = { KEY, LOJA, STATUS, PAGAMENTOS, cepInfo, norm, db, save, on, reset, aberta, preco, clientePorTel, criarPedido, mudarStatus, darSelo, vouchersAtivos, consumo, waLink, tel, uid, brl };
})();
