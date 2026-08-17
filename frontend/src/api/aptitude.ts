import { apiFetch } from './client';
import { AptitudeQuestion } from '../types';

export const aptitudeApi = {
  // ==========================================================
  // GET APTITUDE TOPICS
  // ==========================================================

  async getTopics(
    category: string
  ): Promise<string[]> {
    const query = new URLSearchParams();

    query.append(
      'category',
      category
    );

    return await apiFetch<string[]>(
      `/aptitude/topics?${query.toString()}`
    );
  },

  // ==========================================================
  // GET APTITUDE QUESTIONS
  // ==========================================================

  async getAptitudeQuestions(
    category?: string,
    topic?: string,
    difficulty?: string,
    limit = 10
  ): Promise<AptitudeQuestion[]> {
    const params =
      new URLSearchParams();

    if (category) {
      params.append(
        'category',
        category
      );
    }

    if (topic) {
      params.append(
        'topic',
        topic
      );
    }

    if (difficulty) {
      params.append(
        'difficulty',
        difficulty
      );
    }

    params.append(
      'limit',
      String(limit)
    );

    const response =
      await apiFetch<any[]>(
        `/aptitude?${params.toString()}`
      );

    return response.map(
      item => {
        const options =
          Array.isArray(item.options)
            ? item.options
            : [];

        const rawCorrect =
          item.correct_answer;

        let correctIndex:
          | number
          | undefined;

        // Backend may return a numeric index.
        if (
          typeof rawCorrect ===
          'number'
        ) {
          if (
            Number.isInteger(
              rawCorrect
            ) &&
            rawCorrect >= 0 &&
            rawCorrect <
              options.length
          ) {
            correctIndex =
              rawCorrect;
          }
        }

        // Backend normally returns the correct
        // option text for seeded aptitude questions.
        else if (
          typeof rawCorrect ===
          'string'
        ) {
          const normalizedCorrect =
            rawCorrect
              .trim()
              .toLowerCase();

          const parsed =
            Number(
              rawCorrect
            );

          if (
            Number.isInteger(
              parsed
            ) &&
            parsed >= 0 &&
            parsed <
              options.length
          ) {
            correctIndex =
              parsed;
          } else {
            const index =
              options.findIndex(
                option =>
                  String(option)
                    .trim()
                    .toLowerCase() ===
                  normalizedCorrect
              );

            if (index >= 0) {
              correctIndex =
                index;
            }
          }
        }

        return {
          question_id:
            String(
              item.question_id
            ),

          category:
            String(
              item.category ||
                ''
            ),

          topic:
            String(
              item.topic ||
                'general'
            ),

          difficulty:
            String(
              item.difficulty ||
                'medium'
            ).toLowerCase(),

          question:
            String(
              item.question ||
                ''
            ),

          options:
            options.map(
              option =>
                String(option)
            ),

          correct_answer:
            correctIndex,

          explanation:
            String(
              item.explanation ||
                ''
            ),
        };
      }
    );
  },
};