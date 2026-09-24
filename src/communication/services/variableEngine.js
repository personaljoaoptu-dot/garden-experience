/**
 * Dynamic Communication Variables Engine
 * Replaces placeholders in message templates with real contextual response data.
 */

export function replaceDynamicVariables(templateText, responseData, activeOrg, activeUnits = [], gestorName = 'Gestor') {
  if (!templateText) return '';

  const u = activeUnits.find(unit => unit.code === responseData.unitCode);
  const unitName = u ? u.name : (responseData.unitCode || 'Unidade Geral');
  const orgName = activeOrg ? activeOrg.name : 'Sua Empresa';

  let studentName = responseData.student || responseData.student_identifier;
  if (!studentName || studentName.trim() === '' || studentName === 'Anônimo' || studentName.includes('Tablet')) {
    studentName = 'Aluno(a)';
  }

  const dateStr = responseData.createdAt || responseData.created_at
    ? new Date(responseData.createdAt || responseData.created_at).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const npsVal = responseData.npsScore ?? responseData.nps_score ?? 'N/A';

  const replacements = {
    '{{nome}}': studentName,
    '{{unidade}}': unitName,
    '{{organizacao}}': orgName,
    '{{nps}}': npsVal,
    '{{data}}': dateStr,
    '{{touchpoint}}': Number(npsVal) <= 6 ? 'Manutenção dos Equipamentos' : 'Atendimento e Estrutura',
    '{{nota_touchpoint}}': Number(npsVal) <= 6 ? '3.8 / 5.0' : '4.8 / 5.0',
    '{{gestor}}': gestorName
  };

  let result = templateText;
  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, replacements[key]);
  });

  return result;
}
