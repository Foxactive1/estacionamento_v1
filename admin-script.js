// admin-script.js - ELVIS VEÍCULOS (painel administrativo)

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const STORAGE_KEY  = 'elvis_vehicles';
const LEADS_KEY    = 'elvis_leads';
const CONFIG_KEY   = 'elvis_config';

// Opcionais disponíveis
const optionalsList = [
    'Ar Cond. Digital', 'Bancos em Couro', 'GPS de Fábrica', 'Som Premium',
    'Teto Solar', 'Faróis de Neblina', 'Alarme', 'Rodas Aro 17',
    'Câmera de Ré', 'Sensor de Ré', 'Partida Elétrica', 'Vidros Elétricos',
    'Banco Elétrico', 'Multimídia', 'Chuva/Luz Auto', 'Freios ABS',
    'Controle de Tração', 'Piloto Automático', 'Tração 4x4', 'Ar Cond. Bi-zona',
    'Volante Multifuncional', 'Kit Xenon', 'Suspension Sport', 'Carregador por Indução'
];

// Canais de lead
const canalLabel = {
    whatsapp:  '💬 WhatsApp',
    telefone:  '📞 Telefone',
    email:     '✉️ E-mail',
    site:      '🌐 Formulário',
    presencial:'🏢 Presencial'
};

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let vehicles = [];
let leads    = [];
let config   = {};
let nextId   = 1;
let nextLeadId = 1;
let uploadedPhotos = [];

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

const toast = $('toast');
const toastIcon = toast.querySelector('.toast-icon');
const toastText = toast.querySelector('.toast-text');
const toastSub  = toast.querySelector('.toast-sub');
let toastTimer;

function showToast(icon, text, sub = '') {
    toastIcon.textContent = icon;
    toastText.textContent = text;
    toastSub.textContent  = sub;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function statusClass(s) {
    return s === 'ativo' ? 's-active' : s === 'vendido' ? 's-sold' : 's-pause';
}
function statusLabel(s) {
    return s === 'ativo' ? '✅ Ativo' : s === 'vendido' ? '❌ Vendido' : '⏸ Pausado';
}
function leadStatusClass(s) {
    return { novo: 'lead-novo', atendido: 'lead-atendido', fechado: 'lead-fechado', perdido: 'lead-perdido' }[s] || 'lead-novo';
}
function leadStatusLabel(s) {
    return { novo: '🔵 Novo', atendido: '🟡 Atendido', fechado: '🟢 Fechado', perdido: '🔴 Perdido' }[s] || '🔵 Novo';
}
function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'agora mesmo';
    if (diff < 3600000) return `há ${Math.floor(diff/60000)} min`;
    if (diff < 86400000) return `há ${Math.floor(diff/3600000)}h`;
    return `há ${Math.floor(diff/86400000)} dias`;
}

// ─── PERSISTÊNCIA ─────────────────────────────────────────────────────────────
function saveVehicles() { localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles)); }
function saveLeads()    { localStorage.setItem(LEADS_KEY, JSON.stringify(leads)); }
function saveConfig()   { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }

function loadVehicles() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        vehicles = JSON.parse(stored);
        nextId = vehicles.length ? Math.max(...vehicles.map(v => v.id)) + 1 : 1;
    } else {
        vehicles = [
            { id:1, marca:'Hyundai',    modelo:'Azera',  versao:'3.0 V6 GLS', anoFab:'2011', anoMod:'2012', preco:'74.990', km:'98.000', cor:'Prata',  cambio:'Automático', combustivel:'Gasolina', finalPlaca:'3', portas:'4 Portas', motor:'3.0 V6 270cv', fipe:'79.100', status:'ativo',  destaque:true,  optionals:['Ar Cond. Digital','Bancos em Couro','GPS de Fábrica','Teto Solar','Som Premium'], photos:[] },
            { id:2, marca:'Hyundai',    modelo:'Tucson', versao:'2.0 GLS',    anoFab:'2014', anoMod:'2015', preco:'64.990', km:'72.000', cor:'Branco', cambio:'Automático', combustivel:'Flex',     finalPlaca:'5', portas:'4 Portas', motor:'2.0 16v',     fipe:'68.000', status:'ativo',  destaque:false, optionals:['Ar Cond. Digital','Câmera de Ré'], photos:[] },
            { id:3, marca:'Toyota',     modelo:'Corolla',versao:'2.0 XEI',    anoFab:'2018', anoMod:'2019', preco:'89.900', km:'55.000', cor:'Preto',  cambio:'Automático', combustivel:'Flex',     finalPlaca:'7', portas:'4 Portas', motor:'2.0 Flex',    fipe:'92.000', status:'ativo',  destaque:false, optionals:['GPS de Fábrica','Alarme','Ar Cond. Digital'], photos:[] },
            { id:4, marca:'Volkswagen', modelo:'Jetta',  versao:'2.0 TSI',    anoFab:'2017', anoMod:'2017', preco:'78.500', km:'68.000', cor:'Cinza',  cambio:'Automático', combustivel:'Gasolina', finalPlaca:'2', portas:'4 Portas', motor:'2.0 Turbo',   fipe:'81.000', status:'pause', destaque:false, optionals:['Bancos em Couro','Som Premium'], photos:[] }
        ];
        nextId = 5;
        saveVehicles();
    }
}

