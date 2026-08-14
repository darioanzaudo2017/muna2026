import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => navigate('/login'), 2500)
      return () => clearTimeout(timeout)
    }
  }, [success, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setIsSubmitting(true)
    const { error: updateError } = await updatePassword(password)
    setIsSubmitting(false)
    if (updateError) {
      setError('No pudimos actualizar la contraseña. El enlace puede haber expirado.')
      return
    }
    setSuccess(true)
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col selection:bg-primary-fixed">
      <main className="flex-grow flex items-center justify-center px-margin-mobile py-xl">
        <div className="w-full max-w-[420px]">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-outline-variant/30">
            <div className="p-8 md:p-10">
              <div className="flex flex-col items-center mb-8">
                <span className="material-symbols-outlined text-[48px] text-primary mb-4">lock_reset</span>
                <h1 className="font-headline-lg text-headline-lg text-primary text-center">Nueva contraseña</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2 text-center">
                  Definí tu nueva contraseña de acceso.
                </p>
              </div>

              {success ? (
                <p className="font-body-md text-body-md text-on-surface text-center">
                  Contraseña actualizada correctamente. Te estamos redirigiendo a Iniciar Sesión...
                </p>
              ) : loading ? null : !user ? (
                <div className="text-center space-y-6">
                  <p className="font-body-md text-body-md text-on-surface">
                    Este enlace no es válido o ya expiró. Solicitá uno nuevo.
                  </p>
                  <a
                    className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors cursor-pointer"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Recuperar contraseña
                  </a>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="password">Nueva contraseña</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                        lock
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-12 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md"
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="confirmPassword">Confirmar contraseña</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                        lock
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-4 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md"
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-error text-sm text-center -mt-2">{error}</p>
                  )}

                  <button
                    className="w-full h-[48px] bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md rounded-lg shadow-sm active:opacity-80 transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Guardando...
                      </>
                    ) : (
                      'Guardar nueva contraseña'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
