import { supabase } from '../../core/supabase/client.js';

export const responsesRepository = {
  async submitPublicResponse({ token, unitCode, origin, npsScore, comment, student, email, phone, touchpointRatings, touchpointObservations, consentAccepted }) {
    const cleanToken = token ? String(token).trim() : '';
    if (!cleanToken) {
      return { success: false, error: 'Token da pesquisa é obrigatório.' };
    }

    try {
      let validOrigin = 'link';
      if (origin === 'qr_web' || origin === 'qr_code' || origin === 'qr') validOrigin = 'qr_code';
      else if (origin === 'kiosk' || origin === 'tablet') validOrigin = 'tablet';

      const { data, error } = await supabase.rpc('submit_survey_response', {
        p_survey_link_token: cleanToken,
        p_unit_code: unitCode || null,
        p_origin: validOrigin,
        p_nps_score: npsScore,
        p_comment: comment || null,
        p_student_identifier: student || null,
        p_student_email: email || null,
        p_student_phone: phone || null,
        p_touchpoint_ratings: touchpointRatings || null,
        p_consent_accepted: Boolean(consentAccepted),
        p_consent_version: '1.0',
        p_touchpoint_observations: touchpointObservations || null
      });

      if (error) {
        console.warn('[Supabase RPC Warning] submit_survey_response:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      console.warn('[Supabase RPC Error]:', err);
      return { success: false, error: err.message };
    }
  },

  async fetchResponses({ organizationId, unitCode, origin, startDate, endDate }) {
    try {
      let query = supabase.from('responses').select('*').order('created_at', { ascending: false });

      if (organizationId) query = query.eq('organization_id', organizationId);
      if (origin && origin !== 'all') query = query.eq('origin', origin);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) {
        console.warn('[responsesRepository.fetchResponses warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[responsesRepository.fetchResponses error]:', err);
      return null;
    }
  },

  /**
   * Transfer a response to another unit (moves responses, follow_up_cases, and students)
   */
  async transferResponseUnit({ responseId, targetUnitId, targetUnitCode, studentId }) {
    if (!responseId || !targetUnitId) {
      return { success: false, error: 'ID da resposta e ID da unidade de destino são obrigatórios.' };
    }

    try {
      // Try RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('transfer_response_unit', {
        p_response_id: responseId,
        p_target_unit_id: targetUnitId,
        p_target_unit_code: targetUnitCode || null
      });

      if (!rpcErr && rpcData?.success) {
        return { success: true, data: rpcData };
      }

      // Fallback: direct table updates
      const updateData = { unit_id: targetUnitId };
      if (targetUnitCode) updateData.unit_code = targetUnitCode;

      const { error: respErr } = await supabase
        .from('responses')
        .update(updateData)
        .eq('id', responseId);

      if (respErr) {
        console.warn('[responsesRepository.transferResponseUnit fallback warning]:', respErr.message);
        return { success: false, error: respErr.message };
      }

      // Update follow_up_cases if any
      try {
        await supabase
          .from('follow_up_cases')
          .update({ unit_id: targetUnitId })
          .eq('response_id', responseId);
      } catch (_) {}

      // Update student if linked
      if (studentId) {
        try {
          await supabase
            .from('students')
            .update({ unit_id: targetUnitId })
            .eq('id', studentId);
        } catch (_) {}
      }

      return {
        success: true,
        unit_id: targetUnitId,
        unit_code: targetUnitCode
      };
    } catch (err) {
      console.error('[responsesRepository.transferResponseUnit error]:', err);
      return { success: false, error: err.message || 'Erro ao transferir resposta de unidade.' };
    }
  }
};