function loadLeads() {
    const stored = localStorage.getItem(LEADS_KEY);
    if (stored) {
        leads = JSON.parse(stored);
        nextLeadId = leads.length ? Math.max(...leads.map(l => l.id)) + 1 : 1;
    } else {
        leads = [
            { id:1, nome:'João Souza',   tel:'(11) 99999-1111', email:'joao@email.com', veiculo:'Hyundai Azera',   canal:'whatsapp',  status:'novo',     ts: Date.now()-600000,   obs:'Perguntou sobre financiamento' },
            { id:2, nome:'Maria Lima',   tel:'(11) 98888-2222', email:'maria@email.com', veiculo:'Toyota Corolla', canal:'site',      status:'atendido', ts: Date.now()-3600000,  obs:'Agendou visita para amanhã' },
            { id:3, nome:'Carlos Mendes',tel:'(11) 97777-3333', email:'',               veiculo:'VW Jetta',       canal:'telefone',  status:'fechado',  ts: Date.now()-86400000, obs:'Compra confirmada, aguardando documentação' },
            { id:4, nome:'Ana Paula',    tel:'(11) 96666-4444', email:'ana@email.com',  veiculo:'Hyundai Tucson', canal:'presencial', status:'perdido',  ts: Date.now()-172800000,obs:'Preferiu outro modelo' }
        ];
        nextLeadId = 5;
        saveLeads();
    }
}

