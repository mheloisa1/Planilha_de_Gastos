const BRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = new Date(), Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
const dim = new Date(Y, M + 1, 0).getDate(), daysLeft = dim - D + 1;
const ym = Y + '-' + String(M + 1).padStart(2, '0');
const iso = d => ym + '-' + String(d).padStart(2, '0');
let state = { limit: 1400, items: [], fpaid: {}, inst: [], fixed: [{ id: '15', d: 'Gasto fixo do dia 15', v: 130, day: 15 }, { id: 'end', d: 'Gasto fixo do fim do mês', v: 470, day: 'end' }] };
try {
    const s = localStorage.getItem('gastos-v2');
    if (s)
        state = Object.assign(state, JSON.parse(s));
}
catch (e) { }
state.fpaid = state.fpaid || {};
let editing = null;
function save() { try {
    localStorage.setItem('gastos-v2', JSON.stringify(state));
}
catch (e) { } }
const isPaid = i => i.paid !== false;
const dayOf = f => f.day === 'end' ? dim : Math.min(f.day, dim);
const fk = f => ym + '-' + f.id;
const pill = (paid, attr) => '<button class="pill ' + (paid ? 'paid' : 'pend') + '" ' + attr + ' aria-pressed="' + paid + '" title="Clique para alternar">' + (paid ? '✓ Pago' : 'Pendente') + '</button>';
const acts = (key, del, name) => '<span class="acts"><button class="x" data-edit="' + key + '" aria-label="Editar ' + esc(name) + '" title="Editar">✎</button><button class="x" ' + del + ' aria-label="Remover ' + esc(name) + '" title="Remover">×</button></span>';
const editRow = (key, d, v) => '<li><div class="edrow"><input data-f="d" value="' + esc(d) + '" aria-label="Nome" maxlength="40"><input data-f="v" type="number" step="0.01" min="0" value="' + v + '" aria-label="Valor"></div><button class="btn sm" data-save="' + key + '">Salvar</button><button class="x" data-cancel="1" aria-label="Cancelar" title="Cancelar">×</button></li>';
function render() {
    const mine = state.items.filter(i => i.dt.startsWith(ym));
    const fixedTotal = state.fixed.reduce((a, f) => a + f.v, 0);
    const spent = mine.reduce((a, i) => a + i.v, 0), free = state.limit - fixedTotal, left = free - spent;
    const lim = Math.max(free, 1), expected = Math.max(free, 0) * D / dim, p = spent / lim;
    const varPaid = mine.filter(isPaid).reduce((a, i) => a + i.v, 0);
    const fixPaid = state.fixed.filter(f => state.fpaid[fk(f)]).reduce((a, f) => a + f.v, 0);
    const paid = varPaid + fixPaid, pend = spent + fixedTotal - paid;
    const mn = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('#month').textContent = mn[0].toUpperCase() + mn.slice(1) + ': ainda posso gastar';
    $('#left').textContent = BRL(left);
    $('#left').classList.toggle('neg', left < 0);
    $('#lead').textContent = left > 0 ? 'Dá para gastar ' + BRL(left / daysLeft) + ' por dia nos ' + daysLeft + ' dias que faltam, já separando os ' + BRL(fixedTotal) + ' de gastos fixos.' : 'Você já usou tudo o que sobrava depois dos gastos fixos.';
    $('#fill').style.width = Math.min(p, 1) * 100 + '%';
    $('#meter').className = 'meter' + (p > 1 ? ' over' : spent > expected ? ' warn' : '');
    $('#tick').style.left = (D / dim * 100) + '%';
    $('#status').textContent = left < 0 ? 'Você ultrapassou o que sobrava em ' + BRL(-left) + '.' : spent > expected ? 'Acima do ritmo: até hoje o esperado era ' + BRL(expected) + ' e você gastou ' + BRL(spent) + '.' : 'Dentro do ritmo: até hoje o esperado era ' + BRL(expected) + ' e você gastou ' + BRL(spent) + '.';
    $('#paid').textContent = BRL(paid);
    $('#pend').textContent = BRL(pend);
    $('#lim').value = state.limit;
    $('#total').textContent = 'Total ' + BRL(spent);
    $('#ftotal').textContent = 'Total ' + BRL(fixedTotal);
    $('#fixed').innerHTML = state.fixed.length ? state.fixed.map(f => {
        const key = 'f:' + f.id;
        if (editing === key)
            return editRow(key, f.d, f.v);
        const ok = !!state.fpaid[fk(f)], dd = dayOf(f), past = dd <= D;
        return '<li><div>' + esc(f.d) + '<small' + (!ok && past ? ' class="late"' : '') + '>Dia ' + dd + (ok ? '' : past ? ', já venceu' : ', a vencer') + '</small></div><span class="v">' + BRL(f.v) + '</span>' + pill(ok, 'data-ftog="' + f.id + '"') + acts(key, 'data-fdel="' + f.id + '"', f.d) + '</li>';
    }).join('') : '<li><span class="empty">Nenhum gasto fixo cadastrado.</span></li>';
    const rows = [...mine].sort((a, b) => b.dt.localeCompare(a.dt) || b.id - a.id);
    $('#list').innerHTML = rows.length ? rows.map(i => {
        const key = 'i:' + i.id;
        if (editing === key)
            return editRow(key, i.d, i.v);
        return '<li><div>' + esc(i.d) + '<small>' + i.dt.slice(8, 10) + '/' + i.dt.slice(5, 7) + '</small></div><span class="v">' + BRL(i.v) + '</span>' + pill(isPaid(i), 'data-tog="' + i.id + '"') + acts(key, 'data-del="' + i.id + '"', i.d) + '</li>';
    }).join('') : '<li><span class="empty">Nenhum gasto do dia a dia ainda. Lance o primeiro acima.</span></li>';
    const act = state.inst.filter(x => x.p < x.t);
    $('#itot').textContent = act.length ? 'Por mês ' + BRL(act.reduce((a, x) => a + x.v, 0)) + '. Falta pagar ' + BRL(act.reduce((a, x) => a + x.v * (x.t - x.p), 0)) : 'Nenhuma parcela em andamento';
    $('#igrid').innerHTML = state.inst.length ? state.inst.map(x => {
        const key = 'p:' + x.id;
        if (editing === key)
            return '<article class="icard"><div class="edrow" style="flex-wrap:wrap"><input data-f="d" value="' + esc(x.d) + '" aria-label="Nome" maxlength="40" style="flex-basis:100%"><input data-f="v" type="number" step="0.01" min="0" value="' + x.v + '" aria-label="Valor da parcela"><input data-f="t" type="number" min="1" step="1" value="' + x.t + '" aria-label="Total de parcelas"><input data-f="p" type="number" min="0" step="1" value="' + x.p + '" aria-label="Parcelas pagas"></div><div class="iact"><button class="btn sm" data-save="' + key + '">Salvar</button><button class="btn sm ghost" data-cancel="1">Cancelar</button></div></article>';
        const rem = x.t - x.p, end = new Date(Y, M + rem - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return '<article class="icard"><h3>' + esc(x.d) + '</h3><p>' + BRL(x.v) + ' por mês</p><div class="ibar" role="img" aria-label="' + x.p + ' de ' + x.t + ' parcelas pagas"><b style="width:' + x.p / x.t * 100 + '%"></b></div><p><b>' + x.p + ' de ' + x.t + ' parcelas pagas</b></p>' + (rem > 0 ? '<p>Faltam ' + rem + (rem === 1 ? ' parcela (1 mês)' : ' parcelas (' + rem + ' meses)') + ', ou ' + BRL(rem * x.v) + '.</p><p>Previsão da última parcela: ' + end + '.</p>' : '<p><b>✓ Parcelamento quitado.</b></p>') + '<div class="iact"><button class="btn sm" data-iinc="' + x.id + '">Paguei 1 parcela</button><button class="btn sm ghost" data-idec="' + x.id + '" aria-label="Desfazer 1 parcela">−1</button>' + acts(key, 'data-idel="' + x.id + '"', x.d) + '</div></article>';
    }).join('') : '<p class="empty">Nenhum parcelamento cadastrado. Preencha o formulário acima.</p>';
}
function saveEdit(key, box) {
    const [k, id] = [key.slice(0, 1), key.slice(2)];
    const g = n => { const el = box.querySelector('[data-f="' + n + '"]'); return el ? el.value.trim() : ''; };
    const name = g('d'), v = parseFloat(g('v'));
    if (k === 'p') {
        const x = state.inst.find(a => String(a.id) === id);
        if (x) {
            const t = parseInt(g('t'), 10), p = parseInt(g('p'), 10);
            if (name)
                x.d = name;
            if (v > 0)
                x.v = v;
            if (t >= 1)
                x.t = t;
            if (p >= 0)
                x.p = p;
            x.p = Math.min(x.p, x.t);
        }
    }
    else {
        const x = (k === 'f' ? state.fixed : state.items).find(a => String(a.id) === id);
        if (x) {
            if (name)
                x.d = name;
            if (v >= 0)
                x.v = v;
        }
    }
    editing = null;
    save();
    render();
}
$('#app').addEventListener('click', e => {
    const c = e.target.closest('button');
    if (!c)
        return;
    const d = c.dataset;
    if (d.tog) {
        const i = state.items.find(x => String(x.id) === d.tog);
        if (i)
            i.paid = !isPaid(i);
    }
    else if (d.ftog) {
        const f = state.fixed.find(x => x.id === d.ftog);
        if (f)
            state.fpaid[fk(f)] = !state.fpaid[fk(f)];
    }
    else if (d.del) {
        state.items = state.items.filter(i => String(i.id) !== d.del);
    }
    else if (d.fdel) {
        state.fixed = state.fixed.filter(f => String(f.id) !== d.fdel);
    }
    else if (d.idel) {
        state.inst = state.inst.filter(x => String(x.id) !== d.idel);
    }
    else if (d.iinc || d.idec) {
        const id = d.iinc || d.idec, x = state.inst.find(a => String(a.id) === id);
        if (x)
            x.p = Math.max(0, Math.min(x.t, x.p + (d.iinc ? 1 : -1)));
    }
    else if (d.edit) {
        editing = d.edit;
    }
    else if (d.save) {
        saveEdit(d.save, c.closest('li,article'));
        return;
    }
    else if (d.cancel) {
        editing = null;
    }
    else
        return;
    save();
    render();
});
function onEnter(sel, fn) { const box = $(sel); box.addEventListener('click', e => { if (e.target.closest('button'))
    fn(); }); box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault();
    fn();
} }); }
function clear(sel) { document.querySelectorAll(sel + ' input').forEach(i => { if (i.type !== 'date')
    i.value = ''; }); }
