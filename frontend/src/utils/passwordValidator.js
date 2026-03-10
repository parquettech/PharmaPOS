// Password validation utility
export const validatePassword = (password) => {
  const errors = []
  
  if (!password) {
    return { isValid: false, errors: ['Password is required'] }
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  }
}

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' }
  
  let strength = 0
  
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
  
  if (strength <= 2) {
    return { strength, label: 'Weak', color: 'text-red-500' }
  } else if (strength <= 4) {
    return { strength, label: 'Medium', color: 'text-yellow-500' }
  } else {
    return { strength, label: 'Strong', color: 'text-green-500' }
  }
}
