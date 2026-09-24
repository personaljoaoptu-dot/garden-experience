/**
 * Reports Summary & CSV Export Component
 */

import { store } from '../../app/app-state/store.js';

export function renderReportsSummary() {
  const repTotal = document.getElementById('repTotalCount');
  const repResolved = document.getElementById('repResolvedCases');
  const repPending = document.getElementById('repPendingCases');

  if (repTotal) repTotal.textContent = store.localResponses.length;
  if (repResolved) repResolved.textContent = store.followUpCases.filter(c => c.status === 'resolved').length;
  if (repPending) repPending.textContent = store.followUpCases.filter(c => c.status === 'pending').length;

  const btnExport = document.getElementById('btnExportCsv');
  if (btnExport) {
    btnExport.onclick = exportToCsv;
  }
}

export function exportToCsv() {
  let csvContent = 'data:text/csv;charset=utf-8,ID,Unidade,Origem,Nota_NPS,Categoria,Aluno,Email,Telefone,Comentario,Data\n';

  store.localResponses.forEach(r => {
    const cat = r.npsScore >= 9 ? 'Promotor' : r.npsScore >= 7 ? 'Passivo' : 'Detrator';
    const cleanComment = (r.comment || '').replace(/"/g, '""');
    csvContent += `"${r.id}","${r.unitCode}","${r.origin}",${r.npsScore},"${cat}","${r.student}","${r.email || ''}","${r.phone || ''}","${cleanComment}","${r.createdAt}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `relatorio_nps_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