function loadConfig() {
    const stored = localStorage.getItem(CONFIG_KEY);
    config = stored ? JSON.parse(stored) : {
        nome: 'Elvis Veículos', slogan: 'Showroom Premium',
        endereco: 'Rua Principal, 123 — Sua Cidade/SP',
        email: 'contato@elvisveiculos.com.br',
        horario: 'Seg–Sex: 9h às 18h | Sab: 9h às 13h',
        wpp: '5511999999999', wppMsg: 'Olá! Vim pelo site da Elvis Veículos e gostaria de mais informações.',
        wppBadge: '3',
        seoTitle: 'ELVIS VEÍCULOS – Showroom Premium',
        seoDesc: 'Veículos selecionados com procedência garantida. Financiamento fácil e suporte pós-venda.',
        seoKw: 'carros, veículos, hyundai, toyota, volkswagen, seminovos, loja de carros',
        heroTitle: 'O Carro dos Seus Sonhos Está Aqui',
        heroSub: 'Veículos selecionados com procedência garantida, revisados e prontos para financiamento.',
        footer: '© 2026 Elvis Veículos — Todos os direitos reservados'
    };
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function doLogin() {
    const user = $('login-user').value.trim();
    const pass = $('login-pass').value;
    const err  = $('login-error');
    if (user === 'admin' && pass === 'elvis2026') {
        $('login-screen').style.display = 'none';
        $('admin-screen').style.display = 'block';
        initAdmin();
    } else {
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
    }
}
function doLogout() {
    $('admin-screen').style.display = 'none';
    $('login-screen').style.display = 'flex';
    $('login-user').value = '';
    $('login-pass').value = '';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initAdmin() {
    const now = new Date();
    $('topbar-date').textContent = now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    buildOptionalsCheck();
    renderDashboard();
    renderEstoque();
    setupDestaqueToggle();
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────────────────────
const pageTitles = {
    dashboard: ['Dashboard',          'Visão geral do estoque e leads'],
    cadastro:  ['Cadastrar Veículo',  'Preencha os dados do novo veículo'],
    estoque:   ['Estoque',            'Gerencie todos os veículos cadastrados'],
    galeria:   ['Galeria de Fotos',   'Fotos organizadas por veículo'],
    leads:     ['Contatos / Leads',   'Gerencie clientes e oportunidades'],
    config:    ['Configurações',      'Dados da loja, WhatsApp, SEO e aparência']
};

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = $('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');
    if (pageTitles[page]) {
        $('page-title').textContent = pageTitles[page][0];
        $('page-sub').textContent   = pageTitles[page][1];
    }
    // Render sob demanda
    if (page === 'estoque')   renderEstoque();
    if (page === 'dashboard') renderDashboard();
    if (page === 'galeria')   renderGaleria();
    if (page === 'leads')     renderLeads();
    if (page === 'config')    fillConfig();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
    const total = vehicles.length;
    const ativos = vehicles.filter(v => v.status === 'ativo').length;
    const valorTotal = vehicles.reduce((acc, v) => {
        return acc + (parseFloat((v.preco||'0').replace(/\./g,'').replace(',','.')) || 0);
    }, 0);
    const media = total ? valorTotal / total : 0;
    const novosLeads = leads.filter(l => l.status === 'novo').length;

    $('stat-total').textContent    = total;
    $('stat-ativos').textContent   = ativos;
    $('stat-contatos').textContent = leads.length;
    $('stat-leads-change').textContent = `🔵 ${novosLeads} novos sem atendimento`;
    $('stat-valor').textContent    = `R$ ${Math.round(valorTotal/1000)}k`;
    $('stat-media').textContent    = `Média R$ ${Math.round(media/1000)}k`;

    // Lista de veículos recentes
    $('dashboard-list').innerHTML = vehicles.slice().reverse().slice(0, 5).map(v => `
        <div class="stock-row">
            <div class="s-car-icon">${v.photos && v.photos.length ? `<img src="${v.photos[0]}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">` : '🚗'}</div>
            <div class="s-car-info">
                <div class="s-car-name">${v.marca} ${v.modelo} ${v.destaque ? '⭐' : ''}</div>
                <div class="s-car-sub">${v.versao||''} · ${v.anoFab}/${v.anoMod} · ${v.km} km</div>
            </div>
            <div class="s-car-price">R$ ${v.preco}</div>
            <div class="status-badge ${statusClass(v.status)}">${statusLabel(v.status)}</div>
        </div>
    `).join('') || '<div style="padding:20px;text-align:center;color:var(--gray)">Nenhum veículo cadastrado.</div>';

    // Leads recentes
    $('dashboard-leads').innerHTML = leads.slice().reverse().slice(0, 5).map(l => `
        <div class="stock-row">
            <div class="s-car-icon" style="font-size:16px">${canalLabel[l.canal] || '💬'}</div>
            <div class="s-car-info">
                <div class="s-car-name">${l.nome}</div>
                <div class="s-car-sub">${l.veiculo || '—'} · ${timeAgo(l.ts)}</div>
            </div>
            <div class="status-badge ${leadStatusClass(l.status)}">${leadStatusLabel(l.status)}</div>
        </div>
    `).join('') || '<div style="padding:20px;text-align:center;color:var(--gray)">Nenhum lead ainda.</div>';
}

// ─── OPCIONAIS ────────────────────────────────────────────────────────────────
function buildOptionalsCheck() {
    const container = $('optionals-container');
    container.innerHTML = optionalsList.map(o => `
        <div class="opt-check" data-opt="${o}">
            <div class="check-box"></div>
            <span>${o}</span>
        </div>
    `).join('');
    container.addEventListener('click', (e) => {
        const item = e.target.closest('.opt-check');
        if (!item) return;
        item.classList.toggle('checked');
        item.querySelector('.check-box').textContent = item.classList.contains('checked') ? '✓' : '';
    });
}
function getCheckedOptionals() {
    return Array.from(document.querySelectorAll('.opt-check.checked')).map(el => el.querySelector('span').textContent);
}

// ─── DESTAQUE TOGGLE ──────────────────────────────────────────────────────────
function setupDestaqueToggle() {
    const checkbox = $('f-destaque');
    const label    = $('destaque-label');
    checkbox.addEventListener('change', () => {
        label.textContent = checkbox.checked ? '⭐ Este veículo será o DESTAQUE' : 'Não destacado';
    });
}

// ─── ESTOQUE ─────────────────────────────────────────────────────────────────
function renderEstoque(search = '', statusFilter = '') {
    search = search.toLowerCase();
    const filtered = vehicles.filter(v => {
        const matchText   = (v.marca+' '+v.modelo+' '+(v.versao||'')).toLowerCase().includes(search);
        const matchStatus = !statusFilter || v.status === statusFilter;
        return matchText && matchStatus;
    });

    if (!filtered.length) {
        $('estoque-list').innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray)">Nenhum veículo encontrado.</div>';
        return;
    }

    $('estoque-list').innerHTML = filtered.map(v => `
        <div class="stock-row" data-id="${v.id}">
            <div class="s-car-icon">
                ${v.photos && v.photos.length
                    ? `<img src="${v.photos[0]}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`
                    : '🚗'}
            </div>
            <div class="s-car-info" style="flex:2">
                <div class="s-car-name">
                    ${v.destaque ? '<span style="color:var(--gold);font-size:12px">⭐ DESTAQUE</span> ' : ''}
                    ${v.marca} ${v.modelo} ${v.versao ? '— ' + v.versao : ''}
                </div>
                <div class="s-car-sub">${v.anoFab}/${v.anoMod} · ${v.km} km · ${v.cambio} · ${v.cor}</div>
            </div>
            <div style="font-size:11px;color:var(--gray);flex:1;min-width:80px">
                ${(v.optionals||[]).slice(0,2).join(', ')||'—'}
            </div>
            <div class="s-car-price">R$ ${v.preco}</div>
            <div class="status-badge ${statusClass(v.status)}">${statusLabel(v.status)}</div>
            <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">
                <button class="action-btn action-destaque" data-destaque="${v.id}" title="${v.destaque ? 'Remover destaque' : 'Definir como destaque'}">
                    ${v.destaque ? '⭐ Destaque' : '☆ Destacar'}
                </button>
                <button class="action-btn action-toggle" data-toggle="${v.id}">${v.status === 'ativo' ? 'Pausar' : v.status === 'vendido' ? 'Reativar' : 'Ativar'}</button>
                <button class="action-btn action-edit"   data-edit="${v.id}">✏️</button>
                <button class="action-btn action-del"    data-del="${v.id}">🗑</button>
            </div>
        </div>
    `).join('');
}

// ─── GALERIA ─────────────────────────────────────────────────────────────────
function renderGaleria() {
    const withPhotos = vehicles.filter(v => v.photos && v.photos.length > 0);

    if (!withPhotos.length) {
        $('galeria-content').innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--gray)">
                <div style="font-size:3rem;margin-bottom:12px">📸</div>
                <div style="font-size:1rem;font-weight:600">Nenhuma foto cadastrada ainda</div>
                <div style="font-size:.85rem;margin-top:6px">Vá em <strong style="color:var(--gold)">Cadastrar Veículo</strong> e adicione fotos ao estoque.</div>
            </div>`;
        return;
    }

    $('galeria-content').innerHTML = withPhotos.map(v => `
        <div class="galeria-veiculo">
            <div class="galeria-header">
                <div class="galeria-title">${v.marca} ${v.modelo} <span style="color:var(--gray);font-weight:400;font-size:.85em">${v.versao||''}</span></div>
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:12px;color:var(--gray)">${v.photos.length} foto(s)</span>
                    <button class="action-btn action-edit" data-edit="${v.id}" style="font-size:11px">✏️ Editar</button>
                </div>
            </div>
            <div class="galeria-grid">
                ${v.photos.map((p, i) => `
                    <div class="galeria-thumb">
                        <img src="${p}" alt="Foto ${i+1}">
                        ${i === 0 ? '<div class="photo-main-badge">CAPA</div>' : ''}
                    </div>`).join('')}
            </div>
        </div>
    `).join('');

    // Delegação de evento para editar a partir da galeria
    $('galeria-content').addEventListener('click', e => {
        const btn = e.target.closest('[data-edit]');
        if (btn) editVehicle(parseInt(btn.dataset.edit));
    });
}

