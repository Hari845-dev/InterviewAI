import { apiFetch } from './client';

import {
  ResumeProfileResponse,
  StoredResumeItem,
  StructuredProfile,
} from '../types';

const RESUMES_STORAGE_KEY =
  'interviewai_stored_resumes';

const ACTIVE_RESUME_KEY =
  'interviewai_active_resume_hash';

/* =========================================================
   NORMALIZE PROFILE
   ========================================================= */

function normalizeProfile(
  raw: any
): StructuredProfile {
  const experience =
    Array.isArray(
      raw?.experience
    )
      ? raw.experience.map(
          (item: any) => ({
            role:
              item?.role ||
              '',

            company:
              item?.company ||
              '',

            duration_months:
              Number(
                item?.duration_months ||
                  0
              ),

            responsibilities:
              Array.isArray(
                item?.responsibilities
              )
                ? item.responsibilities
                : [],

            duration:
              item?.duration ||
              (
                item?.duration_months
                  ? `${item.duration_months} months`
                  : 'Not specified'
              ),

            location:
              item?.location,

            highlights:
              Array.isArray(
                item?.highlights
              )
                ? item.highlights
                : Array.isArray(
                    item?.responsibilities
                  )
                ? item.responsibilities
                : [],
          })
        )
      : [];

  const projects =
    Array.isArray(
      raw?.projects
    )
      ? raw.projects.map(
          (item: any) => ({
            title:
              item?.title ||
              'Untitled project',

            description:
              item?.description ||
              '',

            tech_stack:
              Array.isArray(
                item?.tech_stack
              )
                ? item.tech_stack
                : [],

            role:
              item?.role,

            highlights:
              Array.isArray(
                item?.highlights
              )
                ? item.highlights
                : [],

            evidence_snippet:
              item?.evidence_snippet,
          })
        )
      : [];

  const certifications =
    Array.isArray(
      raw?.certifications
    )
      ? raw.certifications.map(
          (item: any) =>
            typeof item ===
            'string'
              ? {
                  name: item,
                }
              : {
                  name:
                    item?.name ||
                    '',
                  issuer:
                    item?.issuer,
                  year:
                    item?.year
                      ? String(
                          item.year
                        )
                      : undefined,
                }
        )
      : [];

  const education =
    Array.isArray(
      raw?.education
    )
      ? raw.education.map(
          (item: any) => ({
            degree:
              item?.degree ||
              '',

            institution:
              item?.institution ||
              '',

            year:
              Number(
                item?.year ||
                  0
              ),

            score:
              item?.score,
          })
        )
      : [];

  const skills =
    Array.isArray(
      raw?.skills
    )
      ? raw.skills
      : Object.values(
          raw?.skills || {}
        )
          .flat()
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
              'string'
          );

  return {
    name:
      raw?.name ??
      null,

    skills,

    projects,

    experience,

    certifications,

    education,
  };
}

/* =========================================================
   NORMALIZE UPLOAD RESPONSE
   ========================================================= */

function normalizeResumeResponse(
  raw: any,
  filename?: string
): ResumeProfileResponse {
  return {
    resume_hash:
      raw.resume_hash,

    structured_profile:
      normalizeProfile(
        raw.structured_profile
      ),

    cached:
      Boolean(
        raw.cached
      ),

    created_at:
      raw.created_at,

    upload_date:
      raw.upload_date ||
      raw.created_at,

    filename:
      raw.filename ||
      filename,
  };
}

/* =========================================================
   NORMALIZE STORED RESUME
   ========================================================= */

function normalizeStoredResume(
  raw: any
): StoredResumeItem {
  const profile =
    normalizeProfile(
      raw.structured_profile
    );

  return {
    id:
      raw.id ||
      raw.resume_hash,

    resume_hash:
      raw.resume_hash,

    filename:
      raw.filename ||
      `resume_${raw.resume_hash}.pdf`,

    upload_date:
      raw.upload_date ||
      raw.created_at,

    structured_profile:
      profile,

    extracted_skills:
      Array.isArray(
        raw.extracted_skills
      )
        ? raw.extracted_skills
        : profile.skills,

    projects_count:
      Number(
        raw.projects_count ??
          profile.projects.length
      ),

    experience_count:
      Number(
        raw.experience_count ??
          profile.experience.length
      ),

    is_active:
      Boolean(
        raw.is_active
      ),

    created_at:
      raw.created_at,

    updated_at:
      raw.updated_at,
  };
}

/* =========================================================
   LOCAL STORAGE HELPERS
   ========================================================= */

function getStoredResumesFromStorage():
  StoredResumeItem[] {
  try {
    const raw =
      localStorage.getItem(
        RESUMES_STORAGE_KEY
      );

    return raw
      ? JSON.parse(raw)
      : [];
  } catch {
    return [];
  }
}

