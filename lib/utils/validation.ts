export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }
  }
  return { valid: true }
}

export function validateProjectTitle(title: string): { valid: boolean; message?: string } {
  if (title.trim().length < 5) {
    return { valid: false, message: "عنوان المشروع يجب أن يكون 5 أحرف على الأقل" }
  }
  if (title.length > 100) {
    return { valid: false, message: "عنوان المشروع يجب أن لا يتجاوز 100 حرف" }
  }
  return { valid: true }
}

export function validateDescription(description: string): { valid: boolean; message?: string } {
  if (description.trim().length < 20) {
    return { valid: false, message: "الوصف يجب أن يكون 20 حرف على الأقل" }
  }
  if (description.length > 1000) {
    return { valid: false, message: "الوصف يجب أن لا يتجاوز 1000 حرف" }
  }
  return { valid: true }
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[0-9]{10}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ""))
}

export function validateStudentId(studentId: string): boolean {
  return studentId.trim().length > 0
}
