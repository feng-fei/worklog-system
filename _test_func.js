function loadMaterials() {
    const params = new URLSearchParams({
        page: materialsPage,
        per_page: 20,
        keyword: document.getElementById('matSearch') ? document.getElementById('matSearch').value : '',
        low_stock_only: document.getElementById('matLowStockOnly').checked,
        category: matCurrentCategory
    });
    apiFetch('/api/materials?' + params.toString()).then(r => {
        const tbody = document.getElementById('materialsTableBody');
        if (r.error || !r.records || r.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">暂无物料</td></tr>';
            document.getElementById('materialsTotalInfo').textContent = '共 0 条';
            document.getElementById('materialsPagination').innerHTML = '';
            return;
        }
        tbody.innerHTML = r.records.map(m => `
            <tr class="${m.is_low_stock ? 'table-warning' : ''}">
                <td><code class="small">${m.material_no}</code></td>
                <td class="fw-semibold">${m.name}</td>
                <td><span class="badge bg-light text-dark">${m.category || '-'}</span></td>
                <td class="small text-muted">${m.brand || ''} ${m.model || ''} ${m.spec || ''}</td>
                <td>${m.unit}</td>
                <td>¥${m.unit_price.toFixed(2)}</td>
                <td class="${m.is_low_stock ? 'text-danger fw-bold' : ''}">${m.stock} ${m.unit}${m.is_low_stock ? ' ⚠️' : ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline-success" onclick="stockIn(${m.id})">入库</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="stockOut(${m.id})">出库</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editMaterial(${m.id})">编辑</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('materialsTotalInfo').textContent = `共 ${r.total} 条`;
        document.getElementById('matTotalCount').textContent = r.total;
        let lowStock = 0;
        if (r.records) {
            lowStock = r.records.filter(m => m.is_low_stock).length;
        }
        document.getElementById('matLowStockCount').textContent = lowStock;
        if (r.categories) {
            const tags = document.getElementById('matCategoryTags');
            tags.innerHTML = '<button class="btn btn-sm ' + (matCurrentCategory === '' ? 'btn-primary' : 'btn-outline-secondary') + '" onclick="filterByCategory(\\'\\', this)">全部</button>' +
                r.categories.map(c => '<button class="btn btn-sm ' + (matCurrentCategory === c ? 'btn-primary' : 'btn-outline-secondary') + '" onclick="filterByCategory(\\'' + c + '\\', this)">' + c + '</button>').join('');
        }
        _renderSimplePagination('materialsPagination', r.page, r.pages, loadMaterials, (p) => { materialsPage = p; });
    });
}