// ─── LEADS ────────────────────────────────────────────────────────────────────
function renderLeads(statusFilter = '') {
    const filtered = statusFilter
        ? leads.filter(l => l.status === statusFilter)
        : leads;

    // Stats
    $('lead-stat-total').textContent     = leads.length;
    $('lead-stat-novos').textContent     = leads.filter(l => l.status === 'novo').length;
    $('lead-stat-atendidos').textContent = leads.filter(l => l.status === 'atendido').length;
    $('lead-stat-fechados').textContent  = leads.filter(l => l.status === 'fechado').length;

    if (!filtered.length) {
        $('leads-list').innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray)">Nenhum lead encontrado.</div>';
        return;
    }

    $('leads-list').innerHTML = filtered.slice().sort((a,b) => b.ts - a.ts).map(l => `
        <div class="lead-row" data-lead-id="${l.id}">
            <div class="lead-canal">${canalLabel[l.canal] || '💬'}</div>
            <div class="lead-info">
                <div class="lead-nome">${l.nome}</div>
                <div class="lead-sub">
                    ${l.tel ? `📞 ${l.tel}` : ''}
                    ${l.email ? ` · ✉️ ${l.email}` : ''}
                    ${l.veiculo ? ` · 🚗 ${l.veiculo}` : ''}
                </div>
                ${l.obs ? `<div class="lead-obs">${l.obs}</div>` : ''}
            </div>
            <div style="font-size:11px;color:var(--gray);white-space:nowrap">${timeAgo(l.ts)}</div>
            <div class="status-badge ${leadStatusClass(l.status)}">${leadStatusLabel(l.status)}</div>
            <div style="display:flex;gap:6px;flex-shrink:0">
                <select class="lead-status-sel action-btn" data-lead-status="${l.id}" style="padding:5px 8px;font-size:10px;cursor:pointer">
                    <option value="novo"     ${l.status==='novo'     ?'selected':''}>🔵 Novo</option>
                    <option value="atendido" ${l.status==='atendido' ?'selected':''}>🟡 Atendido</option>
                    <option value="fechado"  ${l.status==='fechado'  ?'selected':''}>🟢 Fechado</option>
                    <option value="perdido"  ${l.status==='perdido'  ?'selected':''}>🔴 Perdido</option>
                </select>
                ${l.tel ? `<a href="https://wa.me/55${l.tel.replace(/\D/g,'')}" target="_blank" class="action-btn action-toggle" style="text-decoration:none;font-size:11px" title="Abrir WhatsApp">💬</a>` : ''}
                <button class="action-btn action-del" data-del-lead="${l.id}">🗑</button>
            </div>
        </div>
    `).join('');
}

