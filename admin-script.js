// admin-script.js - ELVIS VEÍCULOS (painel administrativo) - Versão completa

// ==================== CONFIGURAÇÃO ====================
const CONFIG = {
    SUPABASE_URL: 'https://mlqgxjujaxfixaxertpn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scWd4anVqYXhmaXhheGVydHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDg3MzgsImV4cCI6MjA4NzQyNDczOH0.ri69N3__upUzWRHdsGHZ6CuGLy6l8PZnVCypw-WArK8',
    STORAGE_BUCKET: 'vehicles',
    MAX_PHOTOS: 12,
    MAX_PHOTO_SIZE_MB: 10,
    OPTIONALS_LIST: [
        'Ar Cond. Digital', 'Bancos em Couro', 'GPS de Fábrica', 'Som Premium',
        'Teto Solar', 'Faróis de Neblina', 'Alarme', 'Rodas Aro 17',
        'Câmera de Ré', 'Sensor de Ré', 'Partida Elétrica', 'Vidros Elétricos',
        'Banco Elétrico', 'Multimídia', 'Chuva/Luz Auto', 'Freios ABS'
    ]
};

// ==================== SUPABASE CLIENT ====================
const supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
);

// ==================== UTILITÁRIOS ====================
const Utils = {
    $: (id) => document.getElementById(id),

    showToast(icon, text, sub = '') {
        const toast = Utils.$('toast');
        toast.querySelector('.toast-icon').textContent = icon;
        toast.querySelector('.toast-text').textContent = text;
        toast.querySelector('.toast-sub').textContent = sub;
        toast.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    },

    formatPrice(value) {
        if (!value && value !== 0) return '';
        const num = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) / 100 : value;
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseFloat(priceStr.replace(/\./g, '').replace(',', '.')) || 0;
    },

    escapeHTML(str) {
        return String(str).replace(/[&<>"]/g, function(match) {
            if (match === '&') return '&amp;';
            if (match === '<') return '&lt;';
            if (match === '>') return '&gt;';
            if (match === '"') return '&quot;';
            return match;
        });
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    async uploadPhoto(file, path) {
        const { data, error } = await supabaseClient.storage
            .from(CONFIG.STORAGE_BUCKET)
            .upload(path, file, { cacheControl: '3600', upsert: true });
        if (error) throw error;
        const { data: urlData } = supabaseClient.storage
            .from(CONFIG.STORAGE_BUCKET)
            .getPublicUrl(path);
        return urlData.publicUrl;
    },

    async deletePhoto(path) {
        const { error } = await supabaseClient.storage
            .from(CONFIG.STORAGE_BUCKET)
            .remove([path]);
        if (error) console.error('Erro ao deletar foto:', error);
    }
};

// ==================== AUTENTICAÇÃO ====================
const Auth = {
    async login(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // ✅ Verificar se o usuário tem role 'admin'
        const { data: customer, error: roleError } = await supabaseClient
            .from('customers')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (roleError || !customer || customer.role !== 'admin') {
            await supabaseClient.auth.signOut(); // encerra a sessão imediatamente
            throw new Error('Acesso negado. Apenas administradores podem entrar.');
        }

        return data;
    },

    async logout() {
        await supabaseClient.auth.signOut();
    },

    async getSession() {
        const { data } = await supabaseClient.auth.getSession();
        return data.session;
    }
};

// ==================== MÓDULO DE ARMAZENAMENTO ====================
const Storage = {
    vehicles: [],

    async loadVehicles() {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        this.vehicles = data || [];
        return this.vehicles;
    },

    async addVehicle(vehicle) {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .insert([vehicle])
            .select();
        if (error) throw error;
        if (data && data[0]) {
            this.vehicles.unshift(data[0]);
            return data[0];
        }
        return null;
    },

    async updateVehicle(id, updates) {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        if (data && data[0]) {
            const index = this.vehicles.findIndex(v => v.id === id);
            if (index !== -1) this.vehicles[index] = data[0];
            return data[0];
        }
        return null;
    },

    async deleteVehicle(id) {
        const { error } = await supabaseClient
            .from('vehicles')
            .delete()
            .eq('id', id);
        if (error) throw error;
        this.vehicles = this.vehicles.filter(v => v.id !== id);
        return true;
    },

    async toggleStatus(id) {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (!vehicle) return null;
        const newStatus = vehicle.status === 'ativo' ? 'pause' : 'ativo';
        return await this.updateVehicle(id, { status: newStatus });
    },

    async setDestaque(id) {
        await supabaseClient.from('vehicles').update({ destaque: false }).neq('id', id);
        return await this.updateVehicle(id, { destaque: true });
    }
};

