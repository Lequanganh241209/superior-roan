import { supabase } from "@/lib/supabase/client";

export interface ProjectMetadata {
  project_id: string;
  name: string;
  structure: any;
  dependencies: string[];
  env_vars: Record<string, string>;
  schema_tables?: string[];
}

export const ContextOracle = {
  async saveMetadata(data: ProjectMetadata) {
    const { error } = await supabase
      .from('project_metadata')
      .upsert(data, { onConflict: 'project_id' });
    
    if (error) throw new Error(`Oracle Write Failed: ${error.message}`);
    return true;
  },

  async getMetadata(projectId: string) {
    const { data, error } = await supabase
      .from('project_metadata')
      .select('*')
      .eq('project_id', projectId)
      .single();
      
    if (error) throw new Error(`Oracle Read Failed: ${error.message}`);
    return data;
  },

  async logBuildError(projectId: string, errorLog: any) {
      // Fetch current logs first
      const { data } = await supabase
        .from('project_metadata')
        .select('error_logs')
        .eq('project_id', projectId)
        .single();
        
      const currentLogs = data?.error_logs || [];
      const newLogs = [...currentLogs, { timestamp: new Date().toISOString(), ...errorLog }];

      const { error } = await supabase
        .from('project_metadata')
        .update({ 
            last_build_status: 'failed',
            error_logs: newLogs 
        })
        .eq('project_id', projectId);

      if (error) throw new Error(`Oracle Log Failed: ${error.message}`);
  }
};
