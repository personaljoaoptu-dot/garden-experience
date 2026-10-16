/**
 * NPS Calculation & Classification Service
 * Single source of truth for NPS score metrics and zone calculation.
 */

export function calculateNPS(responses = []) {
  if (!responses || !responses.length) {
    return {
      nps: 0,
      score: 0,
      total: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      pPromoters: 0,
      pPassives: 0,
      pDetractors: 0,
      status: 'SEM DADOS',
      zone: 'Sem Dados',
      zoneClass: 'passive'
    };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  responses.forEach(r => {
    const score = typeof r === 'number' ? r : Number(r?.npsScore ?? r?.nps_score ?? 0);
    if (score >= 9) promoters++;
    else if (score >= 7) passives++;
    else detractors++;
  });

  const total = responses.length;
  const pPromoters = Math.round((promoters / total) * 100);
  const pPassives = Math.round((passives / total) * 100);
  const pDetractors = Math.round((detractors / total) * 100);
  const nps = pPromoters - pDetractors;

  let status = 'ZONA NEUTRA';
  let zone = 'Zona de Aperfeiçoamento';
  let zoneClass = 'passive';

  if (nps >= 75) {
    status = 'ZONA DE EXCELÊNCIA';
    zone = 'Zona de Excelência';
    zoneClass = 'promoter';
  } else if (nps >= 50) {
    status = 'ZONA DE QUALIDADE';
    zone = 'Zona de Qualidade';
    zoneClass = 'promoter';
  } else if (nps >= 0) {
    status = 'ZONA DE APERFEIÇOAMENTO';
    zone = 'Zona de Aperfeiçoamento';
    zoneClass = 'passive';
  } else {
    status = 'ZONA CRÍTICA';
    zone = 'Zona Crítica';
    zoneClass = 'detractor';
  }

  return {
    nps,
    score: nps,
    total,
    promoters,
    passives,
    detractors,
    pPromoters,
    pPassives,
    pDetractors,
    status,
    zone,
    zoneClass
  };
}

export function getNpsCategoryClass(score) {
  const numScore = Number(score);
  if (numScore >= 9) return 'promoter';
  if (numScore >= 7) return 'passive';
  return 'detractor';
}

export function getNpsCategoryLabel(score) {
  const numScore = Number(score);
  if (numScore >= 9) return 'Promotor';
  if (numScore >= 7) return 'Passivo';
  return 'Detrator';
}