// ─── MODAL DE LEAD ────────────────────────────────────────────────────────────
function openLeadModal(lead = null) {
    $('lead-modal').style.display = 'flex';
    $('lead-modal-title').textContent = lead ? 'Editar Lead' : 'Novo Lead';
    $('lead-nome').value    = lead ? lead.nome    : '';
    $('lead-tel').value     = lead ? lead.tel     : '';
    $('lead-email').value   = lead ? lead.email   : '';
    $('lead-veiculo').value = lead ? lead.veiculo : '';
    $('lead-canal').value   = lead ? lead.canal   : 'whatsapp';
    $('lead-obs').value     = lead ? lead.obs     : '';
    $('lead-save').dataset.editingLeadId = lead ? lead.id : '';
}
function closeLeadModal() { $('lead-modal').style.display = 'none'; }

function saveLead() {
    const nome = $('lead-nome').value.trim();
    if (!nome) { showToast('⚠️', 'Nome obrigatório'); return; }

    const editingId = $('lead-save').dataset.editingLeadId;
    const data = {
        id:      editingId ? parseInt(editingId) : nextLeadId++,
        nome,
        tel:     $('lead-tel').value.trim(),
        email:   $('lead-email').value.trim(),
        veiculo: $('lead-veiculo').value.trim(),
        canal:   $('lead-canal').value,
        obs:     $('lead-obs').value.trim(),
        status:  'novo',
        ts:      editingId ? leads.find(l => l.id == editingId)?.ts || Date.now() : Date.now()
    };

    if (editingId) {
        const idx = leads.findIndex(l => l.id == editingId);
        if (idx !== -1) { data.status = leads[idx].status; leads[idx] = data; }
        showToast('✅', 'Lead atualizado!', nome);
    } else {
        leads.unshift(data);
        showToast('✅', 'Lead adicionado!', nome);
    }

    saveLeads();
    closeLeadModal();
    renderLeads($('filter-lead-status').value);
    renderDashboard();
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function fillConfig() {
    $('cfg-nome').value      = config.nome     || '';
    $('cfg-slogan').value    = config.slogan   || '';
    $('cfg-endereco').value  = config.endereco || '';
    $('cfg-email').value     = config.email    || '';
    $('cfg-horario').value   = config.horario  || '';
    $('cfg-wpp').value       = config.wpp      || '';
    $('cfg-wpp-msg').value   = config.wppMsg   || '';
    $('cfg-wpp-badge').value = config.wppBadge || '3';
    $('cfg-seo-title').value = config.seoTitle || '';
    $('cfg-seo-desc').value  = config.seoDesc  || '';
    $('cfg-seo-kw').value    = config.seoKw    || '';
    $('cfg-hero-title').value= config.heroTitle|| '';
    $('cfg-hero-sub').value  = config.heroSub  || '';
    $('cfg-footer').value    = config.footer   || '';
    updateWppPreview();
}

function updateWppPreview() {
    const num = ($('cfg-wpp').value || '').replace(/\D/g,'');
    const msg = $('cfg-wpp-msg').value || '';
    if (num) {
        $('cfg-wpp-link').textContent = `https://wa.me/${num}?text=${encodeURIComponent(msg).slice(0,60)}...`;
    } else {
        $('cfg-wpp-link').textContent = '—';
    }
}

function doSaveConfig() {
    config = {
        nome:     $('cfg-nome').value,
        slogan:   $('cfg-slogan').value,
        endereco: $('cfg-endereco').value,
        email:    $('cfg-email').value,
        horario:  $('cfg-horario').value,
        wpp:      $('cfg-wpp').value.replace(/\D/g,''),
        wppMsg:   $('cfg-wpp-msg').value,
        wppBadge: $('cfg-wpp-badge').value,
        seoTitle: $('cfg-seo-title').value,
        seoDesc:  $('cfg-seo-desc').value,
        seoKw:    $('cfg-seo-kw').value,
        heroTitle:$('cfg-hero-title').value,
        heroSub:  $('cfg-hero-sub').value,
        footer:   $('cfg-footer').value
    };
    saveConfig();
    showToast('✅', 'Configurações salvas!', 'Recarregue o site para aplicar as mudanças.');
}

// ─── FOTOS ────────────────────────────────────────────────────────────────────
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (uploadedPhotos.length >= 12) return;
        const reader = new FileReader();
        reader.onload = (e) => { uploadedPhotos.push(e.target.result); renderPhotos(); };
        reader.readAsDataURL(file);
    });
}

