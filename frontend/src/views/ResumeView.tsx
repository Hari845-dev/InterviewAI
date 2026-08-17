import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  FileText,
  ArrowRight,
  UploadCloud,
  Layers,
  Briefcase,
  GraduationCap,
  Award,
  Clock,
  Code,
  Tag,
  Target,
  Trash2,
  Check,
  Eye,
  Plus,
  ChevronRight,
  Building2,
  UserRound,
  CalendarDays,
  Wrench,
  ExternalLink,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { resumeApi } from '../api';

import {
  StoredResumeItem,
  StructuredProfile,
} from '../types';

export const ResumeView: React.FC = () => {
  const navigate =
    useNavigate();

  const {
    resumes,
    activeResumeHash,
    activeResumeProfile,
    switchActiveResume,
    deleteResume,
    refreshResumes,
  } = useAuth();

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [
    uploadError,
    setUploadError,
  ] = useState<string | null>(
    null
  );

  const [
    showUploadModal,
    setShowUploadModal,
  ] = useState(false);

  const [
    resumeToDelete,
    setResumeToDelete,
  ] =
    useState<StoredResumeItem | null>(
      null
    );

  const [
    viewingProfileResume,
    setViewingProfileResume,
  ] =
    useState<StoredResumeItem | null>(
      null
    );

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  /*
   * ==========================================================
   * ACTIVE UPLOAD CONTROLLER
   * ==========================================================
   */

  const uploadControllerRef =
    useRef<AbortController | null>(
      null
    );

  /*
   * Unique identifier for the currently active upload.
   *
   * This prevents an old cancelled upload from resetting the
   * state of a newer upload.
   */
  const uploadIdRef =
    useRef<number>(0);

  /*
   * ==========================================================
   * COMPONENT CLEANUP
   * ==========================================================
   */

  useEffect(() => {
    return () => {
      uploadIdRef.current += 1;

      uploadControllerRef.current?.abort();

      uploadControllerRef.current =
        null;
    };
  }, []);

  /*
   * ==========================================================
   * OPEN UPLOAD MODAL
   * ==========================================================
   */

  const openUploadModal = () => {
    /*
     * If the file input still remembers an old selection,
     * clearing it allows the same file to be selected again.
     */
    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        '';
    }

    setUploadError(
      null
    );

    setIsDragging(
      false
    );

    setShowUploadModal(
      true
    );
  };

  /*
   * ==========================================================
   * CANCEL ACTIVE UPLOAD
   * ==========================================================
   */

  const handleCancelUpload = () => {
    /*
     * Invalidate the current upload first.
     */
    uploadIdRef.current += 1;

    /*
     * Abort the browser's network request.
     */
    const controller =
      uploadControllerRef.current;

    uploadControllerRef.current =
      null;

    if (controller) {
      controller.abort();
    }

    /*
     * Reset UI immediately.
     */
    setIsUploading(
      false
    );

    setUploadError(
      null
    );

    setIsDragging(
      false
    );

    /*
     * Clear the file input.
     */
    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        '';
    }

    /*
     * Close the dialog.
     */
    setShowUploadModal(
      false
    );
  };

  /*
   * ==========================================================
   * CLOSE MODAL
   * ==========================================================
   */

  const handleCloseUploadModal = () => {
    /*
     * Closing while uploading means cancel the upload.
     */
    if (isUploading) {
      handleCancelUpload();
      return;
    }

    setUploadError(
      null
    );

    setIsDragging(
      false
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        '';
    }

    setShowUploadModal(
      false
    );
  };

  /*
   * ==========================================================
   * UPLOAD
   * ==========================================================
   */

  const handleFileUpload = async (
    file: File
  ) => {
    if (!file) {
      return;
    }

    /*
     * Cancel any previous upload before starting another.
     */
    uploadControllerRef.current?.abort();

    const controller =
      new AbortController();

    const uploadId =
      uploadIdRef.current + 1;

    uploadIdRef.current =
      uploadId;

    uploadControllerRef.current =
      controller;

    setIsUploading(
      true
    );

    setUploadError(
      null
    );

    try {
      /*
       * Do not start a request that was cancelled before
       * reaching this point.
       */
      if (
        controller.signal.aborted ||
        uploadIdRef.current !==
          uploadId
      ) {
        return;
      }

      await resumeApi.uploadResume(
        file,
        controller.signal
      );

      /*
       * Ignore stale/cancelled upload.
       */
      if (
        controller.signal.aborted ||
        uploadIdRef.current !==
          uploadId
      ) {
        return;
      }

      /*
       * Refresh the resume list only for the current upload.
       */
      await refreshResumes();

      if (
        controller.signal.aborted ||
        uploadIdRef.current !==
          uploadId
      ) {
        return;
      }

      /*
       * Success.
       */
      setIsUploading(
        false
      );

      setUploadError(
        null
      );

      setIsDragging(
        false
      );

      setShowUploadModal(
        false
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }

    } catch (
      error: unknown
    ) {
      /*
       * Cancellation is not an error shown to the user.
       */
      if (
        controller.signal.aborted ||
        uploadIdRef.current !==
          uploadId
      ) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload resume.';

      setUploadError(
        message
      );

    } finally {
      /*
       * Only the currently active upload is allowed to update
       * the shared upload state.
       */
      if (
        uploadControllerRef.current ===
        controller
      ) {
        uploadControllerRef.current =
          null;

        if (
          uploadIdRef.current ===
          uploadId
        ) {
          setIsUploading(
            false
          );
        }
      }
    }
  };

  /*
   * ==========================================================
   * DROP
   * ==========================================================
   */

  const handleDrop = (
    event: React.DragEvent
  ) => {
    event.preventDefault();

    setIsDragging(
      false
    );

    if (
      isUploading
    ) {
      return;
    }

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      handleFileUpload(
        file
      );
    }
  };

  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  const confirmDelete =
    async () => {
      if (
        !resumeToDelete
      ) {
        return;
      }

      try {
        await deleteResume(
          resumeToDelete.resume_hash
        );

        setResumeToDelete(
          null
        );

        await refreshResumes();

      } catch (
        error
      ) {
        console.error(
          'Failed to delete resume:',
          error
        );
      }
    };

  /*
   * ==========================================================
   * ACTIVE RESUME
   * ==========================================================
   */

  const activeResumeItem =
    resumes.find(
      resume =>
        resume.resume_hash ===
        activeResumeHash
    ) ||
    resumes[0];

  const otherResumes =
    resumes.filter(
      resume =>
        resume.resume_hash !==
        activeResumeItem?.resume_hash
    );

  const displayProfile:
    | StructuredProfile
    | undefined =
    viewingProfileResume?.structured_profile ||
    activeResumeProfile?.structured_profile ||
    activeResumeItem?.structured_profile;

  const rawProfile =
    displayProfile as any;

  /*
   * ==========================================================
   * NORMALIZED DATA
   * ==========================================================
   */

  const normalizedProjects =
    useMemo(() => {
      return Array.isArray(
        rawProfile?.projects
      )
        ? rawProfile.projects
        : [];
    }, [rawProfile]);

  const normalizedExperience =
    useMemo(() => {
      return Array.isArray(
        rawProfile?.experience
      )
        ? rawProfile.experience
        : [];
    }, [rawProfile]);

  const normalizedEducation =
    useMemo(() => {
      return Array.isArray(
        rawProfile?.education
      )
        ? rawProfile.education
        : [];
    }, [rawProfile]);

  const normalizedCertifications =
    useMemo(() => {
      return Array.isArray(
        rawProfile?.certifications
      )
        ? rawProfile.certifications
        : [];
    }, [rawProfile]);

  const normalizedSkills =
    useMemo(() => {
      const skills =
        rawProfile?.skills;

      if (
        Array.isArray(
          skills
        )
      ) {
        return skills.filter(
          (
            skill
          ): skill is string =>
            typeof skill ===
              'string' &&
            skill.trim()
              .length > 0
        );
      }

      if (
        skills &&
        typeof skills ===
          'object'
      ) {
        const result:
          string[] = [];

        Object.values(
          skills
        ).forEach(
          value => {
            if (
              Array.isArray(
                value
              )
            ) {
              value.forEach(
                item => {
                  if (
                    typeof item ===
                      'string' &&
                    item.trim()
                      .length > 0
                  ) {
                    result.push(
                      item
                    );
                  }
                }
              );
            }
          }
        );

        return result;
      }

      return [];
    }, [rawProfile]);

  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  const formatDate = (
    isoString?: string
  ) => {
    if (!isoString) {
      return 'Recent';
    }

    try {
      return new Date(
        isoString
      ).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      );
    } catch {
      return 'Recent';
    }
  };

  const formatDuration = (
    experience: any
  ): string => {
    if (
      typeof experience?.duration_months ===
        'number' &&
      experience.duration_months >
        0
    ) {
      const months =
        experience.duration_months;

      const years =
        Math.floor(
          months / 12
        );

      const remainingMonths =
        months % 12;

      if (
        years > 0
      ) {
        return remainingMonths >
          0
          ? `${years} yr ${remainingMonths} mo`
          : `${years} yr`;
      }

      return `${months} mo`;
    }

    if (
      experience?.duration &&
      String(
        experience.duration
      ).trim()
    ) {
      return String(
        experience.duration
      );
    }

    return 'Duration not extracted';
  };

  const getResponsibilities = (
    experience: any
  ): string[] => {
    if (
      Array.isArray(
        experience?.responsibilities
      )
    ) {
      return experience.responsibilities.filter(
        (
          item: unknown
        ): item is string =>
          typeof item ===
            'string' &&
          item.trim()
            .length > 0
      );
    }

    if (
      Array.isArray(
        experience?.highlights
      )
    ) {
      return experience.highlights.filter(
        (
          item: unknown
        ): item is string =>
          typeof item ===
            'string' &&
          item.trim()
            .length > 0
      );
    }

    return [];
  };

  const getProjectDescription = (
    project: any
  ): string => {
    const description =
      project?.description;

    if (
      typeof description ===
        'string' &&
      description.trim()
    ) {
      return description.trim();
    }

    return 'No project description was extracted from this resume.';
  };

  const getProjectTechStack = (
    project: any
  ): string[] => {
    if (
      Array.isArray(
        project?.tech_stack
      )
    ) {
      return project.tech_stack.filter(
        (
          item: unknown
        ): item is string =>
          typeof item ===
            'string' &&
          item.trim()
            .length > 0
      );
    }

    if (
      Array.isArray(
        project?.technologies
      )
    ) {
      return project.technologies.filter(
        (
          item: unknown
        ): item is string =>
          typeof item ===
            'string' &&
          item.trim()
            .length > 0
      );
    }

    return [];
  };

  const getProjectHighlights = (
    project: any
  ): string[] => {
    if (
      Array.isArray(
        project?.highlights
      )
    ) {
      return project.highlights.filter(
        (
          item: unknown
        ): item is string =>
          typeof item ===
            'string' &&
          item.trim()
            .length > 0
      );
    }

    if (
      Array.isArray(
        project?.responsibilities
      )
    ) {
      return project.responsibilities.filter(
        (
          item: unknown
        ): item is string =>
          typeof item ===
            'string' &&
          item.trim()
            .length > 0
      );
    }

    return [];
  };

  const getCertificationName = (
    certification: any
  ): string => {
    if (
      typeof certification ===
      'string'
    ) {
      return certification;
    }

    return (
      certification?.name ||
      certification?.title ||
      'Certification'
    );
  };

  const getCertificationIssuer = (
    certification: any
  ): string => {
    if (
      typeof certification ===
      'string'
    ) {
      return '';
    }

    return (
      certification?.issuer ||
      certification?.organization ||
      ''
    );
  };

  const getCertificationYear = (
    certification: any
  ): string => {
    if (
      typeof certification ===
      'string'
    ) {
      return '';
    }

    const year =
      certification?.year ||
      certification?.issued_year ||
      certification?.date;

    return year
      ? String(year)
      : '';
  };

  const getEducationYear = (
    education: any
  ): string => {
    const year =
      education?.year;

    if (
      year === undefined ||
      year === null ||
      year === '' ||
      year === 0
    ) {
      return '';
    }

    return String(
      year
    );
  };

  const getEducationScore = (
    education: any
  ): string => {
    const score =
      education?.score ||
      education?.cgpa ||
      education?.percentage;

    if (
      score === undefined ||
      score === null ||
      score === ''
    ) {
      return '';
    }

    return String(
      score
    );
  };

  const primaryExperience =
    normalizedExperience.length >
    0
      ? normalizedExperience[0]
      : null;

  const primaryRole =
    primaryExperience?.role ||
    '';

  const primaryCompany =
    primaryExperience?.company ||
    '';

  const summary =
    typeof rawProfile?.summary ===
      'string'
      ? rawProfile.summary.trim()
      : '';

  const location =
    typeof rawProfile?.location ===
      'string'
      ? rawProfile.location.trim()
      : '';

  const email =
    typeof rawProfile?.email ===
      'string'
      ? rawProfile.email.trim()
      : '';

  const phone =
    typeof rawProfile?.phone ===
      'string'
      ? rawProfile.phone.trim()
      : '';

  const linkedin =
    typeof rawProfile?.linkedin ===
      'string'
      ? rawProfile.linkedin.trim()
      : '';

  const github =
    typeof rawProfile?.github ===
      'string'
      ? rawProfile.github.trim()
      : '';

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="space-y-8 animate-fade-in pb-16">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">

            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              RESUME & PROFILE MANAGEMENT
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
              {resumes.length}{' '}
              {resumes.length === 1
                ? 'Resume'
                : 'Resumes'}{' '}
              Stored
            </span>

          </div>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
            My Resumes
          </h1>

          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Manage your uploaded resumes,
            switch active preparation
            profiles, and inspect the
            evidence extracted from your
            resume.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={
              openUploadModal
            }
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            Upload New Resume
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/prepare'
              )
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-xs font-medium shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"
          >
            <Target className="w-3.5 h-3.5" />
            Start Preparation
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </div>
      </div>

      {/* =====================================================
          RESUME LIST
          ===================================================== */}

      <div className="space-y-4">

        <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
          Active & Stored Resumes
        </h2>

        {resumes.length === 0 ? (

          <div className="p-12 rounded-[32px] bg-white border-2 border-dashed border-gray-200 text-center space-y-4 shadow-sm">

            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-gray-900">
                No Resumes Uploaded Yet
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                Upload your resume to
                extract skills, projects,
                work experience,
                education,
                certifications, and other
                evidence for grounded
                interview preparation.
              </p>
            </div>

            <button
              type="button"
              onClick={
                openUploadModal
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full text-xs font-bold shadow-lg shadow-indigo-100 transition-all"
            >
              Upload Resume Now
            </button>

          </div>

        ) : (

          <div className="space-y-4">

            {activeResumeItem && (
              <div className="p-6 sm:p-7 rounded-[28px] bg-white border-2 border-indigo-600 shadow-md shadow-indigo-50 space-y-4">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>

                    <div>

                      <div className="flex items-center gap-2 flex-wrap">

                        <h3 className="text-base font-bold text-gray-900">
                          {activeResumeItem.filename ||
                            'Candidate Resume'}
                        </h3>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-green-50 text-green-700 border border-green-200 flex items-center gap-1 font-semibold">
                          <Check className="w-3 h-3 text-green-600" />
                          Active for Preparation
                        </span>

                      </div>

                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Uploaded on{' '}
                        {formatDate(
                          activeResumeItem.upload_date
                        )}
                        {' • '}
                        {activeResumeItem.projects_count ??
                          normalizedProjects.length}{' '}
                        projects
                        {' • '}
                        {activeResumeItem.experience_count ??
                          normalizedExperience.length}{' '}
                        roles
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-2 shrink-0">

                    <button
                      type="button"
                      onClick={() =>
                        setViewingProfileResume(
                          activeResumeItem
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      View Profile
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setResumeToDelete(
                          activeResumeItem
                        )
                      }
                      className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </div>

                {activeResumeItem.extracted_skills &&
                  activeResumeItem.extracted_skills.length >
                    0 && (

                    <div className="flex flex-wrap gap-1.5 pt-1">

                      {activeResumeItem.extracted_skills
                        .slice(0, 10)
                        .map(
                          (
                            skill,
                            index
                          ) => (
                            <span
                              key={
                                index
                              }
                              className="px-2.5 py-0.5 rounded-full bg-indigo-50/70 border border-indigo-100 text-[11px] font-medium text-indigo-900"
                            >
                              {skill}
                            </span>
                          )
                        )}

                      {activeResumeItem.extracted_skills.length >
                        10 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-[11px] font-mono text-gray-500">
                          +{activeResumeItem.extracted_skills.length -
                            10}{' '}
                          more
                        </span>
                      )}

                    </div>
                  )}

              </div>
            )}

            {otherResumes.length > 0 && (

              <div className="space-y-3 pt-2">

                <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                  Previous Resumes ({otherResumes.length})
                </h3>

                <div className="grid grid-cols-1 gap-3">

                  {otherResumes.map(
                    resume => (
                      <div
                        key={
                          resume.resume_hash
                        }
                        className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-200 transition-all"
                      >

                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>

                          <div>

                            <h4 className="text-sm font-bold text-gray-900">
                              {resume.filename}
                            </h4>

                            <p className="text-xs text-gray-500 font-mono">
                              Uploaded{' '}
                              {formatDate(
                                resume.upload_date
                              )}
                              {' • '}
                              {resume.projects_count ??
                                0}{' '}
                              projects
                              {' • '}
                              {resume.experience_count ??
                                0}{' '}
                              roles
                            </p>

                          </div>

                        </div>

                        <div className="flex items-center gap-2 shrink-0">

                          <button
                            type="button"
                            onClick={() =>
                              switchActiveResume(
                                resume.resume_hash
                              )
                            }
                            className="px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                          >
                            <Target className="w-3.5 h-3.5" />
                            Use for Preparation
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setViewingProfileResume(
                                resume
                              )
                            }
                            className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setResumeToDelete(
                                resume
                              )
                            }
                            className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </div>
                    )
                  )}

                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* =====================================================
          FULL STRUCTURED PROFILE
          ===================================================== */}

      {displayProfile && (
        <div className="space-y-8 pt-4 border-t border-gray-100">

          <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm">

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

              <div>

                <div className="flex items-center gap-2 flex-wrap">

                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    PARSED CANDIDATE PROFILE
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-green-50 text-green-700 border border-green-200">
                    Grounding Data
                  </span>

                </div>

                <h2 className="text-3xl font-serif italic text-gray-900 mt-2">
                  {rawProfile?.name ||
                    'Candidate Profile'}
                </h2>

                {primaryRole && (

                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">

                    <Briefcase className="w-4 h-4 text-indigo-600" />

                    <span className="font-semibold">
                      {primaryRole}
                    </span>

                    {primaryCompany && (
                      <>
                        <span className="text-gray-300">
                          •
                        </span>
                        <span>
                          {primaryCompany}
                        </span>
                      </>
                    )}

                  </div>
                )}

                {location && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>
                      {location}
                    </span>
                  </div>
                )}

              </div>

              {viewingProfileResume && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingProfileResume(
                      null
                    )
                  }
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  Back to Active Resume Profile
                </button>
              )}

            </div>

            {(email ||
              phone ||
              linkedin ||
              github) && (

              <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-gray-100">

                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-600 flex items-center gap-1.5 hover:border-indigo-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {email}
                  </a>
                )}

                {phone && (
                  <span className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-600">
                    {phone}
                  </span>
                )}

                {linkedin && (
                  <a
                    href={
                      linkedin.startsWith(
                        'http'
                      )
                        ? linkedin
                        : `https://${linkedin}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-indigo-600 flex items-center gap-1.5 hover:border-indigo-200 transition-colors"
                  >
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {github && (
                  <a
                    href={
                      github.startsWith(
                        'http'
                      )
                        ? github
                        : `https://${github}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-indigo-600 flex items-center gap-1.5 hover:border-indigo-200 transition-colors"
                  >
                    GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

              </div>
            )}

            {summary && (
              <div className="mt-6 pt-5 border-t border-gray-100">

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-2">
                  Professional Summary
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed">
                  {summary}
                </p>

              </div>
            )}

          </div>

          <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-4">

            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

              <Tag className="w-4 h-4 text-indigo-600" />

              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Extracted Skills & Competencies
              </h3>

              <span className="ml-auto text-[10px] font-mono text-gray-400">
                {normalizedSkills.length} skills
              </span>

            </div>

            {normalizedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {normalizedSkills.map(
                  skill => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 border border-gray-100 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No skills were extracted from this resume.
              </p>
            )}

          </div>

          <div className="space-y-4">

            <div className="flex items-center gap-2">

              <Briefcase className="w-4 h-4 text-indigo-600" />

              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Professional Experience
              </h3>

              <span className="text-[10px] font-mono text-gray-400">
                ({normalizedExperience.length})
              </span>

            </div>

            {normalizedExperience.length > 0 ? (

              <div className="space-y-5">

                {normalizedExperience.map(
                  (
                    experience: any,
                    index: number
                  ) => {

                    const responsibilities =
                      getResponsibilities(
                        experience
                      );

                    return (
                      <div
                        key={index}
                        className="p-6 sm:p-7 rounded-[28px] bg-white border border-gray-100 shadow-sm relative overflow-hidden"
                      >

                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />

                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pl-2">

                          <div>

                            <div className="flex items-center gap-2 mb-1">

                              <UserRound className="w-4 h-4 text-indigo-600" />

                              <h4 className="text-lg font-bold text-gray-900">
                                {experience.role ||
                                  'Role not extracted'}
                              </h4>

                            </div>

                            {experience.company && (
                              <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>
                                  {experience.company}
                                </span>
                              </div>
                            )}

                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-mono">

                            <span className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDuration(
                                experience
                              )}
                            </span>

                            {experience.location && (
                              <span className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                                {experience.location}
                              </span>
                            )}

                          </div>

                        </div>

                        <div className="mt-5 pl-2">

                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-3">
                            Responsibilities & Contributions
                          </h5>

                          {responsibilities.length > 0 ? (
                            <ul className="space-y-2">
                              {responsibilities.map(
                                (
                                  responsibility,
                                  responsibilityIndex: number
                                ) => (
                                  <li
                                    key={
                                      responsibilityIndex
                                    }
                                    className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed"
                                  >
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span>
                                      {responsibility}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-400">
                              No responsibilities were extracted for this role.
                            </p>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            ) : (
              <div className="p-8 rounded-[28px] bg-white border border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  No professional experience was extracted from this resume.
                </p>
              </div>
            )}

          </div>

          <div className="space-y-4">

            <div className="flex items-center gap-2">

              <Code className="w-4 h-4 text-indigo-600" />

              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Projects
              </h3>

              <span className="text-[10px] font-mono text-gray-400">
                ({normalizedProjects.length})
              </span>

            </div>

            {normalizedProjects.length > 0 ? (

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {normalizedProjects.map(
                  (
                    project: any,
                    index: number
                  ) => {

                    const techStack =
                      getProjectTechStack(
                        project
                      );

                    const highlights =
                      getProjectHighlights(
                        project
                      );

                    return (
                      <div
                        key={index}
                        className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <div className="flex items-center gap-2">

                              <Layers className="w-4 h-4 text-indigo-600" />

                              <h4 className="text-lg font-bold text-gray-900">
                                {project.title ||
                                  project.name ||
                                  'Untitled Project'}
                              </h4>

                            </div>

                            {project.role && (
                              <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-mono font-semibold">
                                {project.role}
                              </span>
                            )}

                          </div>

                        </div>

                        <div className="mt-5">

                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
                            Project Overview
                          </h5>

                          <p className="text-sm text-gray-600 leading-relaxed">
                            {getProjectDescription(
                              project
                            )}
                          </p>

                        </div>

                        <div className="mt-5">

                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
                            Technologies Used
                          </h5>

                          {techStack.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {techStack.map(
                                technology => (
                                  <span
                                    key={
                                      technology
                                    }
                                    className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-700 text-[11px] font-medium"
                                  >
                                    {technology}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">
                              No technology details were extracted.
                            </p>
                          )}

                        </div>

                        {highlights.length > 0 && (
                          <div className="mt-5">

                            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
                              Key Contributions
                            </h5>

                            <ul className="space-y-2">

                              {highlights.map(
                                (
                                  highlight,
                                  highlightIndex: number
                                ) => (
                                  <li
                                    key={
                                      highlightIndex
                                    }
                                    className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed"
                                  >
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span>
                                      {highlight}
                                    </span>
                                  </li>
                                )
                              )}

                            </ul>

                          </div>
                        )}

                        {project.evidence_snippet && (
                          <div className="mt-5 pt-4 border-t border-gray-100">

                            <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100/80 p-4">

                              <span className="font-bold text-indigo-600 block text-[9px] uppercase tracking-wider mb-1">
                                Grounded Evidence
                              </span>

                              <p className="text-[11px] text-gray-600 font-mono italic leading-relaxed">
                                "{project.evidence_snippet}"
                              </p>

                            </div>

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            ) : (
              <div className="p-8 rounded-[28px] bg-white border border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  No projects were extracted from this resume.
                </p>
              </div>
            )}

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-gray-100 shadow-sm space-y-5">

              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

                <GraduationCap className="w-4 h-4 text-indigo-600" />

                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  Education
                </h3>

                <span className="ml-auto text-[10px] font-mono text-gray-400">
                  ({normalizedEducation.length})
                </span>

              </div>

              {normalizedEducation.length > 0 ? (

                <div className="space-y-4">

                  {normalizedEducation.map(
                    (
                      education: any,
                      index: number
                    ) => {

                      const year =
                        getEducationYear(
                          education
                        );

                      const score =
                        getEducationScore(
                          education
                        );

                      return (
                        <div
                          key={index}
                          className="p-5 rounded-2xl bg-gray-50 border border-gray-100"
                        >

                          <div className="flex items-start gap-3">

                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                              <GraduationCap className="w-5 h-5 text-indigo-600" />
                            </div>

                            <div className="min-w-0">

                              <h4 className="text-sm font-bold text-gray-900">
                                {education.degree ||
                                  education.program ||
                                  'Education'}
                              </h4>

                              {education.institution && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {education.institution}
                                </p>
                              )}

                            </div>

                          </div>

                          {(year ||
                            score) && (
                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-200/70 text-[11px] font-mono text-gray-500">

                              {year && (
                                <span className="px-2.5 py-1 rounded-full bg-white border border-gray-100 flex items-center gap-1.5">
                                  <CalendarDays className="w-3 h-3" />
                                  {year}
                                </span>
                              )}

                              {score && (
                                <span className="px-2.5 py-1 rounded-full bg-white border border-gray-100">
                                  {score}
                                </span>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No education details were extracted from this resume.
                </p>
              )}

            </div>

            <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-gray-100 shadow-sm space-y-5">

              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

                <Award className="w-4 h-4 text-orange-500" />

                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  Certifications
                </h3>

                <span className="ml-auto text-[10px] font-mono text-gray-400">
                  ({normalizedCertifications.length})
                </span>

              </div>

              {normalizedCertifications.length > 0 ? (

                <div className="space-y-3">

                  {normalizedCertifications.map(
                    (
                      certification: any,
                      index: number
                    ) => {

                      const name =
                        getCertificationName(
                          certification
                        );

                      const issuer =
                        getCertificationIssuer(
                          certification
                        );

                      const year =
                        getCertificationYear(
                          certification
                        );

                      return (
                        <div
                          key={index}
                          className="p-5 rounded-2xl bg-orange-50/40 border border-orange-100"
                        >

                          <div className="flex items-start gap-3">

                            <div className="w-10 h-10 rounded-xl bg-white border border-orange-100 flex items-center justify-center shrink-0">
                              <Award className="w-5 h-5 text-orange-500" />
                            </div>

                            <div>

                              <h4 className="text-sm font-bold text-gray-900">
                                {name}
                              </h4>

                              {issuer && (
                                <p className="text-xs text-orange-800/80 mt-1">
                                  {issuer}
                                </p>
                              )}

                              {year && (
                                <p className="text-[11px] text-orange-600 font-mono mt-2">
                                  Issued {year}
                                </p>
                              )}

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No certifications were extracted from this resume.
                </p>
              )}

            </div>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            <SummaryCount
              icon={
                <Wrench className="w-4 h-4" />
              }
              label="Skills"
              value={
                normalizedSkills.length
              }
            />

            <SummaryCount
              icon={
                <Code className="w-4 h-4" />
              }
              label="Projects"
              value={
                normalizedProjects.length
              }
            />

            <SummaryCount
              icon={
                <Briefcase className="w-4 h-4" />
              }
              label="Experience"
              value={
                normalizedExperience.length
              }
            />

            <SummaryCount
              icon={
                <GraduationCap className="w-4 h-4" />
              }
              label="Education"
              value={
                normalizedEducation.length
              }
            />

          </div>

        </div>
      )}

      {/* =====================================================
          UPLOAD MODAL
          ===================================================== */}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-6 animate-fade-in">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-serif italic text-gray-900">
                Upload New Resume
              </h3>

              <button
                type="button"
                onClick={
                  handleCloseUploadModal
                }
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close upload dialog"
              >
                ✕
              </button>

            </div>

            <div
              onDragOver={event => {
                event.preventDefault();

                if (
                  isUploading
                ) {
                  return;
                }

                setIsDragging(
                  true
                );
              }}

              onDragLeave={() =>
                setIsDragging(
                  false
                )
              }

              onDrop={
                handleDrop
              }

              onClick={() => {
                if (
                  !isUploading
                ) {
                  fileInputRef.current?.click();
                }
              }}

              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all ${
                isUploading
                  ? 'border-indigo-200 bg-indigo-50/20 cursor-not-allowed'
                  : isDragging
                  ? 'border-indigo-600 bg-indigo-50/40 cursor-pointer'
                  : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer'
              }`}
            >

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                disabled={
                  isUploading
                }
                onChange={event => {

                  const file =
                    event.target
                      .files?.[0];

                  /*
                   * Clear immediately so the same file can be
                   * selected again after cancellation/failure.
                   */
                  event.target.value =
                    '';

                  if (
                    file &&
                    !isUploading
                  ) {
                    handleFileUpload(
                      file
                    );
                  }

                }}
              />

              {isUploading ? (

                <div className="space-y-3">

                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />

                  <p className="text-xs font-mono font-semibold text-indigo-700">
                    Processing your resume...
                  </p>

                  <p className="text-[11px] text-gray-500">
                    Parsing, validating and
                    extracting your resume
                    profile.
                  </p>

                </div>

              ) : (

                <div className="space-y-2">

                  <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto" />

                  <div className="text-sm font-bold text-gray-900">
                    Choose PDF or DOCX file
                  </div>

                  <div className="text-xs text-gray-500">
                    Drag and drop or click
                    to browse files
                  </div>

                </div>

              )}

            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-xs">
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">

              {isUploading ? (
                <p className="text-[11px] text-gray-400">
                  Cancelling stops the
                  active browser request.
                </p>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={
                  handleCloseUploadModal
                }
                className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                  isUploading
                    ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {isUploading
                  ? 'Cancel Upload'
                  : 'Cancel'}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          DELETE MODAL
          ===================================================== */}

      {resumeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-6 animate-fade-in">

            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>

              <h3 className="text-xl font-serif italic text-gray-900">
                Delete this resume?
              </h3>

              <p className="text-xs text-gray-600 mt-2 leading-relaxed">

                Are you sure you want to delete{' '}

                <strong className="text-gray-900">
                  {resumeToDelete.filename}
                </strong>

                ? Deleting this resume will
                remove its stored profile and
                evidence.

              </p>

            </div>

            <div className="flex items-center justify-end gap-3 pt-2">

              <button
                type="button"
                onClick={() =>
                  setResumeToDelete(
                    null
                  )
                }
                className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmDelete
                }
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-100 transition-all"
              >
                Delete Resume
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

/* ============================================================
   SUMMARY CARD
   ============================================================ */

interface SummaryCountProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

const SummaryCount: React.FC<
  SummaryCountProps
> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="p-4 rounded-[22px] bg-white border border-gray-100 shadow-sm">

      <div className="flex items-center gap-2 text-indigo-600">

        {icon}

        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-400">
          {label}
        </span>

      </div>

      <div className="text-2xl font-serif font-bold text-gray-900 mt-2">
        {value}
      </div>

    </div>
  );
};