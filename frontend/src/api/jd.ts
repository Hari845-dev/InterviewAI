import { apiFetch } from './client';

export interface StructuredJD {
  job_title?: string | null;
  company?: string | null;
  location?: string | null;
  employment_type?: string | null;

  experience_required?: string | null;
  salary_range?: string | null;

  summary?: string | null;

  required_skills: string[];
  preferred_skills: string[];

  responsibilities: string[];
  qualifications: string[];

  education_requirements: string[];
  certifications: string[];

  nice_to_have: string[];
  other_requirements: string[];
}

export interface JDUploadResponse {
  jd_hash: string;
  filename?: string | null;
  structured_jd: StructuredJD;
  cached: boolean;
  created_at?: string | null;
}

export interface JDListItem {
  id: string;
  jd_hash: string;

  filename?: string | null;

  job_title?: string | null;
  company?: string | null;
  location?: string | null;
  employment_type?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  structured_jd: StructuredJD;
}

export interface SkillEvidence {
  skill: string;

  status:
    | 'matched'
    | 'partial'
    | 'missing';

  evidence_type:
    | 'skill'
    | 'project'
    | 'experience'
    | 'certification'
    | 'education'
    | 'none'
    | string;

  evidence: string;

  confidence: number;
}

export interface JDMatchResponse {
  resume_hash: string;
  jd_hash: string;

  matched_skills: string[];
  missing_skills: string[];
  weak_areas: string[];

  resume_skills: string[];
  jd_required_skills: string[];

  skill_evidence: SkillEvidence[];

  partial_skills: string[];

  required_match_percentage: number;
}

export const jdApi = {
  // ==========================================================
  // UPLOAD JD TEXT
  // ==========================================================

  async uploadJDText(
    text: string
  ): Promise<JDUploadResponse> {
    return await apiFetch<JDUploadResponse>(
      '/jds/text',
      {
        method: 'POST',
        body: JSON.stringify({
          text,
        }),
        timeout: 45000,
      }
    );
  },

  // ==========================================================
  // UPLOAD JD FILE
  // ==========================================================

  async uploadJD(
    file: File
  ): Promise<JDUploadResponse> {
    const formData = new FormData();

    formData.append(
      'file',
      file
    );

    return await apiFetch<JDUploadResponse>(
      '/jds',
      {
        method: 'POST',
        body: formData,
        timeout: 45000,
      }
    );
  },

  // ==========================================================
  // LIST ALL JDS
  // ==========================================================

  async getJDs(): Promise<JDListItem[]> {
    return await apiFetch<JDListItem[]>(
      '/jds'
    );
  },

  // ==========================================================
  // GET SINGLE JD
  // ==========================================================

  async getJD(
    jdHash: string
  ): Promise<JDUploadResponse> {
    return await apiFetch<JDUploadResponse>(
      `/jds/${encodeURIComponent(
        jdHash
      )}`
    );
  },

  // ==========================================================
  // DELETE JD
  // ==========================================================

  async deleteJD(
    jdHash: string
  ): Promise<{
    success: boolean;
    jd_hash: string;
  }> {
    return await apiFetch<{
      success: boolean;
      jd_hash: string;
    }>(
      `/jds/${encodeURIComponent(
        jdHash
      )}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ==========================================================
  // MATCH RESUME AGAINST JD
  // ==========================================================

  async matchSkills(
    resumeHash: string,
    jdHash: string
  ): Promise<JDMatchResponse> {
    return await apiFetch<JDMatchResponse>(
      `/jds/${encodeURIComponent(
        resumeHash
      )}/${encodeURIComponent(
        jdHash
      )}/match`
    );
  },
};