function renderPhotos() {
    const preview = $('photos-preview');
    const count   = $('photo-count');
    preview.innerHTML = uploadedPhotos.map((src, i) => `
        <div class="photo-thumb">
            <img src="${src}" alt="Foto ${i+1}">
            ${i === 0 ? '<div class="photo-main-badge">CAPA</div>' : ''}
            <button class="remove-photo" data-rm="${i}">✕</button>
        </div>
    `).join('');
    count.innerHTML = uploadedPhotos.length
        ? `<span>${uploadedPhotos.length}</span> de 12 fotos adicionadas`
        : '';
}

// ─── SALVAR VEÍCULO ──────────────────────────────────────────────────────────
function saveVehicle() {
    const marca  = $('f-marca').value;
    const modelo = $('f-modelo').value.trim();
    const preco  = $('f-preco').value.trim();
    if (!marca || !modelo || !preco) {
        showToast('⚠️', 'Campos obrigatórios', 'Preencha Marca, Modelo e Preço');
        return;
    }

    const isDestaque = $('f-destaque').checked;
    // Se definido como destaque, remove destaque dos outros
    if (isDestaque) vehicles.forEach(v => { v.destaque = false; });

    const editingId   = $('btn-salvar').dataset.editingId;
    const vehicleData = {
        id:          editingId ? parseInt(editingId) : nextId++,
        marca, modelo,
        versao:      $('f-versao').value    || '',
        anoFab:      $('f-ano-fab').value   || '—',
        anoMod:      $('f-ano-mod').value   || '—',
        motor:       $('f-motor').value     || '',
        preco,
        km:          $('f-km').value        || '—',
        fipe:        $('f-fipe').value      || '',
        cor:         $('f-cor').value       || '—',
        cambio:      $('f-cambio').value,
        combustivel: $('f-comb').value,
        portas:      $('f-portas').value,
        finalPlaca:  $('f-placa').value,
        status:      $('f-status').value,
        destaque:    isDestaque,
        desc:        $('f-desc').value      || '',
        optionals:   getCheckedOptionals(),
        photos:      uploadedPhotos.slice()
    };

    if (editingId) {
        const idx = vehicles.findIndex(v => v.id == editingId);
        if (idx !== -1) vehicles[idx] = vehicleData;
        showToast('✅', 'Veículo atualizado!', `${marca} ${modelo} modificado.`);
        delete $('btn-salvar').dataset.editingId;
    } else {
        vehicles.unshift(vehicleData);
        showToast('✅', 'Veículo salvo!', `${marca} ${modelo} adicionado ao estoque.`);
    }

    saveVehicles();
    resetForm();
    renderDashboard();
    renderEstoque();
    showPage('estoque');
}