function saveStoredResumesToStorage(
  resumes: StoredResumeItem[]
): void {
  try {
    localStorage.setItem(
      RESUMES_STORAGE_KEY,
      JSON.stringify(
        resumes
      )
    );
  } catch {
    // Local storage is only a convenience cache.
  }
}

/* =========================================================
   API
   ========================================================= */

export const resumeApi = {
  /* =======================================================
     GET USER RESUMES
     ======================================================= */

  async getUserResumes():
    Promise<StoredResumeItem[]> {
    const response =
      await apiFetch<any[]>(
        '/resumes'
      );

    const normalized =
      response.map(
        normalizeStoredResume
      );

    saveStoredResumesToStorage(
      normalized
    );

    return normalized;
  },

  /* =======================================================
     UPLOAD RESUME
     ======================================================= */

  async uploadResume(
    file: File,
    signal?: AbortSignal
  ): Promise<ResumeProfileResponse> {
    if (
      signal?.aborted
    ) {
      throw new DOMException(
        'Upload cancelled.',
        'AbortError'
      );
    }

    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    const raw =
      await apiFetch<any>(
        '/resumes',
        {
          method: 'POST',
          body: formData,
          timeout: 120000,
          signal,
        }
      );

    /*
     * Do not touch local storage if the upload was cancelled.
     */
    if (
      signal?.aborted
    ) {
      throw new DOMException(
        'Upload cancelled.',
        'AbortError'
      );
    }

    const response =
      normalizeResumeResponse(
        raw,
        file.name
      );

    /*
     * A cancellation race can theoretically happen immediately
     * after the response arrives. Check once more before mutating
     * local state.
     */
    if (
      signal?.aborted
    ) {
      throw new DOMException(
        'Upload cancelled.',
        'AbortError'
      );
    }

    const currentList =
      getStoredResumesFromStorage();

    const newItem:
      StoredResumeItem = {
      id:
        response.resume_hash,

      resume_hash:
        response.resume_hash,

      filename:
        response.filename ||
        file.name,

      upload_date:
        response.upload_date ||
        new Date().toISOString(),

      structured_profile:
        response.structured_profile,

      extracted_skills:
        response
          .structured_profile
          .skills,

      projects_count:
        response
          .structured_profile
          .projects
          .length,

      experience_count:
        response
          .structured_profile
          .experience
          .length,

      is_active:
        true,

      created_at:
        response.created_at,
    };

    saveStoredResumesToStorage([
      newItem,

      ...currentList
        .filter(
          resume =>
            resume.resume_hash !==
            response.resume_hash
        )
        .map(
          resume => ({
            ...resume,
            is_active:
              false,
          })
        ),
    ]);

    localStorage.setItem(
      ACTIVE_RESUME_KEY,
      response.resume_hash
    );

    localStorage.setItem(
      'interviewai_active_resume_profile',
      JSON.stringify(
        response
      )
    );

    return response;
  },

  /* =======================================================
     GET RESUME BY HASH
     ======================================================= */

  async getResumeByHash(
    resumeHash: string
  ): Promise<ResumeProfileResponse> {
    const raw =
      await apiFetch<any>(
        `/resumes/${encodeURIComponent(
          resumeHash
        )}`
      );

    return normalizeResumeResponse(
      raw
    );
  },

  /* =======================================================
     DELETE RESUME
     ======================================================= */

  async deleteResume(
    resumeHash: string
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    await apiFetch(
      `/resumes/${encodeURIComponent(
        resumeHash
      )}`,
      {
        method: 'DELETE',
      }
    );

    const currentList =
      getStoredResumesFromStorage()
        .filter(
          resume =>
            resume.resume_hash !==
            resumeHash
        );

    saveStoredResumesToStorage(
      currentList
    );

    const activeHash =
      localStorage.getItem(
        ACTIVE_RESUME_KEY
      );

    if (
      activeHash ===
      resumeHash
    ) {
      if (
        currentList.length >
        0
      ) {
        await this.setActiveResume(
          currentList[0]
            .resume_hash
        );
      } else {
        localStorage.removeItem(
          ACTIVE_RESUME_KEY
        );

        localStorage.removeItem(
          'interviewai_active_resume_profile'
        );
      }
    }

    return {
      success: true,
      message:
        'Resume deleted successfully',
    };
  },

  /* =======================================================
     SET ACTIVE RESUME
     ======================================================= */

  async setActiveResume(
    resumeHash: string
  ): Promise<{
    success: boolean;
    resume_hash?: string;
  }> {
    await apiFetch(
      `/resumes/${encodeURIComponent(
        resumeHash
      )}/active`,
      {
        method: 'PUT',
      }
    );

    const currentList =
      getStoredResumesFromStorage();

    saveStoredResumesToStorage(
      currentList.map(
        resume => ({
          ...resume,
          is_active:
            resume.resume_hash ===
            resumeHash,
        })
      )
    );

    localStorage.setItem(
      ACTIVE_RESUME_KEY,
      resumeHash
    );

    return {
      success: true,
      resume_hash:
        resumeHash,
    };
  },
};