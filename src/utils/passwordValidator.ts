/**
 * Password validation utility
 */

export interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  feedback: string[];
}

const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBER: /[0-9]/,
  SPECIAL: /[!@#$%^&*()_+\-=[\]{};':"\\|,.></?]/,
};

export const passwordValidator = {
  /**
   * Validate password strength
   */
  validateStrength(password: string): PasswordStrength {
    let feedback: string[] = [];
    let score = 0;

    if (!password) {
      return {
        score: 0,
        label: 'No password',
        color: 'bg-gray-300',
        feedback: ['Enter a password'],
      };
    }

    // Length check
    if (password.length >= PASSWORD_RULES.MIN_LENGTH) {
      score++;
    } else {
      feedback.push(`At least ${PASSWORD_RULES.MIN_LENGTH} characters required`);
    }

    // Uppercase check
    if (PASSWORD_RULES.UPPERCASE.test(password)) {
      score++;
    } else {
      feedback.push('At least one uppercase letter required');
    }

    // Lowercase check
    if (PASSWORD_RULES.LOWERCASE.test(password)) {
      score++;
    } else {
      feedback.push('At least one lowercase letter required');
    }

    // Number check
    if (PASSWORD_RULES.NUMBER.test(password)) {
      score++;
    } else {
      feedback.push('At least one number required');
    }

    // Special character check
    if (PASSWORD_RULES.SPECIAL.test(password)) {
      score++;
    } else {
      feedback.push('At least one special character required');
    }

    // Determine label and color
    let label = '';
    let color = '';

    switch (score) {
      case 0:
      case 1:
        label = 'Very Weak';
        color = 'bg-red-500';
        break;
      case 2:
        label = 'Weak';
        color = 'bg-orange-500';
        break;
      case 3:
        label = 'Fair';
        color = 'bg-yellow-500';
        break;
      case 4:
        label = 'Good';
        color = 'bg-lime-500';
        break;
      case 5:
        label = 'Strong';
        color = 'bg-green-500';
        feedback = [];
        break;
    }

    return { score, label, color, feedback };
  },

  /**
   * Check if password is valid (meets all requirements)
   */
  isValid(password: string): boolean {
    return (
      password.length >= PASSWORD_RULES.MIN_LENGTH &&
      PASSWORD_RULES.UPPERCASE.test(password) &&
      PASSWORD_RULES.LOWERCASE.test(password) &&
      PASSWORD_RULES.NUMBER.test(password) &&
      PASSWORD_RULES.SPECIAL.test(password)
    );
  },

  /**
   * Check if passwords match
   */
  passwordsMatch(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  },
};