// ─── EDITAR VEÍCULO ──────────────────────────────────────────────────────────
function editVehicle(id) {
    const v = vehicles.find(v => v.id === id);
    if (!v) return;

    $('f-marca').value    = v.marca;
    $('f-modelo').value   = v.modelo;
    $('f-versao').value   = v.versao      || '';
    $('f-motor').value    = v.motor       || '';
    $('f-ano-fab').value  = v.anoFab;
    $('f-ano-mod').value  = v.anoMod;
    $('f-preco').value    = v.preco;
    $('f-km').value       = v.km;
    $('f-fipe').value     = v.fipe        || '';
    $('f-cor').value      = v.cor;
    $('f-cambio').value   = v.cambio;
    $('f-comb').value     = v.combustivel;
    $('f-portas').value   = v.portas      || '4 Portas';
    $('f-placa').value    = v.finalPlaca  || '1';
    $('f-status').value   = v.status;
    $('f-desc').value     = v.desc        || '';

    const destaque = $('f-destaque');
    destaque.checked = !!v.destaque;
    $('destaque-label').textContent = v.destaque ? '⭐ Este veículo é o DESTAQUE' : 'Não destacado';

    document.querySelectorAll('.opt-check').forEach(el => {
        const optText = el.querySelector('span').textContent;
        const isChecked = v.optionals && v.optionals.includes(optText);
        el.classList.toggle('checked', isChecked);
        el.querySelector('.check-box').textContent = isChecked ? '✓' : '';
    });

    uploadedPhotos = v.photos || [];
    renderPhotos();

    $('btn-salvar').dataset.editingId = id;
    showPage('cadastro');
}