function flag(el) { el.classList.add('err'); el.focus(); el.addEventListener('input', () => el.classList.remove('err'), { once: true }); }
$('#dt').value = iso(D);
onEnter('#add', () => {
    const v = parseFloat($('#v').value);
    if (!$('#d').value.trim())
        return flag($('#d'));
    if (!(v > 0))
        return flag($('#v'));
    if (!$('#dt').value)
        return flag($('#dt'));
    state.items.push({ id: Date.now(), d: $('#d').value.trim(), v: v, dt: $('#dt').value, paid: $('#st').value === '1' });
    $('#d').value = '';
    $('#v').value = '';
    save();
    render();
    $('#d').focus();
});
onEnter('#fadd', () => {
    const v = parseFloat($('#fv').value), dy = parseInt($('#fday').value, 10);
    if (!$('#fd').value.trim())
        return flag($('#fd'));
    if (!(v > 0))
        return flag($('#fv'));
    if (!(dy >= 1 && dy <= 31))
        return flag($('#fday'));
    state.fixed.push({ id: String(Date.now()), d: $('#fd').value.trim(), v: v, day: dy });
    clear('#fadd');
    save();
    render();
});
onEnter('#iadd', () => {
    const v = parseFloat($('#iv').value), t = parseInt($('#it').value, 10), p = parseInt($('#ip').value, 10);
    if (!$('#in').value.trim())
        return flag($('#in'));
    if (!(v > 0))
        return flag($('#iv'));
    if (!(t >= 1))
        return flag($('#it'));
    if (!(p >= 0))
        return flag($('#ip'));
    state.inst.push({ id: Date.now(), d: $('#in').value.trim(), v: v, t: t, p: Math.min(p, t) });
    clear('#iadd');
    save();
    render();
});
$('#lim').addEventListener('change', e => { const v = parseFloat(e.target.value); state.limit = v >= 0 ? v : 0; save(); render(); });
render();