// ==================== MÓDULO FIPE ====================
const FipeAPI = {
    baseURL: 'https://parallelum.com.br/fipe/api/v1/carros',
    cache: {},

    async get(path) {
        if (this.cache[path]) return this.cache[path];
        const response = await fetch(this.baseURL + path);
        if (!response.ok) throw new Error(`Erro FIPE: ${response.status}`);
        const data = await response.json();
        this.cache[path] = data;
        return data;
    },

    async loadMarcas(selectElement, loadingId) {
        UI.fipeLoading(loadingId, true);
        try {
            const marcas = await this.get('/marcas');
            selectElement.innerHTML = '<option value="">Selecione a marca</option>' +
                marcas.map(m => `<option value="${m.codigo}">${m.nome}</option>`).join('');
        } catch (error) {
            Utils.showToast('⚠️', 'Erro ao carregar marcas', 'Usando lista manual');
            selectElement.innerHTML = '<option value="">Selecione</option>' +
                ['Acura','Agrale','Alfa Romeo','AM Gen','Asia Motors','Audi','BMW','Chery','Chevrolet','Chrysler','Citroën','Dodge','Fiat','Ford','Honda','Hyundai','Jeep','Kia','Land Rover','Mitsubishi','Nissan','Peugeot','Renault','Subaru','Suzuki','Toyota','Volkswagen','Volvo']
                .map(n => `<option value="">${n}</option>`).join('');
        } finally {
            UI.fipeLoading(loadingId, false);
        }
    },

    async loadModelos(codigoMarca, selectModelo, loadingId) {
        if (!codigoMarca) return;
        UI.fipeLoading(loadingId, true);
        try {
            const data = await this.get(`/marcas/${codigoMarca}/modelos`);
            selectModelo.innerHTML = '<option value="">Selecione o modelo</option>' +
                data.modelos.map(m => `<option value="${m.codigo}">${m.nome}</option>`).join('');
            selectModelo.disabled = false;
        } catch (error) {
            Utils.showToast('⚠️', 'Erro ao carregar modelos');
            selectModelo.innerHTML = '<option value="">Erro ao carregar</option>';
        } finally {
            UI.fipeLoading(loadingId, false);
        }
    },

    async loadAnos(codigoMarca, codigoModelo, selectAno, loadingId) {
        if (!codigoMarca || !codigoModelo) return;
        UI.fipeLoading(loadingId, true);
        try {
            const anos = await this.get(`/marcas/${codigoMarca}/modelos/${codigoModelo}/anos`);
            selectAno.innerHTML = '<option value="">Selecione o ano</option>' +
                anos.map(a => `<option value="${a.codigo}">${a.nome}</option>`).join('');
            selectAno.disabled = false;
            return anos;
        } catch (error) {
            Utils.showToast('⚠️', 'Erro ao carregar anos');
            selectAno.innerHTML = '<option value="">Erro</option>';
        } finally {
            UI.fipeLoading(loadingId, false);
        }
    },

    async getPreco(codigoMarca, codigoModelo, codigoAno) {
        if (!codigoMarca || !codigoModelo || !codigoAno) return null;
        try {
            return await this.get(`/marcas/${codigoMarca}/modelos/${codigoModelo}/anos/${codigoAno}`);
        } catch {
            return null;
        }
    }
};