// ─── RESET FORMULÁRIO ─────────────────────────────────────────────────────────
function resetForm() {
    ['f-marca','f-modelo','f-versao','f-motor','f-ano-fab','f-ano-mod',
     'f-preco','f-km','f-fipe','f-cor','f-desc'].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
    });
    $('f-cambio').value   = 'Automático';
    $('f-comb').value     = 'Flex';
    $('f-portas').value   = '4 Portas';
    $('f-placa').value    = '1';
    $('f-status').value   = 'ativo';
    $('f-destaque').checked = false;
    $('destaque-label').textContent = 'Não destacado';

    document.querySelectorAll('.opt-check').forEach(el => {
        el.classList.remove('checked');
        el.querySelector('.check-box').textContent = '';
    });

    uploadedPhotos = [];
    renderPhotos();
    $('file-input').value = '';
    delete $('btn-salvar').dataset.editingId;
}

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
    loadLeads();
    loadConfig();

    // Login
    $('btn-login').addEventListener('click', doLogin);
    $('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('btn-logout').addEventListener('click', doLogout);

    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page   = item.dataset.page;
            const action = item.dataset.action;
            if (page)             showPage(page);
            else if (action === 'site') window.open('index.html', '_blank');
        });
    });

    // Novo veículo
    $('btn-new-veiculo').addEventListener('click', () => { resetForm(); showPage('cadastro'); });

    // Upload de fotos
    $('btn-upload').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', e => handleFiles(e.target.files));
    const zone = $('upload-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
    $('photos-preview').addEventListener('click', e => {
        const btn = e.target.closest('.remove-photo');
        if (!btn) return;
        uploadedPhotos.splice(parseInt(btn.dataset.rm, 10), 1);
        renderPhotos();
    });

    // Máscaras de preço
    $('f-preco').addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g,'');
        if (v) v = parseInt(v,10).toLocaleString('pt-BR');
        e.target.value = v;
    });
    $('f-fipe').addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g,'');
        if (v) v = parseInt(v,10).toLocaleString('pt-BR');
        e.target.value = v;
    });

    // Salvar / limpar
    $('btn-salvar').addEventListener('click', saveVehicle);
    $('btn-limpar').addEventListener('click', resetForm);

    // Estoque — busca + filtro status
    $('search-estoque').addEventListener('input', e =>
        renderEstoque(e.target.value, $('filter-status-estoque').value));
    $('filter-status-estoque').addEventListener('change', e =>
        renderEstoque($('search-estoque').value, e.target.value));

    // Estoque — ações delegadas
    $('estoque-list').addEventListener('click', e => {
        // Destaque
        const destaqueBtn = e.target.closest('[data-destaque]');
        if (destaqueBtn) {
            const id = parseInt(destaqueBtn.dataset.destaque);
            const v  = vehicles.find(x => x.id === id);
            if (v) {
                const setDestaque = !v.destaque;
                vehicles.forEach(x => { x.destaque = false; });
                v.destaque = setDestaque;
                saveVehicles();
                renderEstoque($('search-estoque').value, $('filter-status-estoque').value);
                renderDashboard();
                showToast(
                    setDestaque ? '⭐' : '☆',
                    setDestaque ? `${v.marca} ${v.modelo} agora é o destaque!` : 'Destaque removido.',
                    setDestaque ? 'Aparecerá em destaque no site.' : ''
                );
            }
            return;
        }

        // Toggle status
        const toggleBtn = e.target.closest('[data-toggle]');
        if (toggleBtn) {
            const id = parseInt(toggleBtn.dataset.toggle);
            const v  = vehicles.find(x => x.id === id);
            if (v) {
                v.status = v.status === 'ativo' ? 'pause' : 'ativo';
                saveVehicles();
                renderEstoque($('search-estoque').value, $('filter-status-estoque').value);
                renderDashboard();
                showToast('✅', 'Status atualizado!', `${v.marca} ${v.modelo} está ${v.status === 'ativo' ? 'ativo' : 'pausado'}.`);
            }
            return;
        }

        // Editar
        const editBtn = e.target.closest('[data-edit]');
        if (editBtn) { editVehicle(parseInt(editBtn.dataset.edit)); return; }

        // Deletar
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) {
            const id = parseInt(delBtn.dataset.del);
            const v  = vehicles.find(x => x.id === id);
            if (v && confirm(`Remover ${v.marca} ${v.modelo} do estoque?`)) {
                vehicles = vehicles.filter(x => x.id !== id);
                saveVehicles();
                renderEstoque($('search-estoque').value, $('filter-status-estoque').value);
                renderDashboard();
                showToast('🗑️', 'Veículo removido.', 'Removido do estoque.');
            }
        }
    });

    // Leads — adicionar + modal
    $('btn-add-lead').addEventListener('click', () => openLeadModal());
    $('lead-cancel').addEventListener('click', closeLeadModal);
    $('lead-modal').addEventListener('click', e => { if (e.target === $('lead-modal')) closeLeadModal(); });
    $('lead-save').addEventListener('click', saveLead);

    // Leads — filtro status
    $('filter-lead-status').addEventListener('change', e => renderLeads(e.target.value));

    // Leads — ações delegadas
    $('leads-list').addEventListener('change', e => {
        const sel = e.target.closest('[data-lead-status]');
        if (sel) {
            const id = parseInt(sel.dataset.leadStatus);
            const l  = leads.find(x => x.id === id);
            if (l) {
                l.status = sel.value;
                saveLeads();
                renderLeads($('filter-lead-status').value);
                renderDashboard();
                showToast('✅', `Lead de ${l.nome} → ${leadStatusLabel(l.status)}`);
            }
        }
    });
    $('leads-list').addEventListener('click', e => {
        const delBtn = e.target.closest('[data-del-lead]');
        if (delBtn) {
            const id = parseInt(delBtn.dataset.delLead);
            const l  = leads.find(x => x.id === id);
            if (l && confirm(`Remover lead de ${l.nome}?`)) {
                leads = leads.filter(x => x.id !== id);
                saveLeads();
                renderLeads($('filter-lead-status').value);
                renderDashboard();
                showToast('🗑️', 'Lead removido.');
            }
        }
    });

    // Configurações
    $('btn-save-config').addEventListener('click', doSaveConfig);
    $('cfg-wpp').addEventListener('input', updateWppPreview);
    $('cfg-wpp-msg').addEventListener('input', updateWppPreview);
});
