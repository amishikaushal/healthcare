export const SCORING_CONFIG = {

  WEIGHTS: {
    MEDICATION: 20,
    EXERCISE: 20,
    RECOVERY_LOG: 20,
    PAIN: 20,
    SLEEP: 10,
    APPOINTMENT: 10,
  },
  

  THRESHOLDS: {
    EXCELLENT: 90,
    ON_TRACK: 75,
    NEEDS_ATTENTION: 60,

  },

  getStatus(score: number): 'Excellent' | 'On Track' | 'Needs Attention' | 'Critical' {
    if (score >= this.THRESHOLDS.EXCELLENT) return 'Excellent';
    if (score >= this.THRESHOLDS.ON_TRACK) return 'On Track';
    if (score >= this.THRESHOLDS.NEEDS_ATTENTION) return 'Needs Attention';
    return 'Critical';
  }
};
