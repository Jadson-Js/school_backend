export interface LessonPlanRequest {
  topic: string
  grade_level: string
  subject: string
  learning_context?: string
  duration_minutes?: string
}

export interface LessonPlanResponse {
  ludic_introduction: string
  bncc_goal: string
  step_by_step: string
  rubric_evaluation: string
}