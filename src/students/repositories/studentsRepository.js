import { supabase } from '../../core/supabase/client.js';

export const studentsRepository = {
  /**
   * Fetch students for an organization with optional unit, search, and status filters
   */
  async fetchStudents({ organizationId, unitId, unitCode, search, status }) {
    try {
      if (!organizationId) return [];

      let query = supabase.from('students').select('*').eq('organization_id', organizationId);

      if (unitId && unitId !== 'all') {
        query = query.eq('unit_id', unitId);
      }
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('[studentsRepository.fetchStudents warning]:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('[studentsRepository.fetchStudents error]:', err);
      return [];
    }
  },

  /**
   * Fetch a single student record by ID and Organization
   */
  async fetchStudentById(organizationId, studentId) {
    try {
      if (!organizationId || !studentId) return null;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', studentId)
        .single();

      if (error) {
        console.warn('[studentsRepository.fetchStudentById warning]:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[studentsRepository.fetchStudentById error]:', err);
      return null;
    }
  },

  /**
   * Create or update a student record in Supabase
   */
  async saveStudent(studentData) {
    try {
      if (!studentData || !studentData.organization_id) {
        throw new Error('organization_id required for student persistence');
      }

      if (studentData.id) {
        // UPDATE existing student
        const { data, error } = await supabase
          .from('students')
          .update({
            name: studentData.name,
            email: studentData.email || null,
            phone: studentData.phone || null,
            external_evo_id: studentData.external_evo_id || null,
            status: studentData.status || 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', studentData.id)
          .eq('organization_id', studentData.organization_id)
          .select();

        if (error) throw error;
        return { success: true, data: data?.[0] || studentData };
      } else {
        // INSERT new student
        const { data, error } = await supabase
          .from('students')
          .insert({
            organization_id: studentData.organization_id,
            unit_id: studentData.unit_id || null,
            name: studentData.name,
            email: studentData.email || null,
            phone: studentData.phone || null,
            external_evo_id: studentData.external_evo_id || null,
            status: studentData.status || 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        return { success: true, data: data?.[0] };
      }
    } catch (err) {
      console.error('[studentsRepository.saveStudent error]:', err);
      return { success: false, error: err.message };
    }
  }
};