// ==================== MÓDULO DE INTERFACE ====================
const UI = {
    currentPage: 'dashboard',
    editingId: null,
    uploadedPhotos: [],      // arquivos novos (com preview)
    existingPhotos: [],      // URLs das fotos já existentes
    photosToRemove: [],      // URLs a serem removidas do storage
    leads: [],                // cache de leads
    leadsChart: null,         // instância do gráfico

    async init() {
        this.updateTopbarDate();
        this.buildOptionalsCheck();
        await this.loadAndRenderDashboard();
        await this.loadAndRenderEstoque();
        this.setupLeadsListeners();
    },

    async loadAndRenderDashboard() {
        await Storage.loadVehicles();
        // Carregar estatísticas de leads
        const { count: totalLeads, error: totalError } = await supabaseClient
            .from('leads')
            .select('*', { count: 'exact', head: true });
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: newLeads, error: newError } = await supabaseClient
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

        this.totalLeads = totalLeads || 0;
        this.newLeads = newLeads || 0;

        this.renderDashboard();
        this.renderLeadsChart();
    },

    renderDashboard() {
        const vehicles = Storage.vehicles;
        const total = vehicles.length;
        const ativos = vehicles.filter(v => v.status === 'ativo').length;
        const valorTotal = vehicles.reduce((acc, v) => acc + (v.preco || 0), 0);
        const media = total ? valorTotal / total : 0;

        Utils.$('stat-total').textContent = total;
        Utils.$('stat-ativos').textContent = ativos;
        Utils.$('stat-leads-semana').textContent = this.newLeads;
        Utils.$('stat-leads-total').textContent = this.totalLeads;
        Utils.$('stat-valor').textContent = `R$ ${Math.round(valorTotal / 1000)}k`;
        Utils.$('stat-media').textContent = `Média R$ ${Math.round(media / 1000)}k`;

        const dashboardList = Utils.$('dashboard-list');
        dashboardList.innerHTML = vehicles.slice().reverse().slice(0, 4).map(v => `
            <div class="stock-row">
                <div class="s-car-icon">🚗</div>
                <div class="s-car-info">
                    <div class="s-car-name">${Utils.escapeHTML(v.marca)} ${Utils.escapeHTML(v.modelo)}</div>
                    <div class="s-car-sub">${v.versao || ''} · ${v.ano_fabricacao || '—'}/${v.ano_modelo || '—'} · ${v.km ? v.km.toLocaleString('pt-BR') : '—'} km</div>
                </div>
                <div class="s-car-price">R$ ${Utils.formatPrice(v.preco)}</div>
                <div class="status-badge ${this.statusClass(v.status)}">${this.statusLabel(v.status)}</div>
            </div>
        `).join('');
    },

    async renderLeadsChart() {
        // Buscar contagem de leads por dia nos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data, error } = await supabaseClient
            .from('leads')
            .select('created_at')
            .gte('created_at', sevenDaysAgo.toISOString());

        if (error) {
            console.error('Erro ao buscar dados para o gráfico:', error);
            return;
        }

        // Agrupar por dia
        const days = [];
        const counts = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date();
            day.setDate(day.getDate() - i);
            day.setHours(0, 0, 0, 0);
            const dayStr = day.toISOString().split('T')[0];
            days.unshift(day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }));
            const count = data.filter(lead => {
                const leadDay = new Date(lead.created_at).toISOString().split('T')[0];
                return leadDay === dayStr;
            }).length;
            counts.unshift(count);
        }

        const ctx = document.getElementById('leadsChart')?.getContext('2d');
        if (!ctx) return;

        if (this.leadsChart) this.leadsChart.destroy();

        this.leadsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Leads',
                    data: counts,
                    borderColor: '#C9A84C',
                    backgroundColor: 'rgba(201,168,76,0.08)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#B0B0B8', font: { size: 11 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#B0B0B8', font: { size: 11 } }, beginAtZero: true }
                }
            }
        });
    },

    statusClass(s) {
        return s === 'ativo' ? 's-active' : s === 'vendido' ? 's-sold' : 's-pause';
    },
    statusLabel(s) {
        return s === 'ativo' ? '✅ Ativo' : s === 'vendido' ? '❌ Vendido' : '⏸ Pausado';
    },

    async loadAndRenderEstoque(filter = '') {
        await Storage.loadVehicles();
        this.renderEstoque(filter);
    },

    renderEstoque(filter = '') {
        const vehicles = Storage.vehicles;
        const filtered = vehicles.filter(v =>
            (v.marca + ' ' + v.modelo + ' ' + (v.versao || '')).toLowerCase().includes(filter.toLowerCase())
        );

        if (!filtered.length) {
            Utils.$('estoque-list').innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray)">Nenhum veículo encontrado</div>';
            return;
        }

        Utils.$('estoque-list').innerHTML = filtered.map(v => `
            <div class="stock-row" data-id="${v.id}">
                <div class="s-car-icon">🚗</div>
                <div class="s-car-info" style="flex:2">
                    <div class="s-car-name">${Utils.escapeHTML(v.marca)} ${Utils.escapeHTML(v.modelo)} ${v.versao ? '— ' + Utils.escapeHTML(v.versao) : ''}</div>
                    <div class="s-car-sub">${v.ano_fabricacao || '—'}/${v.ano_modelo || '—'} · ${v.km ? v.km.toLocaleString('pt-BR') : '—'} km · ${v.cambio || '—'} · ${v.cor || '—'}</div>
                </div>
                <div style="font-size:11px;color:var(--gray);flex:1;min-width:100px">
                    ${(v.optionals || []).slice(0, 2).join(', ') || '—'}
                </div>
                <div class="s-car-price">R$ ${Utils.formatPrice(v.preco)}</div>
                <div class="status-badge ${this.statusClass(v.status)}">${this.statusLabel(v.status)}</div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                    <button class="action-btn action-toggle" data-toggle="${v.id}">${v.status === 'ativo' ? 'Pausar' : 'Ativar'}</button>
                    <button class="action-btn action-edit" data-edit="${v.id}" title="Editar">✏️</button>
                    <button class="action-btn action-del" data-del="${v.id}" title="Excluir">🗑</button>
                </div>
            </div>
        `).join('');
    },

    // ==================== LEADS ====================
    async loadLeads(filter = '', status = '', origem = '') {
        let query = supabaseClient
            .from('leads')
            .select('*, vehicles(marca, modelo)')
            .order('created_at', { ascending: false });
        if (status) query = query.eq('status', status);
        if (origem) query = query.eq('origem', origem);
        const { data, error } = await query;
        if (error) { console.error('Erro ao carregar leads:', error); return []; }
        this.leads = data || [];
        this.renderLeadsKPI();
        this.renderLeads(filter);
    },

    renderLeadsKPI() {
        const leads = this.leads;
        const total = leads.length;
        const novos = leads.filter(l => l.status === 'novo').length;
        const contato = leads.filter(l => l.status === 'em_contato').length;
        const negociacao = leads.filter(l => l.status === 'negociacao').length;
        const fechados = leads.filter(l => l.status === 'fechado').length;
        const valorTotal = leads.reduce((acc, l) => acc + (parseFloat(l.valor_proposta) || 0), 0);

        const kpis = {
            'lkpi-total': total,
            'lkpi-novo': novos,
            'lkpi-contato': contato,
            'lkpi-negociacao': negociacao,
            'lkpi-fechado': fechados
        };
        Object.entries(kpis).forEach(([id, val]) => {
            const el = Utils.$(id);
            if (el) el.querySelector('.lkpi-val').textContent = val;
        });
        const valorEl = Utils.$('lkpi-valor');
        if (valorEl) valorEl.querySelector('.lkpi-val').textContent = valorTotal > 0
            ? `R$ ${Math.round(valorTotal / 1000)}k`
            : 'R$ 0';
    },

    renderLeads(filter = '') {
        const filtered = this.leads.filter(lead =>
            (lead.nome || '').toLowerCase().includes(filter.toLowerCase()) ||
            (lead.telefone || '').includes(filter) ||
            (lead.cidade || '').toLowerCase().includes(filter.toLowerCase()) ||
            (lead.vehicles && (lead.vehicles.marca + ' ' + lead.vehicles.modelo).toLowerCase().includes(filter.toLowerCase()))
        );
        const container = Utils.$('leads-list');
        if (!filtered.length) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--gray)">Nenhum lead encontrado.</p>';
            return;
        }
        // Header
        const header = `<div class="leads-list-header">
            <span>Lead</span><span>Veículo / Origem</span><span>Valor Proposta</span><span>Status</span><span>Ações</span>
        </div>`;
        const rows = filtered.map(lead => {
            const statusKey = (lead.status || 'novo').replace(/_/g, '-');
            const valorStr = lead.valor_proposta
                ? `R$ ${Utils.formatPrice(lead.valor_proposta)}`
                : '<span style="color:var(--gray);font-size:11px">—</span>';
            const origemBadge = lead.origem
                ? `<div class="lead-origem-badge">${lead.origem}</div>` : '';
            return `
            <div class="lead-row" data-id="${lead.id}">
                <div class="lead-info">
                    <div class="lead-name">${Utils.escapeHTML(lead.nome || '—')}</div>
                    <div class="lead-contact">${lead.telefone || ''} ${lead.email ? '· ' + lead.email : ''}</div>
                    ${lead.cidade ? `<div class="lead-contact">📍 ${lead.cidade}</div>` : ''}
                </div>
                <div class="lead-vehicle">
                    ${lead.vehicles ? Utils.escapeHTML(lead.vehicles.marca + ' ' + lead.vehicles.modelo) : 'Interesse geral'}
                    ${origemBadge}
                </div>
                <div class="lead-valor ${lead.valor_proposta ? '' : 'empty'}">${valorStr}</div>
                <div class="lead-status-badge status-${statusKey}">${this.statusLeadLabel(lead.status)}</div>
                <div class="lead-actions">
                    <button class="view-lead" data-id="${lead.id}" title="Ver / Editar detalhes">👁️</button>
                </div>
            </div>`;
        }).join('');
        container.innerHTML = header + rows;
    },

    statusLeadLabel(status) {
        const map = {
            'novo': '🆕 Novo',
            'em_contato': '📞 Em Contato',
            'proposta_enviada': '💰 Proposta',
            'negociacao': '🤝 Negociação',
            'fechado': '✅ Fechado',
            'perdido': '❌ Perdido'
        };
        return map[status] || (status || '—');
    },

    openLeadModal(lead) {
        const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
        Utils.$('lm-name').textContent = lead.nome || '—';
        Utils.$('lm-vehicle').textContent = lead.vehicles
            ? `Interessado em: ${lead.vehicles.marca} ${lead.vehicles.modelo}` : 'Interesse geral';
        const telEl = Utils.$('lm-tel');
        telEl.textContent = lead.telefone || '—';
        telEl.href = `https://wa.me/55${(lead.telefone || '').replace(/\D/g,'')}`;
        Utils.$('lm-email').textContent = lead.email || '—';
        Utils.$('lm-cidade').textContent = lead.cidade || '—';
        const origEl = Utils.$('lm-origem');
        origEl.textContent = lead.origem || '—';
        origEl.className = 'lm-badge';
        Utils.$('lm-status-sel').value = lead.status || 'novo';
        Utils.$('lm-valor').value = lead.valor_proposta ? Utils.formatPrice(lead.valor_proposta) : '';
        Utils.$('lm-responsavel').textContent = lead.responsavel || '—';
        Utils.$('lm-created').textContent = fmt(lead.created_at);
        Utils.$('lm-updated').textContent = fmt(lead.updated_at);
        Utils.$('lm-msg').textContent = lead.mensagem || 'Sem mensagem.';
        Utils.$('lm-whatsapp').href = `https://wa.me/55${(lead.telefone || '').replace(/\D/g,'')}`;
        Utils.$('lm-save').dataset.leadId = lead.id;
        Utils.$('lead-modal-overlay').classList.add('open');
    },

    closeLeadModal() {
        Utils.$('lead-modal-overlay').classList.remove('open');
    },

    setupLeadsListeners() {
        const searchInput = Utils.$('search-leads');
        const statusFilter = Utils.$('filter-lead-status');
        const origemFilter = Utils.$('filter-lead-origem');

        const refresh = () => {
            const f = searchInput?.value || '';
            const s = statusFilter?.value || '';
            const o = origemFilter?.value || '';
            this.loadLeads(f, s, o);
        };

        searchInput?.addEventListener('input', Utils.debounce(refresh, 300));
        statusFilter?.addEventListener('change', refresh);
        origemFilter?.addEventListener('change', refresh);

        // Click em lead row
        Utils.$('leads-list')?.addEventListener('click', async (e) => {
            const viewBtn = e.target.closest('.view-lead');
            if (viewBtn) {
                const id = viewBtn.dataset.id;
                const lead = this.leads.find(l => l.id === id);
                if (lead) this.openLeadModal(lead);
            }
        });

        // Modal close
        Utils.$('lead-modal-close')?.addEventListener('click', () => this.closeLeadModal());
        Utils.$('lead-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === Utils.$('lead-modal-overlay')) this.closeLeadModal();
        });

        // Salvar modal
        Utils.$('lm-save')?.addEventListener('click', async () => {
            const id = Utils.$('lm-save').dataset.leadId;
            const newStatus = Utils.$('lm-status-sel').value;
            const valorStr = Utils.$('lm-valor').value;
            const valorNum = valorStr ? Utils.parsePrice(valorStr) : null;
            try {
                await supabaseClient.from('leads').update({
                    status: newStatus,
                    valor_proposta: valorNum,
                    updated_at: new Date().toISOString()
                }).eq('id', id);
                // update local cache
                const lead = this.leads.find(l => l.id === id);
                if (lead) { lead.status = newStatus; lead.valor_proposta = valorNum; }
                this.renderLeadsKPI();
                this.renderLeads(searchInput?.value || '');
                this.closeLeadModal();
                Utils.showToast('✅', 'Lead atualizado!', `Status: ${newStatus}`);
            } catch(err) {
                Utils.showToast('❌', 'Erro ao salvar', err.message);
            }
        });

        // Formatar valor proposta no modal
        Utils.$('lm-valor')?.addEventListener('input', e => {
            e.target.value = Utils.formatPrice(e.target.value);
        });
    },

    // ==================== FORMULÁRIO E FOTOS ====================
    updateTopbarDate() {
        const now = new Date();
        Utils.$('topbar-date').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },

    showPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const pageEl = Utils.$('page-' + page);
        if (pageEl) pageEl.classList.add('active');
        const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navEl) navEl.classList.add('active');
        this.currentPage = page;

        const titles = {
            dashboard: ['Dashboard', 'Visão geral do estoque e leads'],
            cadastro:  ['Cadastrar Veículo', 'Preencha os dados do novo veículo'],
            estoque:   ['Estoque', 'Gerencie todos os veículos cadastrados'],
            leads:     ['Leads', 'Gerencie os contatos recebidos']
        };
        if (titles[page]) {
            Utils.$('page-title').textContent = titles[page][0];
            Utils.$('page-sub').textContent = titles[page][1];
        }
        if (page === 'estoque') this.renderEstoque();
        if (page === 'leads') this.loadLeads();
        if (page === 'dashboard') this.loadAndRenderDashboard();
    },

    buildOptionalsCheck() {
        const container = Utils.$('optionals-container');
        container.innerHTML = CONFIG.OPTIONALS_LIST.map(o => `
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
    },

    getCheckedOptionals() {
        return Array.from(document.querySelectorAll('.opt-check.checked'))
            .map(el => el.querySelector('span').textContent);
    },

    async handleFiles(files) {
        for (const file of Array.from(files)) {
            if (this.uploadedPhotos.length + this.existingPhotos.length >= CONFIG.MAX_PHOTOS) {
                Utils.showToast('⚠️', `Limite de ${CONFIG.MAX_PHOTOS} fotos atingido`);
                break;
            }
            if (file.size > CONFIG.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
                Utils.showToast('⚠️', 'Arquivo muito grande', `Máximo ${CONFIG.MAX_PHOTO_SIZE_MB}MB`);
                continue;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadedPhotos.push({
                    file: file,
                    preview: e.target.result,
                    name: `${Date.now()}_${file.name}`
                });
                this.renderPhotos();
            };
            reader.readAsDataURL(file);
        }
    },

    renderPhotos() {
        const preview = Utils.$('photos-preview');
        const allPhotos = [
            ...this.existingPhotos.map((url, i) => ({ url, isExisting: true, originalIndex: i })),
            ...this.uploadedPhotos.map((p, i) => ({ preview: p.preview, isExisting: false, originalIndex: i }))
        ];
        preview.innerHTML = allPhotos.map((photo, idx) => `
            <div class="photo-thumb" data-index="${idx}" data-original-index="${photo.originalIndex}" data-is-existing="${photo.isExisting}">
                <img src="${photo.url || photo.preview}" alt="Foto" loading="lazy">
                ${idx === 0 ? '<div class="photo-main-badge">PRINCIPAL</div>' : ''}
                <button class="remove-photo" title="Remover foto">✕</button>
            </div>
        `).join('');

        const cnt = allPhotos.length;
        Utils.$('photo-count').innerHTML = cnt > 0
            ? `<span>${cnt}</span> foto${cnt > 1 ? 's' : ''} selecionada${cnt > 1 ? 's' : ''} — máximo ${CONFIG.MAX_PHOTOS}`
            : '';

        // Inicializar Sortable para reordenação
        if (!this.sortable) {
            this.sortable = new Sortable(preview, {
                animation: 150,
                handle: '.photo-thumb',
                onEnd: () => this.reorderPhotos()
            });
        }
    },

    reorderPhotos() {
        const preview = Utils.$('photos-preview');
        const thumbElements = Array.from(preview.children);

        const newAllPhotos = thumbElements.map(thumb => {
            const index = parseInt(thumb.dataset.index);
            const isExisting = thumb.dataset.isExisting === 'true';
            const originalIndex = parseInt(thumb.dataset.originalIndex);
            if (isExisting) {
                return { type: 'existing', data: this.existingPhotos[originalIndex], originalIndex };
            } else {
                return { type: 'uploaded', data: this.uploadedPhotos[originalIndex], originalIndex };
            }
        });

        this.existingPhotos = newAllPhotos.filter(p => p.type === 'existing').map(p => p.data);
        this.uploadedPhotos = newAllPhotos.filter(p => p.type === 'uploaded').map(p => p.data);

        // Atualizar badges "PRINCIPAL"
        thumbElements.forEach((thumb, idx) => {
            thumb.dataset.index = idx;
            const mainBadge = thumb.querySelector('.photo-main-badge');
            if (idx === 0) {
                if (!mainBadge) thumb.insertAdjacentHTML('beforeend', '<div class="photo-main-badge">PRINCIPAL</div>');
            } else {
                if (mainBadge) mainBadge.remove();
            }
        });
    },

    removePhoto(index) {
        const thumbElements = Utils.$('photos-preview').children;
        const thumb = thumbElements[index];
        const isExisting = thumb.dataset.isExisting === 'true';
        const originalIndex = parseInt(thumb.dataset.originalIndex);

        if (isExisting) {
            this.photosToRemove.push(this.existingPhotos[originalIndex]);
            this.existingPhotos.splice(originalIndex, 1);
        } else {
            this.uploadedPhotos.splice(originalIndex, 1);
        }
        this.renderPhotos(); // re-renderiza e reordena
    },

    resetForm() {
        ['f-ano-fabricacao', 'f-ano-modelo', 'f-preco', 'f-km', 'f-fipe', 'f-cor', 'f-motor', 'f-desc'].forEach(id => {
            const el = Utils.$(id);
            if (el) el.value = '';
        });
        Utils.$('f-marca').selectedIndex = 0;
        Utils.$('f-modelo').innerHTML = '<option value="">Selecione a marca primeiro</option>';
        Utils.$('f-modelo').disabled = true;
        Utils.$('f-versao').innerHTML = '<option value="">Selecione o modelo primeiro</option>';
        Utils.$('f-versao').disabled = true;
        Utils.$('f-ano-fipe').innerHTML = '<option value="">Selecione o modelo primeiro</option>';
        Utils.$('f-ano-fipe').disabled = true;
        Utils.$('f-cambio').value = 'Automático';
        Utils.$('f-comb').value = 'Flex';
        Utils.$('f-portas').value = '4';
        Utils.$('f-final-placa').value = '1';
        Utils.$('f-status').value = 'ativo';
        Utils.$('f-destaque').value = 'false';
        document.querySelectorAll('.opt-check').forEach(el => {
            el.classList.remove('checked');
            el.querySelector('.check-box').textContent = '';
        });
        this.uploadedPhotos = [];
        this.existingPhotos = [];
        this.photosToRemove = [];
        this.renderPhotos();
        Utils.$('file-input').value = '';
        this.editingId = null;
        delete Utils.$('btn-salvar').dataset.editingId;
        UI.hideFipeResult();
    },

    fillForm(vehicle) {
        this.editingId = vehicle.id;
        Utils.$('f-marca').value = vehicle.marca;
        Utils.$('f-modelo').value = vehicle.modelo;
        Utils.$('f-versao').value = vehicle.versao || '';
        Utils.$('f-ano-fabricacao').value = vehicle.ano_fabricacao || '';
        Utils.$('f-ano-modelo').value = vehicle.ano_modelo || '';
        Utils.$('f-preco').value = Utils.formatPrice(vehicle.preco);
        Utils.$('f-km').value = vehicle.km || '';
        Utils.$('f-cor').value = vehicle.cor || '';
        Utils.$('f-cambio').value = vehicle.cambio || '';
        Utils.$('f-comb').value = vehicle.combustivel || '';
        Utils.$('f-final-placa').value = vehicle.final_placa || '1';
        Utils.$('f-portas').value = vehicle.portas || '4';
        Utils.$('f-motor').value = vehicle.motor || '';
        Utils.$('f-fipe').value = Utils.formatPrice(vehicle.fipe);
        Utils.$('f-status').value = vehicle.status;
        Utils.$('f-destaque').value = vehicle.destaque ? 'true' : 'false';
        Utils.$('f-desc').value = vehicle.descricao || '';

        document.querySelectorAll('.opt-check').forEach(el => {
            const optText = el.querySelector('span').textContent;
            if (vehicle.optionals && vehicle.optionals.includes(optText)) {
                el.classList.add('checked');
                el.querySelector('.check-box').textContent = '✓';
            } else {
                el.classList.remove('checked');
                el.querySelector('.check-box').textContent = '';
            }
        });

        this.existingPhotos = vehicle.photos || [];
        this.uploadedPhotos = [];
        this.photosToRemove = [];
        this.renderPhotos();
    },

    fipeLoading(elementId, show) {
        const el = Utils.$(elementId);
        if (el) el.style.display = show ? 'inline' : 'none';
    },

    showFipeResult(dados) {
        const box = Utils.$('fipe-result-box');
        const info = Utils.$('fipe-result-info');
        if (!box || !info) return;
        info.innerHTML = `
            <div class="fipe-row"><span>Referência</span><strong>${dados.MesReferencia || '—'}</strong></div>
            <div class="fipe-row"><span>Marca</span><strong>${dados.Marca || '—'}</strong></div>
            <div class="fipe-row"><span>Modelo</span><strong>${dados.Modelo || '—'}</strong></div>
            <div class="fipe-row"><span>Ano Modelo</span><strong>${dados.AnoModelo || '—'}</strong></div>
            <div class="fipe-row"><span>Combustível</span><strong>${dados.Combustivel || '—'}</strong></div>
            <div class="fipe-row fipe-row-price"><span>Valor FIPE</span><strong>${dados.Valor || '—'}</strong></div>
            <div class="fipe-row"><span>Código FIPE</span><strong>${dados.CodigoFipe || '—'}</strong></div>
        `;
        box.style.display = 'block';
    },

    hideFipeResult() {
        const box = Utils.$('fipe-result-box');
        if (box) box.style.display = 'none';
    },

    async saveVehicle() {
        const marca = Utils.$('f-marca').value;
        const modelo = Utils.$('f-modelo').value;
        const precoStr = Utils.$('f-preco').value;
        if (!marca || !modelo || !precoStr) {
            Utils.showToast('⚠️', 'Campos obrigatórios', 'Preencha Marca, Modelo e Preço');
            return;
        }

        // Validações adicionais
        const anoFab = Utils.$('f-ano-fabricacao').value;
        const anoMod = Utils.$('f-ano-modelo').value;
        if (anoFab && (anoFab < 1900 || anoFab > 2100)) {
            Utils.showToast('⚠️', 'Ano de fabricação inválido');
            return;
        }
        const km = Utils.$('f-km').value;
        if (km && (isNaN(km) || km < 0)) {
            Utils.showToast('⚠️', 'Quilometragem inválida');
            return;
        }

        // Upload das novas fotos
        const uploadedUrls = [];
        for (const photo of this.uploadedPhotos) {
            try {
                const path = `vehicles/${Date.now()}_${photo.file.name}`;
                const url = await Utils.uploadPhoto(photo.file, path);
                uploadedUrls.push(url);
            } catch (error) {
                Utils.showToast('❌', 'Erro no upload da foto', error.message);
                return;
            }
        }

        const finalPhotos = [...this.existingPhotos, ...uploadedUrls];

        // Remover fotos marcadas para exclusão
        if (this.photosToRemove.length) {
            for (const url of this.photosToRemove) {
                const path = url.split('/').slice(-2).join('/');
                await Utils.deletePhoto(path).catch(console.warn);
            }
        }

        const vehicleData = {
            marca,
            modelo,
            versao: Utils.$('f-versao').value || null,
            ano_fabricacao: anoFab ? parseInt(anoFab) : null,
            ano_modelo: anoMod ? parseInt(anoMod) : null,
            preco: Utils.parsePrice(precoStr),
            km: km ? parseInt(km) : null,
            cor: Utils.$('f-cor').value || null,
            cambio: Utils.$('f-cambio').value,
            combustivel: Utils.$('f-comb').value,
            final_placa: Utils.$('f-final-placa').value,
            portas: Utils.$('f-portas').value ? parseInt(Utils.$('f-portas').value) : null,
            motor: Utils.$('f-motor').value || null,
            fipe: Utils.parsePrice(Utils.$('f-fipe').value) || null,
            status: Utils.$('f-status').value,
            destaque: Utils.$('f-destaque').value === 'true',
            descricao: Utils.$('f-desc').value || null,
            optionals: this.getCheckedOptionals(),
            photos: finalPhotos
        };

        try {
            if (this.editingId) {
                if (vehicleData.destaque) {
                    await Storage.setDestaque(this.editingId);
                } else {
                    await Storage.updateVehicle(this.editingId, vehicleData);
                }
                Utils.showToast('✅', 'Veículo atualizado!');
            } else {
                if (vehicleData.destaque) {
                    await supabaseClient.from('vehicles').update({ destaque: false }).neq('id', 0);
                }
                await Storage.addVehicle(vehicleData);
                Utils.showToast('✅', 'Veículo salvo!');
            }
            this.resetForm();
            await this.loadAndRenderDashboard();
            await this.loadAndRenderEstoque();
            this.showPage('estoque');
        } catch (error) {
            Utils.showToast('❌', 'Erro ao salvar', error.message);
        }
    }
};

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sessão ativa
    const session = await Auth.getSession();
    if (session) {
        Utils.$('login-screen').style.display = 'none';
        Utils.$('admin-screen').style.display = 'block';
        UI.init();
    } else {
        Utils.$('login-screen').style.display = 'flex';
        Utils.$('admin-screen').style.display = 'none';
    }

    // Login
    Utils.$('btn-login').addEventListener('click', async () => {
        const email = Utils.$('login-user').value;
        const password = Utils.$('login-pass').value;
        if (!email || !password) {
            const err = Utils.$('login-error');
            err.textContent = '⚠️ Preencha e-mail e senha.';
            err.style.display = 'block';
            setTimeout(() => err.style.display = 'none', 3000);
            return;
        }

        const btn = Utils.$('btn-login');
        btn.disabled = true;
        btn.textContent = 'Entrando...';

        try {
            await Auth.login(email, password);
            Utils.$('login-screen').style.display = 'none';
            Utils.$('admin-screen').style.display = 'block';
            UI.init();
        } catch (error) {
            const err = Utils.$('login-error');
            // ✅ Mensagem de erro específica por tipo de falha
            if (error.message?.includes('Acesso negado')) {
                err.textContent = '🚫 Acesso negado. Usuário sem permissão de admin.';
            } else if (error.message?.includes('Invalid login')) {
                err.textContent = '❌ E-mail ou senha incorretos.';
            } else {
                err.textContent = `❌ ${error.message || 'Erro ao fazer login.'}`;
            }
            err.style.display = 'block';
            setTimeout(() => err.style.display = 'none', 4000);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar no Painel';
        }
    });

    Utils.$('btn-logout').addEventListener('click', async () => {
        await Auth.logout();
        Utils.$('admin-screen').style.display = 'none';
        Utils.$('login-screen').style.display = 'flex';
        Utils.$('login-user').value = '';
        Utils.$('login-pass').value = '';
    });

    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) UI.showPage(page);
            else if (item.dataset.action === 'soon') Utils.showToast('🚧', 'Em breve');
            else if (item.dataset.action === 'site') window.open('index.html', '_blank');
        });
    });

    // Botão novo veículo
    Utils.$('btn-new-veiculo').addEventListener('click', () => {
        UI.resetForm();
        UI.showPage('cadastro');
    });

    // Upload
    Utils.$('btn-upload').addEventListener('click', () => Utils.$('file-input').click());
    Utils.$('file-input').addEventListener('change', e => UI.handleFiles(e.target.files));
    const zone = Utils.$('upload-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        UI.handleFiles(e.dataTransfer.files);
    });

    Utils.$('photos-preview').addEventListener('click', e => {
        const btn = e.target.closest('.remove-photo');
        if (!btn) return;
        const thumb = btn.closest('.photo-thumb');
        if (thumb) {
            const index = parseInt(thumb.dataset.index);
            UI.removePhoto(index);
        }
    });

    // Máscaras
    Utils.$('f-preco').addEventListener('input', e => e.target.value = Utils.formatPrice(e.target.value));
    Utils.$('f-fipe').addEventListener('input', e => e.target.value = Utils.formatPrice(e.target.value));

    // Salvar
    Utils.$('btn-salvar').addEventListener('click', () => UI.saveVehicle());
    Utils.$('btn-limpar').addEventListener('click', () => UI.resetForm());

    // Busca no estoque com debounce
    const searchInput = Utils.$('search-estoque');
    searchInput.addEventListener('input', Utils.debounce(e => UI.renderEstoque(e.target.value), 300));

    // FIPE
    FipeAPI.loadMarcas(Utils.$('f-marca'), 'fipe-loading-marca');
    Utils.$('f-marca').addEventListener('change', async (e) => {
        const codigoMarca = e.target.value;
        await FipeAPI.loadModelos(codigoMarca, Utils.$('f-modelo'), 'fipe-loading-modelo');
    });
    Utils.$('f-modelo').addEventListener('change', async (e) => {
        const codigoModelo = e.target.value;
        const codigoMarca = Utils.$('f-marca').value;
        await FipeAPI.loadAnos(codigoMarca, codigoModelo, Utils.$('f-ano-fipe'), 'fipe-loading-ano');
    });
    Utils.$('f-ano-fipe').addEventListener('change', async (e) => {
        const codigoAno = e.target.value;
        const codigoMarca = Utils.$('f-marca').value;
        const codigoModelo = Utils.$('f-modelo').value;
        const dados = await FipeAPI.getPreco(codigoMarca, codigoModelo, codigoAno);
        if (dados) {
            const valorStr = dados.Valor.replace('R$ ', '').trim();
            Utils.$('f-fipe').value = valorStr;
            if (dados.AnoModelo) Utils.$('f-ano-modelo').value = dados.AnoModelo;
            const combMap = { 'Gasolina':'Gasolina', 'Álcool':'Flex', 'Diesel':'Diesel', 'Flex':'Flex', 'Elétrico':'Elétrico', 'Híbrido':'Híbrido' };
            Utils.$('f-comb').value = combMap[dados.Combustivel] || 'Flex';
            UI.showFipeResult(dados);
            Utils.showToast('✅', 'Dados FIPE preenchidos!');
        }
    });

    // Ações na lista de estoque
    Utils.$('estoque-list').addEventListener('click', async e => {
        const toggleBtn = e.target.closest('[data-toggle]');
        const editBtn = e.target.closest('[data-edit]');
        const delBtn = e.target.closest('[data-del]');

        if (toggleBtn) {
            const id = parseInt(toggleBtn.dataset.toggle);
            try {
                await Storage.toggleStatus(id);
                await UI.loadAndRenderEstoque(searchInput.value);
                await UI.loadAndRenderDashboard();
                Utils.showToast('✅', 'Status atualizado!');
            } catch (error) {
                Utils.showToast('❌', 'Erro ao atualizar status', error.message);
            }
        }

        if (editBtn) {
            const id = parseInt(editBtn.dataset.edit);
            const vehicle = Storage.vehicles.find(v => v.id === id);
            if (vehicle) {
                UI.fillForm(vehicle);
                UI.showPage('cadastro');
            }
        }

        if (delBtn) {
            const id = parseInt(delBtn.dataset.del);
            const vehicle = Storage.vehicles.find(v => v.id === id);
            if (vehicle && confirm(`Deseja realmente excluir ${vehicle.marca} ${vehicle.modelo} (${vehicle.ano_fabricacao || '—'})? Esta ação é irreversível.`)) {
                try {
                    await Storage.deleteVehicle(id);
                    if (vehicle.photos && vehicle.photos.length) {
                        for (const url of vehicle.photos) {
                            const path = url.split('/').slice(-2).join('/');
                            await Utils.deletePhoto(path).catch(console.warn);
                        }
                    }
                    await UI.loadAndRenderEstoque(searchInput.value);
                    await UI.loadAndRenderDashboard();
                    Utils.showToast('🗑️', 'Veículo removido');
                } catch (error) {
                    Utils.showToast('❌', 'Erro ao remover', error.message);
                }
            }
        }
    });
});