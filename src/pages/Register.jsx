import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  // Form States
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Interactive States
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Focus tracking for icons
  const [focusedField, setFocusedField] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!termsAccepted) return

    setError('')
    setIsSubmitting(true)
    const { error: signUpError } = await signUp(email, password, fullName)
    setIsSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }
    navigate('/login')
  }

  return (
    <div className="bg-surface-container-low text-on-background min-h-screen flex flex-col selection:bg-primary-fixed">
      {/* TopAppBar - Registration Specific Layout */}
      <header className="fixed top-0 w-full z-50 bg-surface dark:bg-surface-dim flex justify-center items-center px-margin-mobile py-4 border-b border-outline-variant/30">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              alt="Logo" 
              className="w-10 h-10 object-contain" 
              src="data:image/png;base64,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"
            />
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary">Municipal Guardian</span>
          </div>
          {/* Empty div for symmetry */}
          <div />
        </div>
      </header>

      {/* Main Registration Canvas */}
      <main className="flex-grow flex items-center justify-center px-margin-mobile pt-24 pb-12">
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-8 md:p-12 transition-all hover:shadow-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-display text-on-surface mb-2">Crear Cuenta</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Únete al sistema de protección para la niñez y adolescencia.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block font-label-md text-label-md text-on-surface" htmlFor="fullName">Nombre Completo</label>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors ${
                  focusedField === 'fullName' ? 'text-primary' : ''
                }`}>
                  person
                </span>
                <input 
                  className="w-full h-12 pl-10 pr-4 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md" 
                  id="fullName" 
                  name="fullName" 
                  placeholder="Ej: Juan Pérez" 
                  required 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block font-label-md text-label-md text-on-surface" htmlFor="email">Correo Electrónico</label>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors ${
                  focusedField === 'email' ? 'text-primary' : ''
                }`}>
                  mail
                </span>
                <input 
                  className="w-full h-12 pl-10 pr-4 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md" 
                  id="email" 
                  name="email" 
                  placeholder="juan.perez@municipio.gob" 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>


            {/* Password */}
            <div className="space-y-2">
              <label className="block font-label-md text-label-md text-on-surface" htmlFor="password">Contraseña</label>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors ${
                  focusedField === 'password' ? 'text-primary' : ''
                }`}>
                  lock
                </span>
                <input 
                  className="w-full h-12 pl-10 pr-12 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors bg-transparent border-none cursor-pointer flex items-center" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input 
                  className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer" 
                  id="terms" 
                  required 
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
              </div>
              <label className="font-label-sm text-label-sm text-on-surface-variant leading-tight cursor-pointer" htmlFor="terms">
                Acepto los <a className="text-primary font-semibold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Términos y Condiciones</a> y la <a class="text-primary font-semibold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Política de Privacidad</a> del sistema.
              </label>
            </div>

            {error && (
              <p className="text-error text-sm text-center">{error}</p>
            )}
            {/* Submit Button */}
            <button
              className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50" 
              type="submit"
              disabled={isSubmitting || !termsAccepted}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>Registrarse</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              ¿Ya tienes cuenta?{' '}
              <a 
                className="text-primary font-bold hover:underline cursor-pointer" 
                onClick={() => navigate('/login')}
              >
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface dark:bg-surface-dim border-t border-outline-variant dark:border-outline flex flex-col md:flex-row justify-between items-center px-margin-mobile py-8 gap-4 mt-auto">
        <div className="font-label-md text-label-md font-semibold text-on-surface">Municipal Guardian System</div>
        <div className="flex gap-6">
          <a className="font-label-sm text-label-sm text-on-surface-variant dark:text-surface-variant hover:text-secondary-container transition-colors" href="#">Privacy Policy</a>
          <a className="font-label-sm text-label-sm text-on-surface-variant dark:text-surface-variant hover:text-secondary-container transition-colors" href="#">Terms of Service</a>
          <a className="font-label-sm text-label-sm text-on-surface-variant dark:text-surface-variant hover:text-secondary-container transition-colors" href="#">Help Center</a>
        </div>
        <div className="font-label-sm text-label-sm text-secondary dark:text-secondary-fixed-dim">
          © 2024 Municipal Guardian System. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
